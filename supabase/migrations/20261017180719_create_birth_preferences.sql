-- jsonb mirrors the existing { answers, supportContacts } shape exactly —
-- nothing queries across users by topic, so normalizing into rows buys nothing.
create table birth_preferences (
  pregnancy_id uuid primary key references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  support_contacts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table birth_preferences enable row level security;

create policy "birth_preferences: owner select" on birth_preferences for select using (auth.uid() = user_id);
create policy "birth_preferences: owner insert" on birth_preferences for insert with check (auth.uid() = user_id);
create policy "birth_preferences: owner update" on birth_preferences for update using (auth.uid() = user_id);
create policy "birth_preferences: owner delete" on birth_preferences for delete using (auth.uid() = user_id);
