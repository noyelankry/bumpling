-- The original starter-template policies on the 'avatars' bucket never got
-- scoped once this became a real product: the select policy references
-- storage.allow_any_operation(), which isn't a real Supabase function (so
-- that policy silently fails closed), and the insert policy has no owner
-- check at all — any authenticated user could write to any path. Replace
-- both with a standard "owner writes under their own user-id folder, anyone
-- can read" setup, matching the path convention the client now uses
-- (`${userId}/${filename}`).

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update their own avatar." on storage.objects;

create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars: owner insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
