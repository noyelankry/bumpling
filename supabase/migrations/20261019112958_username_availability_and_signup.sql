-- Case-insensitive uniqueness (so "Alice" and "alice" can't both exist) —
-- replaces the original plain `unique` constraint, which was case-sensitive.
alter table profiles drop constraint if exists profiles_username_key;
create unique index profiles_username_lower_idx on profiles (lower(username));

-- Public availability check, callable before a session exists (signup form,
-- while typing). Only returns a boolean — leaks no other profile data.
create or replace function username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists(
    select 1 from profiles where lower(username) = lower(check_username)
  );
$$;

revoke all on function username_available(text) from public;
grant execute on function username_available(text) to anon, authenticated;

-- Pass username through signUp's options.data so it lands on the profile
-- the moment auth.users gets its row — before any session/confirmation.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;
