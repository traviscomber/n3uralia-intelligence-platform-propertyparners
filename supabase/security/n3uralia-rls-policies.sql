-- N3uralia RLS security foundation

alter table companies enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table clients enable row level security;
alter table intelligence_evidence enable row level security;
alter table strategic_decisions enable row level security;
alter table executive_memory enable row level security;
alter table audit_logs enable row level security;

-- Company isolation policy foundation
create policy "users access own company"
on companies
for select
using (
  id in (
    select company_id from profiles
    where id = auth.uid()
  )
);

-- Executive data visibility foundation
create policy "company intelligence access"
on intelligence_evidence
for select
using (
  company_id in (
    select company_id from profiles
    where id = auth.uid()
  )
);

-- Decisions follow governance permissions
create policy "strategic decisions company access"
on strategic_decisions
for select
using (
  company_id in (
    select company_id from profiles
    where id = auth.uid()
  )
);

-- Audit logs are visible only inside company scope
create policy "audit company access"
on audit_logs
for select
using (
  company_id in (
    select company_id from profiles
    where id = auth.uid()
  )
);
