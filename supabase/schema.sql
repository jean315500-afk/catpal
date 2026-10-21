-- CatPal core schema (Supabase / Postgres).
-- Run once in the Supabase SQL Editor. Safe to re-run: objects use IF NOT EXISTS / OR REPLACE.
--
-- Model: anonymous users (Supabase anonymous sign-in) pick a nickname + country,
-- share cat moments, like them, and exchange private Cat Letters.
-- Row Level Security keeps letters visible only to the two people in the thread.

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 24),
  country     text not null check (country ~ '^[A-Z]{2}$'),          -- ISO 3166-1 alpha-2
  created_at  timestamptz not null default now()
);

create table if not exists public.moments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  category    text not null check (category in ('my_cat', 'met_cat')),
  photo_path  text not null,                                          -- object path in bucket "moments"
  caption     text not null check (char_length(caption) between 1 and 200),
  cat_name    text check (cat_name is null or char_length(cat_name) between 1 and 30),
  country     text not null check (country ~ '^[A-Z]{2}$'),
  created_at  timestamptz not null default now()
);
create index if not exists moments_created_at_idx on public.moments (created_at desc);
create index if not exists moments_user_idx on public.moments (user_id);

create table if not exists public.likes (
  moment_id   uuid not null references public.moments (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (moment_id, user_id)
);
create index if not exists likes_created_at_idx on public.likes (created_at);

-- A conversation between the person who wrote first (starter) and the moment owner.
create table if not exists public.threads (
  id          uuid primary key default gen_random_uuid(),
  moment_id   uuid references public.moments (id) on delete set null,
  starter_id  uuid not null references public.profiles (id) on delete cascade,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (starter_id <> owner_id),
  unique (moment_id, starter_id)
);

create table if not exists public.letters (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.threads (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  body        text check (body is null or char_length(body) between 1 and 500),
  photo_path  text,                                                   -- optional, bucket "letters"
  stamp       smallint not null default 0 check (stamp between 0 and 7),
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);
create index if not exists letters_thread_idx on public.letters (thread_id, created_at);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_thread_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from threads where id = t and auth.uid() in (starter_id, owner_id));
$$;

-- Recipient marks a thread's incoming letters as read (only read_at changes).
create or replace function public.mark_thread_read(t uuid)
returns void language sql security definer set search_path = public as $$
  update letters set read_at = now()
  where thread_id = t and sender_id <> auth.uid() and read_at is null and public.is_thread_member(t);
$$;

-- Feed rows with author, real like count and "liked by me".
create or replace view public.moment_cards with (security_invoker = true) as
  select m.*, p.nickname, p.country as author_country,
         (select count(*) from likes l where l.moment_id = m.id)::int as like_count,
         exists (select 1 from likes l where l.moment_id = m.id and l.user_id = auth.uid()) as liked_by_me
  from moments m join profiles p on p.id = m.user_id;

-- Discovery feed: at most one random moment per author, then shuffled, so many
-- different people and countries show up regardless of popularity.
create or replace function public.discover_feed(p_limit int default 30)
returns setof public.moment_cards language sql volatile security invoker set search_path = public as $$
  select * from (
    select distinct on (c.user_id) c.* from moment_cards c
    where c.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    order by c.user_id, random()
  ) one_per_author
  order by random()
  limit greatest(1, least(p_limit, 100));
$$;

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.moments  enable row level security;
alter table public.likes    enable row level security;
alter table public.threads  enable row level security;
alter table public.letters  enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "moments readable" on public.moments;
create policy "moments readable" on public.moments for select to authenticated using (true);
drop policy if exists "own moment insert" on public.moments;
create policy "own moment insert" on public.moments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own moment delete" on public.moments;
create policy "own moment delete" on public.moments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes for select to authenticated using (true);
drop policy if exists "own like insert" on public.likes;
create policy "own like insert" on public.likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own like delete" on public.likes;
create policy "own like delete" on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "thread members read" on public.threads;
create policy "thread members read" on public.threads for select to authenticated using (auth.uid() in (starter_id, owner_id));
drop policy if exists "start thread on someone else's moment" on public.threads;
create policy "start thread on someone else's moment" on public.threads for insert to authenticated
  with check (starter_id = auth.uid() and owner_id <> auth.uid()
              and (moment_id is null or exists (select 1 from moments m where m.id = moment_id and m.user_id = owner_id)));

drop policy if exists "thread members read letters" on public.letters;
create policy "thread members read letters" on public.letters for select to authenticated using (public.is_thread_member(thread_id));
drop policy if exists "thread members send letters" on public.letters;
create policy "thread members send letters" on public.letters for insert to authenticated
  with check (sender_id = auth.uid() and public.is_thread_member(thread_id) and read_at is null);

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public) values ('moments', 'moments', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('letters', 'letters', false) on conflict (id) do nothing;

-- moments/<user id>/<file>: anyone can view (public bucket); only the owner uploads/deletes.
-- Storage only removes objects the caller can also SELECT, so the owner needs a read policy too.
drop policy if exists "owner reads own moment photo" on storage.objects;
create policy "owner reads own moment photo" on storage.objects for select to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "upload own moment photo" on storage.objects;
create policy "upload own moment photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own moment photo" on storage.objects;
create policy "delete own moment photo" on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

-- letters/<thread id>/<file>: only the two people in that thread can upload or view.
drop policy if exists "thread members upload letter photo" on storage.objects;
create policy "thread members upload letter photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'letters' and public.is_thread_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "thread members view letter photo" on storage.objects;
create policy "thread members view letter photo" on storage.objects for select to authenticated
  using (bucket_id = 'letters' and public.is_thread_member(((storage.foldername(name))[1])::uuid));

-- ================================================================ 2026-10-11 Explore / public letters
-- ---------------------------------------------------------------- tables

alter table public.profiles add column if not exists show_as_recipient boolean not null default false;

create table if not exists public.letter_posts (
  id            uuid primary key default gen_random_uuid(),
  letter_id     uuid not null unique references public.letters (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid references public.profiles (id) on delete set null,
  photo_path    text not null,                                     -- object path in bucket "posts"
  message       text check (message is null or char_length(message) between 1 and 500),
  created_at    timestamptz not null default now()
);
create index if not exists letter_posts_created_idx on public.letter_posts (created_at desc);
create index if not exists letter_posts_author_idx on public.letter_posts (author_id);

create table if not exists public.post_likes (
  post_id     uuid not null references public.letter_posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_created_idx on public.post_likes (created_at);

-- ---------------------------------------------------------------- row level security

alter table public.letter_posts enable row level security;
alter table public.post_likes   enable row level security;

-- Only the author sees their own rows directly (Profile › My public letters); everyone else uses explore_feed().
drop policy if exists "author reads own posts" on public.letter_posts;
create policy "author reads own posts" on public.letter_posts for select to authenticated using (author_id = auth.uid());
drop policy if exists "author unpublishes own posts" on public.letter_posts;
create policy "author unpublishes own posts" on public.letter_posts for delete to authenticated using (author_id = auth.uid());
-- No insert policy: posts are created only through publish_letter(), which checks the letter.

drop policy if exists "own post like read" on public.post_likes;
create policy "own post like read" on public.post_likes for select to authenticated using (user_id = auth.uid());
drop policy if exists "own post like insert" on public.post_likes;
create policy "own post like insert" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own post like delete" on public.post_likes;
create policy "own post like delete" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- functions

-- Publish one of MY letters. The message is copied from the letter itself; the recipient is
-- derived from the thread (callers can't choose either); the photo must be my own upload in "posts".
create or replace function public.publish_letter(p_letter uuid, p_photo_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare l record; t record; pid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into l from letters where id = p_letter;
  if l is null or l.sender_id <> auth.uid() then raise exception 'not your letter'; end if;
  if l.photo_path is null then raise exception 'only letters with a photo can be shared'; end if;
  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> auth.uid()::text then raise exception 'photo must be your own upload'; end if;
  select * into t from threads where id = l.thread_id;
  insert into letter_posts (letter_id, author_id, recipient_id, photo_path, message)
  values (l.id, auth.uid(), case when t.starter_id = auth.uid() then t.owner_id else t.starter_id end, p_photo_path, l.body)
  on conflict (letter_id) do nothing
  returning id into pid;
  return pid;
end $$;

-- Explore: public letters + cat moments in one feed.
--   p_sort: 'recent' (newest), 'top' (most likes ever, ties → newest),
--           'popular' (likes in the last 7 days, ties → newest),
--           'ranking' (same order, only items with ≥1 like this week; take the top 10).
--   p_mine: only my own items (Profile).
-- Returns only public columns. The recipient is named only with their consent.
create or replace function public.explore_feed(p_sort text default 'recent', p_limit int default 50, p_mine boolean default false)
returns table (
  kind text, id uuid, bucket text, photo_path text, message text, cat_name text, created_at timestamptz,
  author_id uuid, author_nickname text, author_country text,
  recipient_nickname text, recipient_country text,
  like_count int, week_likes int, liked_by_me boolean
) language sql stable security definer set search_path = public as $$
  with items as (
    select 'moment'::text as kind, m.id, 'moments'::text as bucket, m.photo_path, m.caption as message, m.cat_name, m.created_at,
           m.user_id as author_id, pa.nickname as author_nickname, pa.country as author_country,
           null::text as recipient_nickname, null::text as recipient_country,
           (select count(*) from likes x where x.moment_id = m.id)::int as like_count,
           (select count(*) from likes x where x.moment_id = m.id and x.created_at > now() - interval '7 days')::int as week_likes,
           exists (select 1 from likes x where x.moment_id = m.id and x.user_id = auth.uid()) as liked_by_me
    from moments m join profiles pa on pa.id = m.user_id
    union all
    select 'letter', p.id, 'posts', p.photo_path, p.message, null, p.created_at,
           p.author_id, pa.nickname, pa.country,
           case when pr.show_as_recipient then pr.nickname end,
           case when pr.show_as_recipient then pr.country end,
           (select count(*) from post_likes x where x.post_id = p.id)::int,
           (select count(*) from post_likes x where x.post_id = p.id and x.created_at > now() - interval '7 days')::int,
           exists (select 1 from post_likes x where x.post_id = p.id and x.user_id = auth.uid())
    from letter_posts p join profiles pa on pa.id = p.author_id left join profiles pr on pr.id = p.recipient_id
  )
  select * from items i
  where auth.uid() is not null
    and (not p_mine or i.author_id = auth.uid())
    and (p_sort <> 'ranking' or i.week_likes > 0)
  order by case when p_sort = 'top' then i.like_count when p_sort in ('popular', 'ranking') then i.week_likes end desc nulls last, i.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), case when p_sort = 'ranking' then 10 else 100 end);
$$;

revoke execute on function public.publish_letter(uuid, text) from public, anon;
grant execute on function public.publish_letter(uuid, text) to authenticated;
revoke execute on function public.explore_feed(text, int, boolean) from public, anon;
grant execute on function public.explore_feed(text, int, boolean) to authenticated;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;

-- posts/<user id>/<file>: public to view (the bucket is public); only the owner uploads, reads (needed to delete) and deletes.
drop policy if exists "upload own post photo" on storage.objects;
create policy "upload own post photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner reads own post photo" on storage.objects;
create policy "owner reads own post photo" on storage.objects for select to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own post photo" on storage.objects;
create policy "delete own post photo" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
