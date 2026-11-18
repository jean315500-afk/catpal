-- CatPal: the World globe shows where the real CatPals are — how many in each country, nothing more.
-- Run once in Supabase -> SQL Editor. Safe to run again.
--
-- world_catpals(): one row per country — how many CatPals a letter can go to live there (members who saved their
-- letters with a confirmed email, the same ones matching picks from; not the operator, not you), and whether one of
-- them was here in the last 15 minutes. No name, photo, email or id is given: only the country and the number.

create or replace function public.world_catpals()
returns table (cc text, n int, active boolean)
language sql stable security definer set search_path = public, auth as $$
  select coalesce(p.origin_country, p.country) as cc, count(*)::int as n,
         bool_or(coalesce(p.last_active_at, p.created_at) > now() - interval '15 minutes') as active
  from profiles p
  join member_settings s on s.user_id = p.id and s.match_opt_in
  join auth.users u on u.id = p.id
  where p.role = 'member' and p.status = 'active'
    and p.id is distinct from (select operator_id from app_config where id = 1)
    and p.id is distinct from auth.uid()
    and u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
    and (u.banned_until is null or u.banned_until < now()) and u.deleted_at is null
  group by 1;
$$;
revoke execute on function public.world_catpals() from public;
grant execute on function public.world_catpals() to anon, authenticated;

-- what it shows now
select * from public.world_catpals() order by n desc;
