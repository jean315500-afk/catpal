-- ================================================================ 2026-10-24 Pal invites ("친구와 함께 시작해볼까요?")
-- A personal link to invite a friend to be cat pals. Run once in the Supabase SQL Editor after schema.sql (safe to
-- re-run). Additive only: no existing table, column, policy or row is changed or removed.
--
--   my_pal_invite     (signed in — an anonymous session is enough)  my personal link's token, made once
--   read_pal_invite   (anyone with the link, no sign-in)  who invited: their nickname (their cat's name) and country, and
--                     their latest moment's photo if they shared one — nothing while they haven't made a profile yet
--   accept_pal_invite (the friend, signed in)  records the two as cat pals, once (either way round counts as one)
--   link_my_pals      (either of them)  makes their thread (no letters yet) as soon as both have a profile; so they
--                     appear in each other's CatPals. Called on accepting, and again when a profile is made
--
-- Sharing or copying a link connects nobody: only accepting does. The inviter needs nothing from the friend to go on.

create table if not exists public.pal_invites (
  id          uuid primary key default gen_random_uuid(),
  -- 64 hex characters from two random v4 UUIDs (gen_random_uuid uses a cryptographic RNG)
  token       text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  inviter_id  uuid not null unique references auth.users (id) on delete cascade,   -- one personal link each
  created_at  timestamptz not null default now()
);

create table if not exists public.pal_links (
  inviter_id  uuid not null references auth.users (id) on delete cascade,
  accepter_id uuid not null references auth.users (id) on delete cascade,
  accepted_at timestamptz not null default now(),
  thread_id   uuid references public.threads (id) on delete set null,          -- once both have a profile
  primary key (inviter_id, accepter_id),
  check (inviter_id <> accepter_id)
);
create index if not exists pal_links_accepter_idx on public.pal_links (accepter_id);

alter table public.pal_invites enable row level security;
alter table public.pal_links enable row level security;
drop policy if exists "own pal invite" on public.pal_invites;
create policy "own pal invite" on public.pal_invites for select to authenticated using (inviter_id = auth.uid());
drop policy if exists "own pal links" on public.pal_links;
create policy "own pal links" on public.pal_links for select to authenticated using (auth.uid() in (inviter_id, accepter_id));
-- no insert / update / delete policies: only through the functions below

create or replace function public.my_pal_invite()
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into pal_invites (inviter_id) values (auth.uid()) on conflict (inviter_id) do nothing;
  select token into t from pal_invites where inviter_id = auth.uid();
  return t;
end $$;

-- status: 'ok' | 'mine' | 'missing'. ready: the inviter has a profile (so their cat's name and country show).
create or replace function public.read_pal_invite(p_token text)
returns table (status text, inviter_id uuid, ready boolean, nickname text, country text, photo_path text, linked boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare i record; p record; m record; me uuid := auth.uid();
begin
  select * into i from pal_invites x where x.token = p_token;
  if i.id is null or length(coalesce(p_token, '')) <> 64 then
    return query select 'missing'::text, null::uuid, false, null::text, null::text, null::text, false; return; end if;
  select nickname, country into p from profiles where profiles.id = i.inviter_id;
  select photo_path into m from moments where moments.user_id = i.inviter_id order by moments.created_at desc limit 1;
  return query select case when me = i.inviter_id then 'mine' else 'ok' end, i.inviter_id, p.nickname is not null, p.nickname, p.country, m.photo_path,
    (me is not null and exists (select 1 from pal_links l where (l.inviter_id = i.inviter_id and l.accepter_id = me) or (l.inviter_id = me and l.accepter_id = i.inviter_id)));
end $$;

-- the thread for each of my links where both have a profile now (or the one we already share, if any); the count made
create or replace function public.link_my_pals()
returns int language plpgsql security definer set search_path = public as $$
declare l record; t uuid; n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  for l in select * from pal_links where auth.uid() in (inviter_id, accepter_id) and thread_id is null
             and exists (select 1 from profiles where id = inviter_id) and exists (select 1 from profiles where id = accepter_id) for update loop
    select id into t from threads where (starter_id = l.inviter_id and owner_id = l.accepter_id) or (starter_id = l.accepter_id and owner_id = l.inviter_id)
      order by created_at limit 1;
    if t is null then insert into threads (moment_id, starter_id, owner_id) values (null, l.inviter_id, l.accepter_id) returning id into t; n := n + 1; end if;
    update pal_links set thread_id = t where inviter_id = l.inviter_id and accepter_id = l.accepter_id;
  end loop;
  return n;
end $$;

-- accept: once (a second time, or the other way round, changes nothing); then their thread if both have a profile
create or replace function public.accept_pal_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i record; t uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into i from pal_invites where token = p_token;
  if i.id is null then raise exception 'invite not found'; end if;
  if i.inviter_id = auth.uid() then raise exception 'this is your own invite'; end if;
  if not exists (select 1 from pal_links where (inviter_id = i.inviter_id and accepter_id = auth.uid()) or (inviter_id = auth.uid() and accepter_id = i.inviter_id)) then
    insert into pal_links (inviter_id, accepter_id) values (i.inviter_id, auth.uid()) on conflict do nothing;
  end if;
  perform link_my_pals();
  select thread_id into t from pal_links where (inviter_id = i.inviter_id and accepter_id = auth.uid()) or (inviter_id = auth.uid() and accepter_id = i.inviter_id);
  return t;
end $$;

revoke execute on function public.my_pal_invite() from public, anon;
grant execute on function public.my_pal_invite() to authenticated;
revoke execute on function public.read_pal_invite(text) from public;
grant execute on function public.read_pal_invite(text) to anon, authenticated;
revoke execute on function public.link_my_pals() from public, anon;
grant execute on function public.link_my_pals() to authenticated;
revoke execute on function public.accept_pal_invite(text) from public, anon;
grant execute on function public.accept_pal_invite(text) to authenticated;
