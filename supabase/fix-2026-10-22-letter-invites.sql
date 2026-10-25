-- ================================================================ 2026-10-22 Letter invites ("Invite a friend")
-- A letter can go to someone you know through a link, before they have Cat Pal. Run once in the Supabase SQL Editor
-- after schema.sql (safe to re-run). Additive only: no existing table, column, policy or row is changed or removed.
--
--   create_invite  (signed in, with a profile)  the letter is kept as an invite with a random token; no thread, no letter
--                                               yet, so nothing counts as delivered and no stamp or postmark is given
--   read_invite    (anyone with the token, no sign-in)  the letter to read: sender's nickname + country, words, photo;
--                                               the first look by someone else sets opened_at ("opened", not "delivered")
--   claim_invite   (the friend, once signed in, when they write back)  makes the real thread (sender → friend) with the
--                                               original letter in it, once; repeats return the same thread
--   revoke_invite  (the sender)                 the link stops working
--
-- Photos: bucket "invites" (public, like "moments"/"posts"), path <sender id>/<random uuid>.jpg. The path is random
-- and only handed out by read_invite (so only to holders of the token); the bucket can't be listed. When a link is
-- revoked the app also deletes its photo. A claimed invite's letter keeps that photo as photo_path 'invites:<path>'.

-- ---------------------------------------------------------------- table

create table if not exists public.letter_invites (
  id          uuid primary key default gen_random_uuid(),
  -- 64 hex characters from two random v4 UUIDs (gen_random_uuid uses a cryptographic RNG): ~244 random bits
  token       text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid not null,                                       -- the app's id for the draft: one invite per draft
  body        text check (body is null or char_length(body) between 1 and 500),
  photo_path  text,                                                -- object path in bucket "invites"
  stamp       smallint not null default 0 check (stamp between 0 and 7),
  sign        text check (sign is null or char_length(sign) between 1 and 24),
  cat_kind    text not null default 'my_cat' check (cat_kind in ('my_cat', 'met_cat')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  opened_at   timestamptz,                                         -- first read by someone other than the sender
  revoked_at  timestamptz,
  claimed_by  uuid references public.profiles (id) on delete set null,
  claimed_at  timestamptz,
  thread_id   uuid references public.threads (id) on delete set null,
  unique (sender_id, client_id),
  check (body is not null or photo_path is not null)
);
create index if not exists letter_invites_sender_idx on public.letter_invites (sender_id, created_at desc);

alter table public.letter_invites enable row level security;
-- the sender sees their own invites (the Sent tab: link shared / opened); everything else goes through the functions
drop policy if exists "sender reads own invites" on public.letter_invites;
create policy "sender reads own invites" on public.letter_invites for select to authenticated using (sender_id = auth.uid());

-- ---------------------------------------------------------------- functions

create or replace function public.create_invite(p_client_id uuid, p_body text, p_photo_path text, p_stamp smallint, p_sign text, p_kind text)
returns table (id uuid, token text, expires_at timestamptz, photo_path text) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r record;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where profiles.id = auth.uid()) then raise exception 'no profile'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text then raise exception 'photo must be your own upload'; end if;
  -- the same draft again (a second tap, a retry): the same invite
  select i.id, i.token, i.expires_at, i.photo_path into r from letter_invites i where i.sender_id = auth.uid() and i.client_id = p_client_id;
  if r.id is not null then return query select r.id, r.token, r.expires_at, r.photo_path; return; end if;
  if (select count(*) from letter_invites i where i.sender_id = auth.uid() and i.claimed_at is null and i.revoked_at is null and i.expires_at > now()) >= 20 then
    raise exception 'too many open invites';
  end if;
  return query
    insert into letter_invites as i (sender_id, client_id, body, photo_path, stamp, sign, cat_kind)
    values (auth.uid(), p_client_id, nullif(left(trim(p_body), 500), ''), p_photo_path, coalesce(p_stamp, 0), nullif(left(trim(p_sign), 24), ''), coalesce(p_kind, 'my_cat'))
    on conflict (sender_id, client_id) do update set client_id = excluded.client_id
    returning i.id, i.token, i.expires_at, i.photo_path;
end $$;

-- status: 'ok' | 'claimed' (by someone else) | 'revoked' | 'expired' | 'missing'. Content only when it can be read.
create or replace function public.read_invite(p_token text)
returns table (status text, sender_nickname text, sender_country text, body text, photo_path text, stamp smallint, sign text, cat_kind text,
               created_at timestamptz, mine boolean, claimed_by_me boolean, thread_id uuid)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare i record; p record; me uuid := auth.uid();
