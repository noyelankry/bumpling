-- profiles.id -> auth.users(id) predates the rest of the schema and was
-- never set to cascade, so deleting an auth.users row would otherwise fail
-- with a foreign key violation. Fix that, then expose self-service deletion
-- as a security definer RPC per BACKEND.md Section 9 (no service_role key
-- needed client-side; auth.uid() scopes it to the caller's own account).
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;
