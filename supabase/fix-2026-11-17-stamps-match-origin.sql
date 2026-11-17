-- CatPal: matching always on, "where you're from" can't be changed, and the letter emails in the master controls.
-- Run once in Supabase -> SQL Editor, after fix-2026-11-16-master-controls.sql. Safe to run again.
--
-- 1) Matching is what CatPal is for: everyone can be matched (the "Match me with CatPals" switch is gone from
--    Settings). Everyone who had it off is turned on; new accounts start on; saving settings can't turn it off.
--    (Who is actually picked is as before: a member with a confirmed email, not the operator, not blocked.)
-- 2) Where you're from (profiles.origin_country, the postmark your letters carry) is found by itself from where you
--    are on the internet when your profile is made, and can't be changed by the app after that. (Before: picked in
--    Settings / the Passport, so anyone could pretend to be from anywhere.) A profile with none kept yet keeps the
--    country it had. Changing it by hand here in the SQL Editor still works (it isn't the app).
-- 3) Master controls: the latest letter emails to me (sent, or why not), so a missing email can be looked into.

-- ---------------------------------------------------------------- 1) matching always on

alter table public.member_settings alter column match_opt_in set default true;

update public.member_settings
   set match_opt_in = true, match_opt_in_at = coalesce(match_opt_in_at, now())
 where not match_opt_in;

create or replace function public.save_my_settings(p_notify boolean default null, p_match boolean default null)
returns public.member_settings language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.member_settings; was boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into member_settings (user_id) values (me) on conflict (user_id) do nothing;
  select match_opt_in into was from member_settings where user_id = me;
  update member_settings set
    notify_letters = coalesce(p_notify, notify_letters),
    notify_consent_at = case when p_notify is true and not notify_letters then now() when p_notify is false then null else notify_consent_at end,
    -- (p_match is no longer asked: matching is always on)
    match_opt_in = true,
    match_opt_in_at = coalesce(match_opt_in_at, now()),
    updated_at = now()
  where user_id = me returning * into s;
  -- someone new to match with: letters waiting for one may go now
  if not coalesce(was, false) then perform process_match_queue(10); end if;
  return s;
end $$;
revoke execute on function public.save_my_settings(boolean, boolean) from public, anon;
grant execute on function public.save_my_settings(boolean, boolean) to authenticated;

-- ---------------------------------------------------------------- 2) where you're from: set once, kept

create or replace function public.profiles_origin_lock() returns trigger language plpgsql as $$
begin
  -- (only the app's own calls are held to it; the SQL Editor / the server can still put it right)
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then return new; end if;
  if old.origin_country is not null then
    new.origin_country := old.origin_country;                 -- kept, whatever's sent
  elsif new.origin_country is not null then
    new.origin_country := null;                               -- none kept: it stays "where you were", as below
  end if;
  -- none kept (it was the same as where you are): moving now doesn't change where you're from
  if old.origin_country is null and new.country is distinct from old.country then
    new.origin_country := old.country;
  end if;
  return new;
end $$;
drop trigger if exists profiles_origin_lock on public.profiles;
create trigger profiles_origin_lock before update on public.profiles for each row execute function public.profiles_origin_lock();

-- ---------------------------------------------------------------- 3) master controls: the letter emails to me

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
    'letters', (select count(*) from letters l join threads t on t.id = l.thread_id where me in (t.starter_id, t.owner_id)),
    -- the latest letter emails to me: how each went (no address in it)
    'emails', (select coalesce(jsonb_agg(e order by e.created_at desc), '[]'::jsonb) from (
                 select n.kind, n.status, n.last_error, n.created_at, n.sent_at,
                        (select p.nickname from letters l join profiles p on p.id = l.sender_id where l.id = n.letter_id) as from_name
                 from email_notifications n where n.recipient_id = me order by n.created_at desc limit 8) e)
  );
end $$;
revoke execute on function public.master_state() from public, anon;
grant execute on function public.master_state() to authenticated;
