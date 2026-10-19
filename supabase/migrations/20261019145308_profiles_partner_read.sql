-- Lets a partner see who they're connected to (mom's name) in their own
-- Profile screen — profiles was owner-only until now, same as the other
-- partner-scoped tables. Reuses is_accepted_partner_of_user(), already
-- built for brain_dump_entries' shared-notes policy: profiles.id IS the
-- user_id being checked, so no new helper function needed.
create policy "profiles: accepted partner select" on profiles for select
  using (is_accepted_partner_of_user(id));