begin
  select * into i from letter_invites x where x.token = p_token;
  if i.id is null or length(coalesce(p_token, '')) <> 64 then return query select 'missing'::text, null::text, null::text, null::text, null::text, null::smallint, null::text, null::text, null::timestamptz, false, false, null::uuid; return; end if;
  if i.claimed_at is not null and (me is null or me <> i.claimed_by) and (me is null or me <> i.sender_id) then
    return query select 'claimed'::text, null::text, null::text, null::text, null::text, null::smallint, null::text, null::text, null::timestamptz, false, false, null::uuid; return; end if;
  if i.revoked_at is not null then return query select 'revoked'::text, null::text, null::text, null::text, null::text, null::smallint, null::text, null::text, null::timestamptz, false, false, null::uuid; return; end if;
  if i.claimed_at is null and i.expires_at <= now() then return query select 'expired'::text, null::text, null::text, null::text, null::text, null::smallint, null::text, null::text, null::timestamptz, false, false, null::uuid; return; end if;
  if i.opened_at is null and (me is null or me <> i.sender_id) then update letter_invites set opened_at = now() where letter_invites.id = i.id; end if;
  select nickname, country into p from profiles where profiles.id = i.sender_id;
  return query select 'ok'::text, p.nickname, p.country, i.body, i.photo_path, i.stamp, i.sign, i.cat_kind, i.created_at,
    (me is not null and me = i.sender_id), (me is not null and me = i.claimed_by), case when me is not null and me in (i.claimed_by, i.sender_id) then i.thread_id end;
end $$;

-- Writing back: the friend (signed in, with a profile) takes the invite. Once only: the row is locked, a second call by
-- the same person returns the same thread, anyone else gets an error.
create or replace function public.claim_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i record; t uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'no profile'; end if;
  select * into i from letter_invites where token = p_token for update;
  if i.id is null then raise exception 'invite not found'; end if;
  if i.claimed_at is not null then
    if i.claimed_by = auth.uid() and i.thread_id is not null then return i.thread_id; end if;
    raise exception 'invite already used';
  end if;
  if i.revoked_at is not null then raise exception 'invite revoked'; end if;
  if i.expires_at <= now() then raise exception 'invite expired'; end if;
  if i.sender_id = auth.uid() then raise exception 'this is your own letter'; end if;
  insert into threads (moment_id, starter_id, owner_id) values (null, i.sender_id, auth.uid()) returning id into t;
  -- the original letter, as sent (its time) and as read (now: the friend has just read it)
  insert into letters (thread_id, sender_id, body, photo_path, stamp, read_at, created_at)
  values (t, i.sender_id, i.body, case when i.photo_path is not null then 'invites:' || i.photo_path end, i.stamp, now(), i.created_at);
  update letter_invites set claimed_by = auth.uid(), claimed_at = now(), thread_id = t, opened_at = coalesce(opened_at, now()) where id = i.id;
  return t;
end $$;

create or replace function public.revoke_invite(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update letter_invites set revoked_at = now() where id = p_id and sender_id = auth.uid() and claimed_at is null and revoked_at is null;
$$;

revoke execute on function public.create_invite(uuid, text, text, smallint, text, text) from public, anon;
grant execute on function public.create_invite(uuid, text, text, smallint, text, text) to authenticated;
revoke execute on function public.read_invite(text) from public;
grant execute on function public.read_invite(text) to anon, authenticated;
revoke execute on function public.claim_invite(text) from public, anon;
grant execute on function public.claim_invite(text) to authenticated;
revoke execute on function public.revoke_invite(uuid) from public, anon;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public) values ('invites', 'invites', true) on conflict (id) do nothing;

-- invites/<user id>/<file>: only the owner uploads, reads (needed to delete) and deletes; viewing is by its (random) URL
drop policy if exists "upload own invite photo" on storage.objects;
create policy "upload own invite photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'invites' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner reads own invite photo" on storage.objects;
create policy "owner reads own invite photo" on storage.objects for select to authenticated
  using (bucket_id = 'invites' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own invite photo" on storage.objects;
create policy "delete own invite photo" on storage.objects for delete to authenticated
  using (bucket_id = 'invites' and (storage.foldername(name))[1] = auth.uid()::text);
