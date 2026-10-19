-- Both functions already relied on auth.uid() being a real signed-in user
-- (NULL for anon, which makes delete_my_account's delete a no-op and
-- redeem_pregnancy_invite's insert hit a NOT NULL violation — neither is
-- actually exploitable) — but `revoke ... from public` doesn't remove a
-- direct grant to `anon`, which this project's default privileges add to
-- every new function automatically. Revoke it explicitly to match intent.
revoke execute on function delete_my_account() from anon;
revoke execute on function redeem_pregnancy_invite(text) from anon;
