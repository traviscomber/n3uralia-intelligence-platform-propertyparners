-- Copilot feedback and decision memory tables
-- Supports: CEO Copilot learning loop + decision outcome tracking

-- copilot_feedback: stores thumbs up/down + optional comment per question
create table if not exists copilot_feedback (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer_id    text,
  rating       text not null check (rating in ('up', 'down')),
  comment      text,
  context_sources text[],
  role         text,
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

-- RLS: users can insert their own feedback; service role reads all
alter table copilot_feedback enable row level security;

create policy "Users can insert own feedback"
  on copilot_feedback for insert
  with check (auth.uid() = user_id);

create policy "Service role reads all feedback"
  on copilot_feedback for select
  using (auth.role() = 'service_role');

-- decision_history already exists from company-knowledge-schema.sql
-- Add user_id and role columns if not already present
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'decision_history' and column_name = 'user_id'
  ) then
    alter table decision_history add column user_id uuid references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'decision_history' and column_name = 'role'
  ) then
    alter table decision_history add column role text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'decision_history' and column_name = 'recommendation'
  ) then
    alter table decision_history add column recommendation text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'decision_history' and column_name = 'expected_impact'
  ) then
    alter table decision_history add column expected_impact text;
  end if;
end $$;

-- RLS on decision_history
alter table decision_history enable row level security;

create policy "Users can insert own decisions"
  on decision_history for insert
  with check (auth.uid() = user_id);

create policy "Users can read own decisions"
  on decision_history for select
  using (auth.uid() = user_id);

create policy "Service role full access"
  on decision_history for all
  using (auth.role() = 'service_role');
