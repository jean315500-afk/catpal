-- ================================================================ 2026-11-04 CatPal Plus
-- For the paid plan's three things. Run once in the Supabase SQL Editor after schema.sql (safe to re-run). Additive only:
-- three new nullable / defaulted columns; no existing table, column, policy or row is changed or removed.
--
--   letters.fast          a fast bird carried it: it lands in a quarter of the time
--   letters.chosen_stamp  the stamp the sender picked (the one its envelope wears); none: the country's own, as before
--   profiles.cat_traits   what the cat is like (a few words picked on its profile), for "a cat like mine". Readable like
--                         the rest of a profile (any signed-in user); written only by its owner (the existing policies)
--
-- The app works before this is run: letters go out as usual (no fast bird is used up) and matching leaves traits out.
--
-- NOT DONE HERE, needed before real money: payment isn't connected, and nothing on the server checks that a sender has
-- paid. Who has the plan, and how many birds, must then live on the server (written by the payment webhook only), with
-- letters.fast / chosen_stamp checked against it.

alter table public.letters add column if not exists fast boolean not null default false;
alter table public.letters add column if not exists chosen_stamp smallint;
alter table public.profiles add column if not exists cat_traits text[];

do $$ begin
  alter table public.letters add constraint letters_chosen_stamp_range check (chosen_stamp is null or chosen_stamp between 0 and 7);
exception when duplicate_object then null; end $$;
