-- ================================================================ 2026-10-28 A cat's short intro on the profile
-- "간단한 고양이 소개": a line or two about your cat, written with the first letter (its profile step) and edited on the
-- Passport. Run once in the Supabase SQL Editor after schema.sql (safe to re-run). Additive only: one new nullable
-- column; no existing table, column, policy or row is changed or removed.
--
-- Readable like the rest of a profile (the "profiles readable" policy: any signed-in user); written only by its owner
-- (the existing "own profile insert" / "own profile update" policies cover the new column too).
--
-- The app works before this is run: it saves and reads the profile without the intro then (and keeps the intro on the
-- device only), and picks the column up once it's there.

alter table public.profiles add column if not exists intro text;

do $$ begin
  alter table public.profiles add constraint profiles_intro_len check (intro is null or char_length(intro) <= 120);
exception when duplicate_object then null; end $$;
