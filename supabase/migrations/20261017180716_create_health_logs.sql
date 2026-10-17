create table health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_id uuid references pregnancies(id) on delete cascade,
  log_date date not null,
  mood text check (mood in ('happy', 'calm', 'okay', 'tired', 'anxious')),
  symptoms text[] not null default '{}',
  note text,
  weight text,
  blood_pressure text,
  logged_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table health_logs enable row level security;

create policy "health_logs: owner select" on health_logs for select using (auth.uid() = user_id);
create policy "health_logs: owner insert" on health_logs for insert with check (auth.uid() = user_id);
create policy "health_logs: owner update" on health_logs for update using (auth.uid() = user_id);
create policy "health_logs: owner delete" on health_logs for delete using (auth.uid() = user_id);
