create table pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lmp_date date not null,
  mode text not null check (mode in ('booked', 'catchup')),
  created_at timestamptz not null default now()
);

alter table pregnancies enable row level security;

create policy "pregnancies: owner select" on pregnancies for select using (auth.uid() = user_id);
create policy "pregnancies: owner insert" on pregnancies for insert with check (auth.uid() = user_id);
create policy "pregnancies: owner update" on pregnancies for update using (auth.uid() = user_id);
create policy "pregnancies: owner delete" on pregnancies for delete using (auth.uid() = user_id);
