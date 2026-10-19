-- delete_my_account() does `delete from auth.users where id = auth.uid()`,
-- which Postgres rejects if ANY foreign key referencing auth.users(id) has
-- no ON DELETE behavior (the default is NO ACTION, i.e. block the delete).
-- pregnancy_invites.redeemed_by was missing one — a partner is exactly the
-- user referenced there once they redeem a code, so their own account
-- deletion was failing on this constraint. SET NULL, not CASCADE: the
-- invite row itself (code, who sent it, when) stays as a record even once
-- the person who redeemed it is gone.
alter table pregnancy_invites drop constraint pregnancy_invites_redeemed_by_fkey;
alter table pregnancy_invites add constraint pregnancy_invites_redeemed_by_fkey
  foreign key (redeemed_by) references auth.users(id) on delete set null;

-- goal_profiles was Bon Appétit leftover missed by the original cleanup
-- migration (20261017180713_drop_bonap_leftovers.sql dropped food_logs and
-- the stray profiles columns, but not this table) — same risk as above
-- (its own user_id FK had no ON DELETE rule either), confirmed empty and
-- unreferenced anywhere in the app before dropping.
drop table if exists goal_profiles;
