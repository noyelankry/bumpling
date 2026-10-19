-- The original starter template's "Public profiles are viewable by
-- everyone" policy meant any signed-in user could read every other user's
-- full_name/username via the anon key. Wrong default for a pregnancy app —
-- tighten to owner-only, matching every other table's RLS.
drop policy if exists "Public profiles are viewable by everyone." on profiles;

create policy "profiles: owner select" on profiles
  for select using (auth.uid() = id);
