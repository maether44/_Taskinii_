-- Training plans table: stores one AI-generated plan per user
create table if not exists public.training_plans (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  plan_json  jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.training_plans enable row level security;

create policy "Users can read own plan"
  on public.training_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own plan"
  on public.training_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plan"
  on public.training_plans for update
  using (auth.uid() = user_id);
