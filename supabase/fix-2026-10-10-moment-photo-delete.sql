-- CatPal fix (2026-10-10): let owners delete their own moment photos.
-- Without a SELECT policy, Storage silently skips the delete and the photo stays
-- public after its moment is deleted. Safe to re-run. Already included in schema.sql.
drop policy if exists "owner reads own moment photo" on storage.objects;
create policy "owner reads own moment photo" on storage.objects for select to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
