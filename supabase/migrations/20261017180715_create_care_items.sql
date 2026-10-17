-- id stays text (not uuid): default items are looked up against i18n keys by
-- their literal id (carePlan:${item.id}), and custom items use `custom-${Date.now()}`.
create table care_items (
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  window_start_week numeric not null,
  window_end_week numeric not null,
  booking_lead_days numeric not null,
  scheduled_at timestamptz,
  scheduled_time_label text,
  location text,
  prep_note text,
  visit_notes text,
  done boolean not null default false,
  done_at timestamptz,
  skipped boolean not null default false,
  skipped_at timestamptz,
  custom boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (pregnancy_id, id)
);

alter table care_items enable row level security;

create policy "care_items: owner select" on care_items for select using (auth.uid() = user_id);
create policy "care_items: owner insert" on care_items for insert with check (auth.uid() = user_id);
create policy "care_items: owner update" on care_items for update using (auth.uid() = user_id);
create policy "care_items: owner delete" on care_items for delete using (auth.uid() = user_id);
