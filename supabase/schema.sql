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
