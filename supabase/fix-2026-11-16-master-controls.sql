-- CatPal: master controls (for testing) + a stamp fix.
-- Run once in Supabase -> SQL Editor, after fix-2026-11-15-match-fallback.sql. Safe to run again.
--
-- 1) Stamp fix: reading a letter is saved even when another letter in the same conversation is still on its way.
--    (Before, the app skipped saving it then: the "You got a stamp!" showed, but after a reload the letter was unread
--    again and the stamp was not in the passport.) Only letters that have landed are marked read.
-- 2) Master controls: hold the Passport button in the dock. They work only on an account unlocked with the master
--    code (once per device/account). Set the code yourself (see the end of this file); nobody else knows it.
--    Unlocked accounts ("testers") can: send letters that land at once, land letters on their way now, give test stamps
--    to themselves or to other testers, clear them, mark their letters unread again, run matching now.
--    Test stamps go only to testers, so real CatPals never get stamps they didn't earn.

-- ---------------------------------------------------------------- 1) the stamp fix

create or replace function public.mark_read_landed(t uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update letters set read_at = now()
  where thread_id = t and sender_id <> auth.uid() and read_at is null
    and (deliver_at is null or deliver_at <= now()) and public.is_thread_member(t);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.mark_read_landed(uuid) from public, anon;
grant execute on function public.mark_read_landed(uuid) to authenticated;

-- ---------------------------------------------------------------- 2) master controls

create extension if not exists pgcrypto with schema extensions;
alter table public.app_config add column if not exists master_code_hash text;

create table if not exists public.master_testers (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  instant     boolean not null default true,          -- my letters land at once
  unlocked_at timestamptz not null default now()
);
alter table public.master_testers enable row level security;   -- no policies: only through the functions below

create table if not exists public.master_tries (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index if not exists master_tries_idx on public.master_tries (user_id, at);
alter table public.master_tries enable row level security;

create table if not exists public.test_stamps (
  user_id    uuid not null references auth.users (id) on delete cascade,
  cc         text not null check (cc ~ '^[A-Z]{2}$'),
  given_by   uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, cc)
);
alter table public.test_stamps enable row level security;
drop policy if exists "own test stamps read" on public.test_stamps;
create policy "own test stamps read" on public.test_stamps for select to authenticated using (user_id = auth.uid());

create or replace function public.is_master(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select u is not null and exists (select 1 from master_testers where user_id = u);
$$;
revoke execute on function public.is_master(uuid) from public, anon, authenticated;

-- the master code: right -> this account is a tester. 10 wrong tries an hour at most.
create or replace function public.master_unlock(p_code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); h text;
begin
  if me is null then raise exception 'Open CatPal first.' using errcode = 'P0001'; end if;
  if (select count(*) from master_tries where user_id = me and at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many tries. Try again in an hour.' using errcode = 'P0001';
  end if;
  select master_code_hash into h from app_config where id = 1;
  if h is null or coalesce(p_code, '') = '' or extensions.crypt(p_code, h) <> h then
    insert into master_tries (user_id) values (me);
    return false;
  end if;
  insert into master_testers (user_id) values (me) on conflict (user_id) do nothing;
  return true;
end $$;

create or replace function public.master_lock()
returns void language sql security definer set search_path = public as $$
  delete from master_testers where user_id = auth.uid();
$$;

-- what the panel shows (null: this account isn't a tester)
create or replace function public.master_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); cfg jsonb;
begin
  if not is_master(me) then return null; end if;
  select to_jsonb(c) - 'master_code_hash' into cfg from app_config c where id = 1;
  return jsonb_build_object(
    'me', me,
    'instant', (select instant from master_testers where user_id = me),
    'travel_scale', cfg -> 'travel_scale',
    'fallback', cfg -> 'match_fallback_operator',
    'operator', cfg -> 'operator_id',
    'testers', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.nickname, 'country', p.country,
                  'origin', coalesce(p.origin_country, p.country), 'active', p.last_active_at,
                  'stamps', (select coalesce(jsonb_agg(s.cc order by s.created_at), '[]'::jsonb) from test_stamps s where s.user_id = p.id))
                  order by p.last_active_at desc nulls last), '[]'::jsonb)
                from master_testers m join profiles p on p.id = m.user_id),
    'flying_to_me', (select count(*) from letters l join threads t on t.id = l.thread_id
                     where me in (t.starter_id, t.owner_id) and l.sender_id <> me and l.deliver_at > now()),
    'flying_from_me', (select count(*) from letters l where l.sender_id = me and l.deliver_at > now()),
    'waiting', (select count(*) from match_requests where user_id = me and status = 'waiting'),
    'threads', (select count(*) from threads where me in (starter_id, owner_id)),
    'letters', (select count(*) from letters l join threads t on t.id = l.thread_id where me in (t.starter_id, t.owner_id))
  );
