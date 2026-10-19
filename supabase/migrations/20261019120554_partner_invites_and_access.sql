-- Invites are a separate table from pregnancy_members, not a direct insert
-- into it — the partner doesn't have a user_id yet when the invite is
-- created, only an email and a code. pregnancy_members only gets a row once
-- the code is actually redeemed by a real signed-in user.
create table pregnancy_invites (
  id uuid primary key default gen_random_uuid(),
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  invited_email text not null,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id)
);

alter table pregnancy_invites enable row level security;

-- Only the pregnancy owner can see or create invites for their own
-- pregnancy — a partner redeeming a code never needs to SELECT this table
-- directly, that happens inside the security-definer function below.
create policy "pregnancy_invites: owner select" on pregnancy_invites for select
  using (auth.uid() in (select user_id from pregnancies where id = pregnancy_id));
create policy "pregnancy_invites: owner insert" on pregnancy_invites for insert
  with check (auth.uid() = created_by and auth.uid() in (select user_id from pregnancies where id = pregnancy_id));
create policy "pregnancy_invites: owner delete" on pregnancy_invites for delete
  using (auth.uid() in (select user_id from pregnancies where id = pregnancy_id));

-- Redeeming needs to look up an invite by code for a user who isn't a
-- pregnancy_members row yet (that's the whole point), so it runs as
-- security definer rather than relying on the caller's own RLS visibility.
create or replace function redeem_pregnancy_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite pregnancy_invites%rowtype;
begin
  select * into invite from pregnancy_invites
    where code = upper(invite_code) and redeemed_at is null and expires_at > now();

  if invite.id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  insert into pregnancy_members (pregnancy_id, user_id, role, invited_at, accepted_at)
    values (invite.pregnancy_id, auth.uid(), 'partner', invite.created_at, now())
    on conflict (pregnancy_id, user_id) do update set accepted_at = now();

  update pregnancy_invites set redeemed_at = now(), redeemed_by = auth.uid() where id = invite.id;

  return invite.pregnancy_id;
end;
$$;

revoke all on function redeem_pregnancy_invite(text) from public;
grant execute on function redeem_pregnancy_invite(text) to authenticated;

-- Partner read access — scoped to exactly the three tables covering care
-- plan / appointments / birth preferences, per the explicit scope decision.
-- health_logs, brain_dump_entries (except shared entries, below),
-- mom_contacts, and partner_contacts itself all stay owner-only.
create policy "pregnancies: accepted partner select" on pregnancies for select
  using (exists (
    select 1 from pregnancy_members pm
    where pm.pregnancy_id = pregnancies.id and pm.user_id = auth.uid() and pm.accepted_at is not null
  ));

create policy "care_items: accepted partner select" on care_items for select
  using (exists (
    select 1 from pregnancy_members pm
    where pm.pregnancy_id = care_items.pregnancy_id and pm.user_id = auth.uid() and pm.accepted_at is not null
  ));

create policy "birth_preferences: accepted partner select" on birth_preferences for select
  using (exists (
    select 1 from pregnancy_members pm
    where pm.pregnancy_id = birth_preferences.pregnancy_id and pm.user_id = auth.uid() and pm.accepted_at is not null
  ));

-- Brain dump stays private by default — mom explicitly marks individual
-- entries shared, rather than opening the whole table to the partner.
alter table brain_dump_entries add column shared_with_partner boolean not null default false;

create policy "brain_dump_entries: accepted partner select shared" on brain_dump_entries for select
  using (
    shared_with_partner = true
    and exists (
      select 1 from pregnancies p
      join pregnancy_members pm on pm.pregnancy_id = p.id
      where p.user_id = brain_dump_entries.user_id and pm.user_id = auth.uid() and pm.accepted_at is not null
    )
  );
