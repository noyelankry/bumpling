create table partner_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  updated_at timestamptz not null default now()
);

alter table partner_contacts enable row level security;

create policy "partner_contacts: owner all" on partner_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table mom_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

alter table mom_contacts enable row level security;

create policy "mom_contacts: owner all" on mom_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
