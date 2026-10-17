drop table if exists food_logs;

alter table profiles
  drop column if exists height_cm,
  drop column if exists weight_kg,
  drop column if exists age;
