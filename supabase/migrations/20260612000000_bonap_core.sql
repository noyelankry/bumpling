-- Extend profiles with onboarding fields
alter table profiles
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists age int,
  add column if not exists sex text check (sex in ('male', 'female', 'other')),
  add column if not exists activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  add column if not exists dietary_restrictions text[] default '{}',
  add column if not exists onboarding_completed boolean default false;

-- Goal profiles (macro configurations)
create table goal_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  phase text not null check (phase in ('cutting', 'maintaining', 'gaining', 'custom')),
  calories_limit int not null,
  protein_target int not null,
  fiber_target int not null,
  carbs_limit int,
  fat_limit int,
  duration_weeks int,
  is_active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table goal_profiles enable row level security;

create policy "Users can manage their own goal profiles." on goal_profiles
  for all using (auth.uid() = user_id);

-- Ensure only one active profile per user
create unique index one_active_profile_per_user
  on goal_profiles (user_id)
  where is_active = true;
