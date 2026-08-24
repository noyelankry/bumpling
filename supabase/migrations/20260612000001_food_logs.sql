create table food_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  logged_date date not null default current_date,
  meal_block text not null check (meal_block in ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_name text not null,
  calories int not null default 0,
  protein_g numeric(6,1) default 0,
  carbs_g numeric(6,1) default 0,
  fat_g numeric(6,1) default 0,
  fiber_g numeric(6,1) default 0,
  created_at timestamp with time zone default now()
);

alter table food_logs enable row level security;

create policy "Users can manage their own food logs." on food_logs
  for all using (auth.uid() = user_id);

create index food_logs_user_date on food_logs (user_id, logged_date);
