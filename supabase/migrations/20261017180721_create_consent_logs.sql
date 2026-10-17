-- Append-only: a historical record of what was accepted and when, not an
-- editable row. document: 'terms' | 'privacy' | 'health_data' | 'marketing_opt_in' | 'age_attestation'.
create table consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

alter table consent_logs enable row level security;

create policy "consent_logs: owner select" on consent_logs for select using (auth.uid() = user_id);
create policy "consent_logs: owner insert" on consent_logs for insert with check (auth.uid() = user_id);
