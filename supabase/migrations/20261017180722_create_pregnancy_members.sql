-- Future-proofing for partner-as-real-user access; one row per pregnancy
-- today. Other tables still gate on user_id directly (see Step 3 of
-- BACKEND.md) — swap to membership checks once invite/login flow exists.
create table pregnancy_members (
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (pregnancy_id, user_id)
);

alter table pregnancy_members enable row level security;

create policy "pregnancy_members: member or owner select" on pregnancy_members for select
  using (auth.uid() = user_id or auth.uid() in (select user_id from pregnancies where id = pregnancy_id));

create policy "pregnancy_members: owner manages" on pregnancy_members for all
  using (auth.uid() in (select user_id from pregnancies where id = pregnancy_id))
  with check (auth.uid() in (select user_id from pregnancies where id = pregnancy_id));
