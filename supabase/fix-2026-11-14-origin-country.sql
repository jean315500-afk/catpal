-- ================================================================ 2026-11-14 Where you're from, apart from where you are
-- "출신 국가와 현재 위치는 별도 데이터로": a profile's country of origin, chosen by its owner on the Passport. Letters
-- carry the postmark and stamp of where their sender is FROM (origin_country); where they ARE (the existing `country`)
-- stays what the map uses — routes, distances, how long a letter flies.
--
-- Run once in the Supabase SQL Editor after schema.sql (safe to re-run). Additive only: one new nullable column and a
-- check on it; no existing table, column, policy or row is changed or removed. Null means "the same as country", so
-- every existing profile keeps showing exactly what it shows today.
--
-- Readable like the rest of a profile (the "profiles readable" policy: any signed-in user); written only by its owner
-- (the existing "own profile insert" / "own profile update" policies cover the new column too).
--
-- The app works before this is run: it reads and saves profiles without the column then (everyone's origin is where
-- they are, and the Passport's choice isn't kept), and picks the column up once it's there.
--
-- To undo: alter table public.profiles drop column if exists origin_country;

alter table public.profiles add column if not exists origin_country text;

do $$ begin
  alter table public.profiles add constraint profiles_origin_country_code check (origin_country is null or origin_country ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