end $$;

create or replace function public.master_set_instant(p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_master(auth.uid()) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  update master_testers set instant = coalesce(p_on, true) where user_id = auth.uid();
end $$;

-- every letter on its way in my conversations (to me and from me) lands now
create or replace function public.master_land_now()
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if not is_master(me) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  update letters l set deliver_at = now()
  from threads t where t.id = l.thread_id and me in (t.starter_id, t.owner_id) and l.deliver_at > now();
  get diagnostics n = row_count;
  return n;
end $$;

-- a test stamp (a country) for me or another tester
create or replace function public.master_give_stamp(p_user uuid, p_cc text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not is_master(me) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  if not (p_user = me or is_master(p_user)) then raise exception 'Test stamps go only to testers.' using errcode = 'P0001'; end if;
  insert into test_stamps (user_id, cc, given_by) values (p_user, upper(p_cc), me) on conflict (user_id, cc) do nothing;
end $$;

create or replace function public.master_clear_stamps(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if not is_master(me) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  if not (p_user = me or is_master(p_user)) then raise exception 'Test stamps go only to testers.' using errcode = 'P0001'; end if;
  delete from test_stamps where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;

-- my letters as new again (to see a letter open, and its stamp come, once more). No email goes again.
create or replace function public.master_mark_unread()
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if not is_master(me) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  update letters l set read_at = null
  from threads t where t.id = l.thread_id and me in (t.starter_id, t.owner_id) and l.sender_id <> me and l.read_at is not null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.master_run_match()
returns int language plpgsql security definer set search_path = public as $$
begin
  if not is_master(auth.uid()) then raise exception 'Master controls are locked.' using errcode = 'P0001'; end if;
  return public.process_match_queue(20);
end $$;

revoke execute on function public.master_unlock(text), public.master_lock(), public.master_state(), public.master_set_instant(boolean),
  public.master_land_now(), public.master_give_stamp(uuid, text), public.master_clear_stamps(uuid), public.master_mark_unread(),
  public.master_run_match() from public, anon;
grant execute on function public.master_unlock(text), public.master_lock(), public.master_state(), public.master_set_instant(boolean),
  public.master_land_now(), public.master_give_stamp(uuid, text), public.master_clear_stamps(uuid), public.master_mark_unread(),
  public.master_run_match() to authenticated;

-- letters: as before (fix-2026-11-14-nomad-market.sql), and a tester's letter (instant on) lands at once
create or replace function public.letters_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare t record; other uuid; a text; b text; scale real; delay int;
begin
  select * into t from threads where id = new.thread_id;
  if not found then return new; end if;                       -- the foreign key says so
  other := case when t.starter_id = new.sender_id then t.owner_id else t.starter_id end;
  if blocked_between(new.sender_id, other) then raise exception 'You can’t send letters to this CatPal.' using errcode = 'P0001'; end if;
  if new.kind = 'welcome' and coalesce(current_setting('catpal.welcome', true), '') <> 'on' then new.kind := 'letter'; end if;
  new.fast := false;                                           -- (the paid plan is "coming soon": no fast birds)
  select travel_scale, welcome_delay_seconds into scale, delay from app_config where id = 1;
  if new.kind = 'welcome' then
    new.deliver_at := now() + make_interval(secs => coalesce(delay, 20));
  elsif exists (select 1 from master_testers where user_id = new.sender_id and instant) then
    new.deliver_at := now();                                   -- (master controls: instant delivery)
  else
    select country into a from profiles where id = new.sender_id;
    select country into b from profiles where id = other;
    new.deliver_at := now() + make_interval(secs => travel_seconds(a, b, false) * coalesce(scale, 1));
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- the master code (set it yourself)
-- Run this line on its own, with your own code in place of CHANGE-ME (keep it to yourself):
--   update public.app_config set master_code_hash = extensions.crypt('CHANGE-ME', extensions.gen_salt('bf')) where id = 1;
-- To lock everyone out again:
--   delete from public.master_testers;
