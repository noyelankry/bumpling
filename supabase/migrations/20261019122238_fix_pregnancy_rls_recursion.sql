-- The partner-access migration introduced a genuine circular RLS
-- dependency: pregnancies' partner-select policy subqueries
-- pregnancy_members, whose own select policy subqueries pregnancies right
-- back — infinite recursion, surfacing to the app as a 500 on any query
-- that touches pregnancies (including hasLMP(), which then silently reads
-- as "not set" since the query just errors instead of returning data).
--
-- Fix: security-definer helper functions. Querying another RLS-protected
-- table from inside a security-definer function runs as the function's
-- owner (postgres, which bypasses RLS by default), so the membership check
-- never re-enters RLS evaluation and the cycle can't form.

create or replace function is_pregnancy_owner(check_pregnancy_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from pregnancies where id = check_pregnancy_id and user_id = auth.uid());
$$;

create or replace function is_accepted_pregnancy_member(check_pregnancy_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from pregnancy_members
    where pregnancy_id = check_pregnancy_id and user_id = auth.uid() and accepted_at is not null
  );
$$;

create or replace function is_accepted_partner_of_user(owner_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from pregnancies p
    join pregnancy_members pm on pm.pregnancy_id = p.id
    where p.user_id = owner_user_id and pm.user_id = auth.uid() and pm.accepted_at is not null
  );
$$;

revoke all on function is_pregnancy_owner(uuid) from public;
revoke all on function is_accepted_pregnancy_member(uuid) from public;
revoke all on function is_accepted_partner_of_user(uuid) from public;
grant execute on function is_pregnancy_owner(uuid) to authenticated;
grant execute on function is_accepted_pregnancy_member(uuid) to authenticated;
grant execute on function is_accepted_partner_of_user(uuid) to authenticated;
-- This project's default privileges auto-grant new functions to `anon` too
-- (same gap found on delete_my_account/redeem_pregnancy_invite); harmless
-- here since auth.uid() is NULL for anon and every function just returns
-- false, but revoke explicitly anyway to match intent.
revoke execute on function is_pregnancy_owner(uuid) from anon;
revoke execute on function is_accepted_pregnancy_member(uuid) from anon;
revoke execute on function is_accepted_partner_of_user(uuid) from anon;

-- pregnancy_members: replace the direct `pregnancies` subquery with the helper.
drop policy if exists "pregnancy_members: member or owner select" on pregnancy_members;
create policy "pregnancy_members: member or owner select" on pregnancy_members for select
  using (auth.uid() = user_id or is_pregnancy_owner(pregnancy_id));

drop policy if exists "pregnancy_members: owner manages" on pregnancy_members;
create policy "pregnancy_members: owner manages" on pregnancy_members for all
  using (is_pregnancy_owner(pregnancy_id))
  with check (is_pregnancy_owner(pregnancy_id));

-- pregnancy_invites: same pattern, for consistency (wasn't actually circular,
-- since invites don't get queried from inside pregnancies' own policy, but
-- keeping every cross-table check on the same helper-function pattern).
drop policy if exists "pregnancy_invites: owner select" on pregnancy_invites;
create policy "pregnancy_invites: owner select" on pregnancy_invites for select
  using (is_pregnancy_owner(pregnancy_id));

drop policy if exists "pregnancy_invites: owner insert" on pregnancy_invites;
create policy "pregnancy_invites: owner insert" on pregnancy_invites for insert
  with check (auth.uid() = created_by and is_pregnancy_owner(pregnancy_id));

drop policy if exists "pregnancy_invites: owner delete" on pregnancy_invites;
create policy "pregnancy_invites: owner delete" on pregnancy_invites for delete
  using (is_pregnancy_owner(pregnancy_id));

-- pregnancies / care_items / birth_preferences: replace the direct
-- pregnancy_members subquery with the helper — this was the actual cycle.
drop policy if exists "pregnancies: accepted partner select" on pregnancies;
create policy "pregnancies: accepted partner select" on pregnancies for select
  using (is_accepted_pregnancy_member(id));

drop policy if exists "care_items: accepted partner select" on care_items;
create policy "care_items: accepted partner select" on care_items for select
  using (is_accepted_pregnancy_member(pregnancy_id));

drop policy if exists "birth_preferences: accepted partner select" on birth_preferences;
create policy "birth_preferences: accepted partner select" on birth_preferences for select
  using (is_accepted_pregnancy_member(pregnancy_id));

-- brain_dump_entries: same cycle risk (its shared-select policy subqueried
-- both pregnancies and pregnancy_members directly) — replace with the helper.
drop policy if exists "brain_dump_entries: accepted partner select shared" on brain_dump_entries;
create policy "brain_dump_entries: accepted partner select shared" on brain_dump_entries for select
  using (shared_with_partner = true and is_accepted_partner_of_user(user_id));
