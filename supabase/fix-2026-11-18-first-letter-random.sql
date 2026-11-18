-- CatPal: a new visitor's first letter goes to a random real CatPal, not to Sophie & Tori.
-- Run once in Supabase -> SQL Editor, after fix-2026-11-17-plus-pick-country.sql. Safe to run again.
--
-- Before: everyone's first letter went to Sophie & Tori (the operator), and an automatic welcome came back; only the
-- second letter went to a real CatPal. Now the first letter is matched like any "Meet a new CatPal" letter: a member
-- who saved their letters with a confirmed email (another country first; someone who hasn't had a letter yet, here
-- lately, with the fewest letters waiting on them; then at random). The app's "To." says "A random CatPal" from the
-- start (it follows public_config.welcome_ready).
-- Kept as it was: when there's no one at all to match, the letter goes to Sophie & Tori (match_fallback_operator), and
-- then their welcome still comes back once.
--
-- To go back to the welcome first:  update public.app_config set welcome_first_letter = true where id = 1;

alter table public.app_config add column if not exists welcome_first_letter boolean not null default true;
update public.app_config set welcome_first_letter = false where id = 1;

-- the first letter's thread with the operator: only while the welcome comes first
create or replace function public.welcome_thread()
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); op uuid; first boolean;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile yet'; end if;
  select operator_id, welcome_first_letter into op, first from app_config where id = 1;
  if not coalesce(first, true) then return null; end if;
  if op is null or op = me or not exists (select 1 from profiles where id = op) then return null; end if;
  if exists (select 1 from welcomes where user_id = me) then return null; end if;
  return thread_between(me, op);
end $$;
revoke execute on function public.welcome_thread() from public, anon;
grant execute on function public.welcome_thread() to authenticated;

-- what the app reads: "welcome_ready" (the first letter's "To. Sophie & Tori") only while the welcome comes first
create or replace function public.public_config()
returns table (operator_id uuid, welcome_ready boolean, donation_url text, operator_nickname text, operator_country text)
language sql stable security definer set search_path = public as $$
  select c.operator_id, p.id is not null and coalesce(c.welcome_first_letter, true), c.donation_url, p.nickname, p.country
  from app_config c left join profiles p on p.id = c.operator_id where c.id = 1;
$$;
revoke execute on function public.public_config() from public;
grant execute on function public.public_config() to anon, authenticated;

-- how many CatPals a first letter can go to right now (one row)
select count(*) as can_get_a_first_letter
from public.profiles p
join public.member_settings s on s.user_id = p.id and s.match_opt_in
join auth.users u on u.id = p.id
where p.role = 'member' and p.status = 'active'
  and p.id is distinct from (select operator_id from public.app_config where id = 1)
  and u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
  and (u.banned_until is null or u.banned_until < now()) and u.deleted_at is null;
