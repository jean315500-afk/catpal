-- CatPal: a letter with no CatPal to go to goes to Sophie & Tori (the operator) instead of waiting.
-- Run once in Supabase -> SQL Editor, after fix-2026-11-14-nomad-market.sql. Safe to run again.
--
-- Why: a new CatPal must be a member with a confirmed email who said yes to matching. Until there are some, every
-- "Meet a new CatPal" letter waited, and a waiting letter stops the next one ("Your last letter is still waiting").
-- Now, with no one to match, the letter goes to the operator's thread (the same one as the welcome) and lands like any
-- letter (travel time as set). Turn it off with: update app_config set match_fallback_operator = false where id = 1;
-- At the end, letters already waiting are looked at again (so they go to Sophie now).

alter table public.app_config add column if not exists match_fallback_operator boolean not null default true;

create or replace function public.pick_catpal(p_user uuid, p_allow_same boolean)
returns table (candidate uuid, same_country_only boolean)
language plpgsql stable security definer set search_path = public, auth as $$
declare mine text; op uuid; fallback boolean; best record;
begin
  select coalesce(origin_country, country) into mine from profiles where id = p_user;
  select operator_id, match_fallback_operator into op, fallback from app_config where id = 1;
  select c.* into best from (
    select p.id,
      coalesce(p.origin_country, p.country) <> mine as abroad,
      not exists (select 1 from letters l join threads t on t.id = l.thread_id
                  where p.id in (t.starter_id, t.owner_id) and l.sender_id <> p.id and l.kind = 'letter' and l.sender_id is distinct from op) as never_got,
      coalesce(p.last_active_at, p.created_at) > now() - interval '14 days' as recent,
      (select count(*) from threads t where p.id in (t.starter_id, t.owner_id)
         and (select l.sender_id from letters l where l.thread_id = t.id order by l.created_at desc limit 1) <> p.id) as waiting_on_them
    from profiles p
    join member_settings s on s.user_id = p.id and s.match_opt_in
    join auth.users u on u.id = p.id
    where p.id <> p_user and p.id is distinct from op and p.role = 'member' and p.status = 'active'
      and u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until < now()) and u.deleted_at is null
      and not exists (select 1 from threads t where (t.starter_id = p_user and t.owner_id = p.id) or (t.starter_id = p.id and t.owner_id = p_user))
      and not blocked_between(p_user, p.id)
  ) c
  order by c.abroad desc, c.never_got desc, c.recent desc, least(c.waiting_on_them, 3) asc, random()
  limit 1;
  if best.id is null then
    -- no one to match: Sophie & Tori take it (unless turned off, I am the operator, or one of us blocked the other)
    if coalesce(fallback, true) and op is not null and op <> p_user and exists (select 1 from profiles where id = op)
       and not blocked_between(p_user, op) then
      return query select op, false; return;
    end if;
    return query select null::uuid, false; return;
  end if;
  if not best.abroad and not p_allow_same then return query select null::uuid, true; return; end if;
  return query select best.id, false;
end $$;
revoke execute on function public.pick_catpal(uuid, boolean) from public, anon, authenticated;

-- letters already waiting: sent on now
select public.process_match_queue(100) as letters_sent_on;
