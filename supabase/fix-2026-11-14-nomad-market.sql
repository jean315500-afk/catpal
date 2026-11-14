-- ================================================================ 2026-11-14 Nomad market: real accounts, Sophie & Tori's
-- welcome, first CatPal matching, letter emails, blocking
--
-- Run once in the Supabase SQL Editor, AFTER schema.sql and every earlier fix-*.sql (in date order, including
-- fix-2026-11-14-origin-country.sql). Safe to re-run. What it changes:
--
--   ADDED (nothing existing removed):
--     profiles.role / status / last_active_at   who may be matched (members only, active); written only by the server
--     member_settings        per person: letter emails on/off (with when they said yes), take part in matching on/off
--     app_config             one row: the operator (Sophie), Tori's photo, the welcome texts, donation URL, travel scale
--     country_points         each country's capital (the app's own table), to time a letter's flight on the server
--     letters.kind           'letter' | 'welcome' (the automatic one, from the operator; only the server writes it)
--     letters.deliver_at     when a letter lands — set by the server from the two countries (the app shows the same)
--     welcomes               one row per person who got the welcome: what makes it once, however often it's tried
--     match_requests         "Meet a new CatPal": a letter matched to someone, or waiting till someone can take it
--     blocks                 who I've blocked: no letter, no match between us, either way
--     email_notifications    one row per email to send (a new letter / a waiting letter delivered): tried at most 3
--                            times, with what went wrong — the notify-letters Edge Function sends them
--     functions              welcome_thread, send_to_new_catpal, set_waiting_same_country, cancel_waiting_letter,
--                            save_my_settings, touch_me, public_config (for the app);
--                            process_match_queue (app + server); claim / still_wanted / finish email (server only)
--
--   CHANGED (same rule, made safe for the new paths):
--     storage policies "thread members upload letter photo" / "thread members view letter photo": they read a letter
--     photo's folder as a thread id; now they first check it IS one (so outbox/… and welcome/… paths don't error).
--     A letter's photo is also readable by the two people of any thread holding a letter with that photo.
--
-- Emails are never stored here: a person's address is their sign-in's (auth.users.email), used only once it's
-- confirmed, and only by the server. Nobody else ever sees it.
--
-- AFTER RUNNING (see supabase/functions/notify-letters/README.md): set the operator and Tori's photo in app_config,
-- deploy the notify-letters function, and schedule it every minute.

-- ---------------------------------------------------------------- profiles: who may be matched

alter table public.profiles add column if not exists origin_country text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists last_active_at timestamptz;
do $$ begin alter table public.profiles add constraint profiles_origin_country_code check (origin_country is null or origin_country ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
do $$ begin alter table public.profiles add constraint profiles_role_kind check (role in ('member', 'operator', 'test'));
exception when duplicate_object then null; end $$;
do $$ begin alter table public.profiles add constraint profiles_status_kind check (status in ('active', 'inactive', 'blocked'));
exception when duplicate_object then null; end $$;

-- a person can't make themselves the operator, or unblock themselves: role and status are the server's (the dashboard,
-- the service role and these functions have no auth.uid() of a member making the change)
create or replace function public.profiles_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(current_setting('catpal.server', true), '') <> 'on' then
    if tg_op = 'INSERT' then new.role := 'member'; new.status := 'active';
    else new.role := old.role; new.status := old.status; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------- member settings (only their own; never shown to others)

create table if not exists public.member_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  notify_letters     boolean not null default false,       -- "email me when a new letter arrives"
  notify_consent_at  timestamptz,                          -- when they said yes (cleared when they say no)
  match_opt_in       boolean not null default false,       -- "match me with CatPals": others may be sent my way
  match_opt_in_at    timestamptz,
  updated_at         timestamptz not null default now()
);
alter table public.member_settings enable row level security;
drop policy if exists "own settings" on public.member_settings;
create policy "own settings" on public.member_settings for select to authenticated using (user_id = auth.uid());
-- (written only through save_my_settings)

-- ---------------------------------------------------------------- app config (one row; edited in the dashboard / SQL)

