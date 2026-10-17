create table brain_dump_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  details text,
  kind text not null check (kind in ('thought', 'doctor')),
  tags text[] not null default '{}',
  linked_appointment_id text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table brain_dump_entries enable row level security;

create policy "brain_dump_entries: owner select" on brain_dump_entries for select using (auth.uid() = user_id);
create policy "brain_dump_entries: owner insert" on brain_dump_entries for insert with check (auth.uid() = user_id);
create policy "brain_dump_entries: owner update" on brain_dump_entries for update using (auth.uid() = user_id);
create policy "brain_dump_entries: owner delete" on brain_dump_entries for delete using (auth.uid() = user_id);
