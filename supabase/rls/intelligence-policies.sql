-- N3uralia Intelligence RLS policies foundation

-- Enable RLS on intelligence tables
alter table if exists properties enable row level security;
alter table if exists sales enable row level security;
alter table if exists evidence enable row level security;
alter table if exists decisions enable row level security;
alter table if exists market_signals enable row level security;

-- Organization scoped access pattern
-- Apply organization_id matching against authenticated profile

create policy "properties organization access"
on properties
for select
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "sales organization access"
on sales
for select
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "evidence organization access"
on evidence
for select
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "decisions executive access"
on decisions
for select
using (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('ceo', 'director')
  )
);
