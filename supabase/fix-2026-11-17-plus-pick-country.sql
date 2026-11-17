-- CatPal Plus: "Send to" a country (and "a cat like mine") are really used when the letter goes.
-- Run once in Supabase -> SQL Editor, after fix-2026-11-17-stamps-match-origin.sql. Safe to run again.
--
-- Before: the country picked on the letter was only shown on the screen; the server never heard of it, so the letter
-- went to a random CatPal anywhere (often another country). Now send_to_chosen_catpal takes it:
--   p_country  a CatPal from that country (where they're from, or where they are now) — only that country. No one
--              there to match right now: nothing is sent ("none_in_country"), and the app says so.
--   p_traits   (a cat like mine) the CatPals whose cat shares the most of these come first.
-- The rest is as for "Meet a new CatPal": a member with a confirmed email, not the operator, not blocked, not one
-- you already write to; then someone who hasn't had a letter yet, here lately, with the fewest letters waiting.
-- A letter is sent once per p_client_id (a retry gets back what happened).

create or replace function public.send_to_chosen_catpal(p_client_id uuid, p_body text, p_photo_path text, p_stamp smallint default 0,
  p_country text default null, p_traits text[] default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); r public.match_requests; op uuid; best uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile yet'; end if;
  p_country := nullif(upper(btrim(coalesce(p_country, ''))), '');
  if p_country is not null and p_country !~ '^[A-Z]{2}$' then raise exception 'Pick a country from the list.'; end if;
  p_body := nullif(btrim(coalesce(p_body, '')), '');
  if p_body is null and p_photo_path is null then raise exception 'An empty letter can’t be sent.'; end if;
  if p_photo_path is not null and (split_part(p_photo_path, '/', 1) <> 'outbox' or split_part(p_photo_path, '/', 2) <> me::text) then
    raise exception 'The photo must be your own upload.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catpal:match:' || me::text, 0));
  select * into r from match_requests where user_id = me and client_id = p_client_id;
  if found then return match_state(r); end if;
  select operator_id into op from app_config where id = 1;
  select c.id into best from (
    select p.id,
      coalesce(cardinality(array(select unnest(coalesce(p.cat_traits, '{}'::text[])) intersect select unnest(coalesce(p_traits, '{}'::text[])))), 0) as alike,
      not exists (select 1 from letters l join threads t on t.id = l.thread_id
                  where p.id in (t.starter_id, t.owner_id) and l.sender_id <> p.id and l.kind = 'letter' and l.sender_id is distinct from op) as never_got,
      coalesce(p.last_active_at, p.created_at) > now() - interval '14 days' as recent,
      (select count(*) from threads t where p.id in (t.starter_id, t.owner_id)
         and (select l.sender_id from letters l where l.thread_id = t.id order by l.created_at desc limit 1) <> p.id) as waiting_on_them
    from profiles p
    join member_settings s on s.user_id = p.id and s.match_opt_in
    join auth.users u on u.id = p.id
    where p.id <> me and p.id is distinct from op and p.role = 'member' and p.status = 'active'
      and u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until < now()) and u.deleted_at is null
      and not exists (select 1 from threads t where (t.starter_id = me and t.owner_id = p.id) or (t.starter_id = p.id and t.owner_id = me))
      and not blocked_between(me, p.id)
      and (p_country is null or coalesce(p.origin_country, p.country) = p_country or p.country = p_country)
  ) c
  order by c.alike desc, c.never_got desc, c.recent desc, least(c.waiting_on_them, 3) asc, random()
  limit 1;
  -- no one there: nothing sent (the app says so — another country, or at random)
  if best is null then return jsonb_build_object('status', 'none_in_country', 'country', p_country); end if;
  insert into match_requests (user_id, client_id, body, photo_path, stamp, allow_same_country, waited)
    values (me, p_client_id, left(p_body, 500), p_photo_path, least(greatest(coalesce(p_stamp, 0), 0), 7), true, false)
    returning * into r;
  perform deliver_match(r.id, best);
  select * into r from match_requests where id = r.id;
  return match_state(r);
end $$;
revoke execute on function public.send_to_chosen_catpal(uuid, text, text, smallint, text, text[]) from public, anon;
grant execute on function public.send_to_chosen_catpal(uuid, text, text, smallint, text, text[]) to authenticated;