create table if not exists public.app_config (
  id                     smallint primary key default 1 check (id = 1),
  operator_id            uuid references public.profiles (id) on delete set null,   -- Sophie's profile: set by hand
  welcome_photo_path     text,                         -- Tori's photo in the "letters" bucket, e.g. 'welcome/tori.jpg'
  welcome_text_named     text not null default E'Hi {name}! So happy to meet you 🐾\nI’m Sophie, and this is my cat, Tori.\nA little hello from us to you! What’s {name} like?',
  welcome_text_unnamed   text not null default E'Hi there! So happy to meet you 🐾\nI’m Sophie, and this is my cat, Tori.\nA little hello from us to you! Tell us a little about yourself.',
  welcome_delay_seconds  int not null default 20 check (welcome_delay_seconds between 0 and 3600),
  travel_scale           real not null default 1 check (travel_scale between 0 and 10),   -- 0: letters land at once
  donation_url           text check (donation_url is null or donation_url ~ '^https://'),
  updated_at             timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;
alter table public.app_config enable row level security;   -- no policies: read through public_config() only

-- what the app may know: who the operator is (their public name and country, as on their profile), whether the
-- welcome is ready, the donation link
drop function if exists public.public_config();
create or replace function public.public_config()
returns table (operator_id uuid, welcome_ready boolean, donation_url text, operator_nickname text, operator_country text)
language sql stable security definer set search_path = public as $$
  select c.operator_id, p.id is not null, c.donation_url, p.nickname, p.country
  from app_config c left join profiles p on p.id = c.operator_id where c.id = 1;
$$;
revoke execute on function public.public_config() from public;
grant execute on function public.public_config() to anon, authenticated;

-- ---------------------------------------------------------------- when a letter lands (the app's own rule, on the server)

create table if not exists public.country_points (
  cc   text primary key check (cc ~ '^[A-Z]{2}$'),
  lon  double precision not null,
  lat  double precision not null
);
alter table public.country_points enable row level security;
drop policy if exists "country points readable" on public.country_points;
create policy "country points readable" on public.country_points for select to anon, authenticated using (true);
insert into public.country_points (cc, lon, lat) values
  ('AD',1.52,42.51), ('AE',54.37,24.45), ('AF',69.18,34.53), ('AG',-61.85,17.12), ('AL',19.82,41.33),
  ('AM',44.51,40.18), ('AO',13.23,-8.84), ('AR',-58.38,-34.6), ('AT',16.37,48.21), ('AU',149.13,-35.28),
  ('AZ',49.87,40.41), ('BA',18.41,43.86), ('BB',-59.6,13.1), ('BD',90.41,23.81), ('BE',4.35,50.85),
  ('BF',-1.52,12.37), ('BG',23.32,42.7), ('BH',50.59,26.23), ('BI',29.36,-3.38), ('BJ',2.63,6.5), ('BN',114.94,4.94),
  ('BO',-68.15,-16.5), ('BR',-47.88,-15.79), ('BS',-77.35,25.05), ('BT',89.64,27.47), ('BW',25.91,-24.65),
  ('BY',27.56,53.9), ('BZ',-88.76,17.25), ('CA',-75.7,45.42), ('CD',15.27,-4.44), ('CF',18.56,4.39),
  ('CG',15.24,-4.27), ('CH',7.45,46.95), ('CI',-4.03,5.35), ('CL',-70.67,-33.45), ('CM',11.5,3.87),
  ('CN',116.4,39.9), ('CO',-74.07,4.71), ('CR',-84.09,9.93), ('CU',-82.37,23.11), ('CV',-23.51,14.93),
  ('CY',33.38,35.19), ('CZ',14.42,50.08), ('DE',13.4,52.52), ('DJ',43.15,11.59), ('DK',12.57,55.68),
  ('DM',-61.39,15.3), ('DO',-69.93,18.49), ('DZ',3.06,36.75), ('EC',-78.47,-0.18), ('EE',24.75,59.44),
  ('EG',31.24,30.04), ('ER',38.93,15.32), ('ES',-3.7,40.42), ('ET',38.75,9.03), ('FI',24.94,60.17),
  ('FJ',178.44,-18.14), ('FM',158.16,6.92), ('FR',2.35,48.86), ('GA',9.45,0.39), ('GB',-0.13,51.5),
  ('GD',-61.75,12.05), ('GE',44.79,41.72), ('GH',-0.19,5.6), ('GM',-16.58,13.45), ('GN',-13.68,9.64),
  ('GQ',8.78,3.75), ('GR',23.73,37.98), ('GT',-90.51,14.63), ('GW',-15.6,11.86), ('GY',-58.16,6.8),
  ('HK',114.17,22.32), ('HN',-87.21,14.07), ('HR',15.98,45.81), ('HT',-72.34,18.54), ('HU',19.04,47.5),
  ('ID',106.85,-6.21), ('IE',-6.26,53.35), ('IL',35.22,31.77), ('IN',77.21,28.61), ('IQ',44.37,33.31),
  ('IR',51.39,35.69), ('IS',-21.9,64.15), ('IT',12.5,41.9), ('JM',-76.79,18.02), ('JO',35.93,31.95),
  ('JP',139.69,35.68), ('KE',36.82,-1.29), ('KG',74.59,42.87), ('KH',104.92,11.56), ('KI',173.02,1.45),
  ('KM',43.26,-11.7), ('KN',-62.72,17.3), ('KP',125.75,39.03), ('KR',126.98,37.57), ('KW',47.98,29.38),
  ('KZ',71.45,51.17), ('LA',102.63,17.98), ('LB',35.5,33.89), ('LC',-60.98,14.01), ('LI',9.52,47.14),
  ('LK',79.86,6.93), ('LR',-10.8,6.3), ('LS',27.48,-29.31), ('LT',25.28,54.69), ('LU',6.13,49.61),
  ('LV',24.11,56.95), ('LY',13.19,32.89), ('MA',-6.84,34.02), ('MC',7.42,43.74), ('MD',28.86,47.01),
  ('ME',19.26,42.44), ('MG',47.52,-18.88), ('MH',171.38,7.09), ('MK',21.43,42), ('ML',-8,12.64), ('MM',96.13,19.76),
  ('MN',106.91,47.89), ('MO',113.54,22.2), ('MR',-15.98,18.08), ('MT',14.51,35.9), ('MU',57.5,-20.16),
  ('MV',73.51,4.18), ('MW',33.79,-13.96), ('MX',-99.13,19.43), ('MY',101.69,3.14), ('MZ',32.59,-25.97),
  ('NA',17.08,-22.56), ('NE',2.11,13.51), ('NG',7.49,9.06), ('NI',-86.25,12.13), ('NL',4.9,52.37),
  ('NO',10.75,59.91), ('NP',85.32,27.72), ('NR',166.92,-0.55), ('NZ',174.78,-41.29), ('OM',58.41,23.59),
  ('PA',-79.52,8.98), ('PE',-77.04,-12.05), ('PG',147.18,-9.44), ('PH',120.98,14.6), ('PK',73.05,33.68),
  ('PL',21.01,52.23), ('PR',-66.11,18.47), ('PS',35.2,31.9), ('PT',-9.14,38.72), ('PW',134.48,7.5),
  ('PY',-57.58,-25.26), ('QA',51.53,25.29), ('RO',26.1,44.43), ('RS',20.46,44.79), ('RU',37.62,55.76),
  ('RW',30.06,-1.94), ('SA',46.68,24.71), ('SB',159.95,-9.43), ('SC',55.45,-4.62), ('SD',32.53,15.5),
  ('SE',18.07,59.33), ('SG',103.82,1.35), ('SI',14.51,46.06), ('SK',17.11,48.15), ('SL',-13.23,8.47),
  ('SM',12.45,43.94), ('SN',-17.47,14.72), ('SO',45.32,2.05), ('SR',-55.2,5.85), ('SS',31.58,4.86), ('ST',6.73,0.34),
  ('SV',-89.22,13.69), ('SY',36.29,33.51), ('SZ',31.13,-26.31), ('TD',15.04,12.13), ('TG',1.23,6.13),
  ('TH',100.5,13.75), ('TJ',68.79,38.56), ('TL',125.57,-8.56), ('TM',58.38,37.95), ('TN',10.18,36.81),
  ('TO',-175.2,-21.14), ('TR',32.86,39.93), ('TT',-61.52,10.65), ('TV',179.2,-8.52), ('TW',121.56,25.03),
  ('TZ',35.74,-6.16), ('UA',30.52,50.45), ('UG',32.58,0.35), ('US',-77.04,38.91), ('UY',-56.16,-34.9),
  ('UZ',69.24,41.3), ('VA',12.45,41.9), ('VC',-61.23,13.16), ('VE',-66.9,10.48), ('VN',105.83,21.03),
  ('VU',168.32,-17.73), ('WS',-171.75,-13.83), ('YE',44.21,15.37), ('ZA',28.19,-25.75), ('ZM',28.32,-15.39),
  ('ZW',31.05,-17.83)
on conflict (cc) do update set lon = excluded.lon, lat = excluded.lat;

-- the bird's time between two countries, as src/community/countries.ts travelMs: 1000 km an hour, at least half an
-- hour, at most a day (the same country, or one not known: half an hour); a fast bird a quarter (at least 15 minutes)
create or replace function public.travel_seconds(a text, b text, fast boolean default false)
returns double precision language plpgsql stable set search_path = public as $$
declare alon double precision; alat double precision; blon double precision; blat double precision; h double precision := 0.5; s double precision;
begin
  select lon, lat into alon, alat from country_points where cc = a;
  select lon, lat into blon, blat from country_points where cc = b;
  if a is not null and b is not null and a <> b and alon is not null and blon is not null then
    h := round(6371 * 2 * asin(sqrt(power(sin(radians(blat - alat) / 2), 2) + cos(radians(alat)) * cos(radians(blat)) * power(sin(radians(blon - alon) / 2), 2)))) / 1000.0;
  end if;
  s := least(24, greatest(0.5, h)) * 3600;
  if fast then s := greatest(15 * 60, s / 4); end if;
  return s;
end $$;

-- ---------------------------------------------------------------- letters: kind and landing time

alter table public.letters add column if not exists fast boolean not null default false;
alter table public.letters add column if not exists kind text not null default 'letter';
alter table public.letters add column if not exists deliver_at timestamptz;
do $$ begin alter table public.letters add constraint letters_kind_kind check (kind in ('letter', 'welcome'));
exception when duplicate_object then null; end $$;
create index if not exists letters_unread_landing_idx on public.letters (deliver_at) where read_at is null;

-- ---------------------------------------------------------------- blocks

create table if not exists public.blocks (
  blocker_id  uuid not null references auth.users (id) on delete cascade,
  blocked_id  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "own blocks read" on public.blocks;
create policy "own blocks read" on public.blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "own blocks add" on public.blocks;
create policy "own blocks add" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "own blocks remove" on public.blocks;
create policy "own blocks remove" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke execute on function public.blocked_between(uuid, uuid) from public, anon, authenticated;

-- every letter, however it's written: not between two people one of whom blocked the other; its kind is 'letter'
-- unless the welcome below writes it; and when it lands is the server's to say
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
  else
    select country into a from profiles where id = new.sender_id;
    select country into b from profiles where id = other;
    new.deliver_at := now() + make_interval(secs => travel_seconds(a, b, false) * coalesce(scale, 1));
  end if;
  return new;
end $$;
drop trigger if exists letters_before_insert on public.letters;
create trigger letters_before_insert before insert on public.letters for each row execute function public.letters_before_insert();

-- ---------------------------------------------------------------- one thread between two people

create or replace function public.thread_between(a uuid, b uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if a = b then raise exception 'a thread needs two people'; end if;
  if blocked_between(a, b) then raise exception 'You can’t send letters to this CatPal.' using errcode = 'P0001'; end if;
  -- (one at a time for the pair: two tabs, or two retries, find the same thread)
  perform pg_advisory_xact_lock(hashtextextended('catpal:pair:' || least(a, b)::text || greatest(a, b)::text, 0));
  select id into t from threads
    where moment_id is null and ((starter_id = a and owner_id = b) or (starter_id = b and owner_id = a))
    order by created_at limit 1;
  if t is null then insert into threads (moment_id, starter_id, owner_id) values (null, a, b) returning id into t; end if;
  return t;
end $$;
revoke execute on function public.thread_between(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- Sophie & Tori's welcome (once per person)

create table if not exists public.welcomes (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  thread_id        uuid references public.threads (id) on delete set null,
  first_letter_id  uuid references public.letters (id) on delete set null,
  letter_id        uuid references public.letters (id) on delete set null,   -- the welcome itself
  created_at       timestamptz not null default now()
);
alter table public.welcomes enable row level security;
drop policy if exists "own welcome" on public.welcomes;
create policy "own welcome" on public.welcomes for select to authenticated using (user_id = auth.uid());

-- a first letter goes to the operator: their thread (made now if need be). Null: no operator set, I am the operator,
-- or I've had my welcome already (a new letter then finds a new CatPal)
create or replace function public.welcome_thread()
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); op uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile yet'; end if;
  select operator_id into op from app_config where id = 1;
  if op is null or op = me or not exists (select 1 from profiles where id = op) then return null; end if;
  if exists (select 1 from welcomes where user_id = me) then return null; end if;
  return thread_between(me, op);
end $$;
revoke execute on function public.welcome_thread() from public, anon;
grant execute on function public.welcome_thread() to authenticated;

-- the welcome: written the moment someone's first letter reaches the operator — once (the welcomes row is the guard:
-- a retry, a reload or a second letter finds it there). Their cat's name only as text; the letter is never HTML.
create or replace function public.letters_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare cfg record; t record; nick text; body text; wid uuid; n int;
begin
  if new.kind <> 'letter' then return null; end if;
  select * into cfg from app_config where id = 1;
  if cfg.operator_id is null or new.sender_id = cfg.operator_id then return null; end if;
  select * into t from threads where id = new.thread_id;
  if cfg.operator_id <> t.starter_id and cfg.operator_id <> t.owner_id then return null; end if;
  insert into welcomes (user_id, thread_id, first_letter_id) values (new.sender_id, new.thread_id, new.id) on conflict (user_id) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return null; end if;
  select nickname into nick from profiles where id = new.sender_id;
  nick := left(btrim(regexp_replace(coalesce(nick, ''), '[[:cntrl:]]+', ' ', 'g')), 24);
  body := case when nick <> '' then replace(cfg.welcome_text_named, '{name}', nick) else cfg.welcome_text_unnamed end;
  perform set_config('catpal.welcome', 'on', true);
  insert into letters (thread_id, sender_id, body, photo_path, stamp, kind)
    values (new.thread_id, cfg.operator_id, left(body, 500), nullif(btrim(coalesce(cfg.welcome_photo_path, '')), ''), 0, 'welcome')
    returning id into wid;
  perform set_config('catpal.welcome', '', true);
  update welcomes set letter_id = wid where user_id = new.sender_id;
  return null;
end $$;
drop trigger if exists letters_after_insert on public.letters;
create trigger letters_after_insert after insert on public.letters for each row execute function public.letters_after_insert();

-- ---------------------------------------------------------------- settings

create or replace function public.save_my_settings(p_notify boolean default null, p_match boolean default null)
returns public.member_settings language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.member_settings;
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into member_settings (user_id) values (me) on conflict (user_id) do nothing;
  update member_settings set
    notify_letters = coalesce(p_notify, notify_letters),
    notify_consent_at = case when p_notify is true and not notify_letters then now() when p_notify is false then null else notify_consent_at end,
    match_opt_in = coalesce(p_match, match_opt_in),
    match_opt_in_at = case when p_match is true and not match_opt_in then now() when p_match is false then null else match_opt_in_at end,
    updated_at = now()
  where user_id = me returning * into s;
  -- someone new to match with: letters waiting for one may go now
  if p_match is true then perform process_match_queue(10); end if;
  return s;
end $$;

-- ---------------------------------------------------------------- matching ("Meet a new CatPal")

create table if not exists public.match_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  client_id           uuid not null,                       -- the letter's own id on the device: a retry is the same letter
  status              text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  allow_same_country  boolean not null default false,
  body                text check (body is null or char_length(body) between 1 and 500),
  photo_path          text,                                -- letters/outbox/<user id>/…
  stamp               smallint not null default 0 check (stamp between 0 and 7),
  waited              boolean not null default false,      -- it waited for someone (then its sender is emailed)
  matched_with        uuid references public.profiles (id) on delete set null,
  thread_id           uuid references public.threads (id) on delete set null,
  letter_id           uuid references public.letters (id) on delete set null,
  created_at          timestamptz not null default now(),
  matched_at          timestamptz,
  unique (user_id, client_id),
  check (body is not null or photo_path is not null)
);
create unique index if not exists match_requests_one_waiting on public.match_requests (user_id) where status = 'waiting';
create index if not exists match_requests_waiting_idx on public.match_requests (created_at) where status = 'waiting';
alter table public.match_requests enable row level security;
drop policy if exists "own match requests" on public.match_requests;
create policy "own match requests" on public.match_requests for select to authenticated using (user_id = auth.uid());

-- who to write to: a real member (signed up with a confirmed email, said yes to matching, active, not the operator or
-- a test account), not me, nobody I've a thread with or a block between. Best first: from another country, then
-- someone who hasn't had a letter yet and has been here lately, with the fewest letters waiting on them; among equals,
-- at random. same_country_only: the only ones there are come from my country (asked first, unless allowed).
create or replace function public.pick_catpal(p_user uuid, p_allow_same boolean)
returns table (candidate uuid, same_country_only boolean)
language plpgsql stable security definer set search_path = public, auth as $$
declare mine text; op uuid; best record;
begin
  select coalesce(origin_country, country) into mine from profiles where id = p_user;
  select operator_id into op from app_config where id = 1;
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
  if best.id is null then return query select null::uuid, false; return; end if;
  if not best.abroad and not p_allow_same then return query select null::uuid, true; return; end if;
  return query select best.id, false;
end $$;
revoke execute on function public.pick_catpal(uuid, boolean) from public, anon, authenticated;

-- a request matched: the thread, and the letter in it (its sender's, as written)
create or replace function public.deliver_match(p_request uuid, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record; th uuid; lid uuid;
begin
  select * into r from match_requests where id = p_request and status = 'waiting' for update;
  if not found then return; end if;
  th := thread_between(r.user_id, p_to);
  insert into letters (thread_id, sender_id, body, photo_path, stamp, kind)
    values (th, r.user_id, r.body, r.photo_path, r.stamp, 'letter') returning id into lid;
  update match_requests set status = 'matched', matched_with = p_to, thread_id = th, letter_id = lid, matched_at = now()
    where id = r.id;
end $$;
revoke execute on function public.deliver_match(uuid, uuid) from public, anon, authenticated;

create or replace function public.match_state(r public.match_requests)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('status', r.status, 'request_id', r.id, 'thread_id', r.thread_id, 'letter_id', r.letter_id,
    'matched_with', r.matched_with, 'nickname', p.nickname, 'country', p.country, 'origin_country', coalesce(p.origin_country, p.country))
  from (select 1) x left join profiles p on p.id = r.matched_with;
$$;
revoke execute on function public.match_state(public.match_requests) from public, anon, authenticated;

-- "Meet a new CatPal": this letter (sent only now — the person pressed Send) to the best one there is, or kept till
-- someone can take it. One call per letter (p_client_id): a retry, a second tap or a reload gets back what happened.
create or replace function public.send_to_new_catpal(p_client_id uuid, p_body text, p_photo_path text, p_stamp smallint default 0, p_allow_same boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.match_requests; pick record;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'no profile yet'; end if;
  p_body := nullif(btrim(coalesce(p_body, '')), '');
  if p_body is null and p_photo_path is null then raise exception 'An empty letter can’t be sent.'; end if;
  if p_photo_path is not null and (split_part(p_photo_path, '/', 1) <> 'outbox' or split_part(p_photo_path, '/', 2) <> me::text) then
    raise exception 'The photo must be your own upload.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catpal:match:' || me::text, 0));
  select * into r from match_requests where user_id = me and client_id = p_client_id;
  if found then return match_state(r); end if;
  if exists (select 1 from match_requests where user_id = me and status = 'waiting') then
    return jsonb_build_object('status', 'already_waiting'); end if;
  select * into pick from pick_catpal(me, p_allow_same);
  if pick.same_country_only then return jsonb_build_object('status', 'ask_same_country'); end if;
  insert into match_requests (user_id, client_id, body, photo_path, stamp, allow_same_country, waited)
    values (me, p_client_id, left(p_body, 500), p_photo_path, least(greatest(coalesce(p_stamp, 0), 0), 7), p_allow_same, pick.candidate is null)
    returning * into r;
  if pick.candidate is not null then perform deliver_match(r.id, pick.candidate); select * into r from match_requests where id = r.id; end if;
  return match_state(r);
end $$;
revoke execute on function public.send_to_new_catpal(uuid, text, text, smallint, boolean) from public, anon;
grant execute on function public.send_to_new_catpal(uuid, text, text, smallint, boolean) to authenticated;

-- a waiting letter: OK with someone from my own country after all / take it back
create or replace function public.set_waiting_same_country(p_allow boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update match_requests set allow_same_country = p_allow where user_id = auth.uid() and status = 'waiting';
  if p_allow then perform process_match_queue(10); end if;
end $$;
revoke execute on function public.set_waiting_same_country(boolean) from public, anon;
grant execute on function public.set_waiting_same_country(boolean) to authenticated;

create or replace function public.cancel_waiting_letter()
returns void language sql security definer set search_path = public as $$
  update match_requests set status = 'cancelled' where user_id = auth.uid() and status = 'waiting';
$$;
revoke execute on function public.cancel_waiting_letter() from public, anon;
grant execute on function public.cancel_waiting_letter() to authenticated;

-- letters waiting for a CatPal: matched now if someone can take them (oldest first; one at a time per sender)
create or replace function public.process_match_queue(p_limit int default 20)
returns int language plpgsql security definer set search_path = public as $$
declare r record; pick record; n int := 0;
begin
  for r in select * from match_requests where status = 'waiting' order by created_at limit least(greatest(coalesce(p_limit, 20), 1), 100)
           for update skip locked loop
    if not pg_try_advisory_xact_lock(hashtextextended('catpal:match:' || r.user_id::text, 0)) then continue; end if;
    select * into pick from pick_catpal(r.user_id, r.allow_same_country);
    if pick.candidate is not null then perform deliver_match(r.id, pick.candidate); n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke execute on function public.process_match_queue(int) from public, anon;
grant execute on function public.process_match_queue(int) to authenticated, service_role;

-- here now: kept (at most once a minute), and any letter waiting for a CatPal looked at again
create or replace function public.touch_me()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update profiles set last_active_at = now() where id = auth.uid() and (last_active_at is null or last_active_at < now() - interval '1 minute');
  if exists (select 1 from match_requests where status = 'waiting') then perform process_match_queue(5); end if;
end $$;
revoke execute on function public.touch_me() from public, anon;
grant execute on function public.touch_me() to authenticated;
revoke execute on function public.save_my_settings(boolean, boolean) from public, anon;
grant execute on function public.save_my_settings(boolean, boolean) to authenticated;

-- ---------------------------------------------------------------- emails (sent by the notify-letters Edge Function)

create table if not exists public.email_notifications (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('letter', 'matched')),   -- a new letter for you / your waiting letter went
  letter_id        uuid not null references public.letters (id) on delete cascade,
  recipient_id     uuid not null references auth.users (id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts         int not null default 0,
  last_error       text,
  next_attempt_at  timestamptz not null default now(),
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (kind, letter_id)
);
create index if not exists email_notifications_due_idx on public.email_notifications (next_attempt_at) where status in ('pending', 'failed', 'sending');
alter table public.email_notifications enable row level security;   -- no policies: the server's only

-- may this person be emailed about this letter now? (asked for letter emails, address confirmed, still unread for a
-- new letter, nobody blocked)
create or replace function public.email_still_wanted(p_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from email_notifications n
    join letters l on l.id = n.letter_id
    join threads t on t.id = l.thread_id
    join member_settings s on s.user_id = n.recipient_id and s.notify_letters
    join auth.users u on u.id = n.recipient_id and u.email is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
    join profiles p on p.id = n.recipient_id and p.status = 'active'
    where n.id = p_id and l.kind = 'letter' and l.deliver_at <= now()
      and (n.kind = 'matched' or l.read_at is null)
      and not blocked_between(t.starter_id, t.owner_id));
$$;

-- due emails, claimed for sending (each by one sender only; a stuck one is taken again after 10 minutes)
create or replace function public.claim_emails(p_limit int default 20)
returns table (id uuid, kind text, letter_id uuid, email text, from_name text, to_name text, attempts int)
language plpgsql security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  -- a letter that has landed, from a real person (not the automatic welcome), unread: its recipient may be told
  insert into email_notifications (kind, letter_id, recipient_id)
  select 'letter', l.id, case when t.starter_id = l.sender_id then t.owner_id else t.starter_id end
  from letters l join threads t on t.id = l.thread_id
  where l.kind = 'letter' and l.read_at is null and l.deliver_at <= now() and l.deliver_at > now() - interval '3 days'
  on conflict (kind, letter_id) do nothing;
  -- a letter that waited for a CatPal and has now landed with one: its sender is told it went
  insert into email_notifications (kind, letter_id, recipient_id)
  select 'matched', l.id, r.user_id
  from match_requests r join letters l on l.id = r.letter_id
  where r.status = 'matched' and r.waited and l.deliver_at <= now() and l.deliver_at > now() - interval '3 days'
  on conflict (kind, letter_id) do nothing;
  -- not wanted (no letter emails, no confirmed address, read already…): never sent, and said why
  update email_notifications n set status = 'skipped', last_error = 'not wanted: emails off, no confirmed address, or read already', updated_at = now()
  where n.status = 'pending' and not email_still_wanted(n.id);
  return query
  with due as (
    select n.id from email_notifications n
    where n.attempts < 3 and ((n.status in ('pending', 'failed') and n.next_attempt_at <= now())
                               or (n.status = 'sending' and n.updated_at < now() - interval '10 minutes'))
    order by n.created_at limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked)
  update email_notifications n set status = 'sending', attempts = n.attempts + 1, updated_at = now()
  from due where n.id = due.id
  returning n.id, n.kind, n.letter_id,
    (select u.email::text from auth.users u where u.id = n.recipient_id),
    (select p.nickname from letters l join profiles p on p.id = l.sender_id where l.id = n.letter_id),
    (select p.nickname from letters l join threads t on t.id = l.thread_id
       join profiles p on p.id = case when t.starter_id = l.sender_id then t.owner_id else t.starter_id end where l.id = n.letter_id),
    n.attempts;
end $$;

-- how it went: sent; failed (tried again after 1, then 5 minutes, 3 tries in all); or skipped (not wanted any more)
create or replace function public.finish_email(p_id uuid, p_result text, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update email_notifications set
    status = case when p_result = 'sent' then 'sent' when p_result = 'skipped' then 'skipped' else 'failed' end,
    sent_at = case when p_result = 'sent' then now() else sent_at end,
    last_error = case when p_result = 'sent' then null else left(coalesce(p_error, p_result), 500) end,
    next_attempt_at = now() + make_interval(mins => case when attempts <= 1 then 1 else 5 end),
    updated_at = now()
  where id = p_id;
end $$;
revoke execute on function public.email_still_wanted(uuid) from public, anon, authenticated;
revoke execute on function public.claim_emails(int) from public, anon, authenticated;
revoke execute on function public.finish_email(uuid, text, text) from public, anon, authenticated;
grant execute on function public.email_still_wanted(uuid) to service_role;
grant execute on function public.claim_emails(int) to service_role;
grant execute on function public.finish_email(uuid, text, text) to service_role;

-- ---------------------------------------------------------------- storage: letter photos

-- (the two existing policies, the same rule — but only for folders that are a thread's id)
drop policy if exists "thread members upload letter photo" on storage.objects;
create policy "thread members upload letter photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'letters' and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              and public.is_thread_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "thread members view letter photo" on storage.objects;
create policy "thread members view letter photo" on storage.objects for select to authenticated
  using (bucket_id = 'letters' and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and public.is_thread_member(((storage.foldername(name))[1])::uuid));
-- a photo is the letter's: whoever is in a thread with a letter carrying it may see it (a matched letter's photo, kept
-- in its sender's outbox; Tori's in welcome/)
drop policy if exists "letter photo readable by its letter's two" on storage.objects;
create policy "letter photo readable by its letter's two" on storage.objects for select to authenticated
  using (bucket_id = 'letters' and exists (select 1 from public.letters l where l.photo_path = name and public.is_thread_member(l.thread_id)));
-- letters/outbox/<my id>/…: a letter's photo before it has a thread (Meet a new CatPal), mine to upload and see
drop policy if exists "upload own outbox photo" on storage.objects;
create policy "upload own outbox photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'letters' and (storage.foldername(name))[1] = 'outbox' and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists "own outbox photo readable" on storage.objects;
create policy "own outbox photo readable" on storage.objects for select to authenticated
  using (bucket_id = 'letters' and (storage.foldername(name))[1] = 'outbox' and (storage.foldername(name))[2] = auth.uid()::text);
