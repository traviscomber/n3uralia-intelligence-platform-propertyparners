-- Programación y distribución registrada para reportes contractuales.

create table if not exists management_report_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null check (report_type in ('executive','office','partner','monthly','cumulative')),
  entity_id uuid references management_entities(id) on delete cascade,
  cadence text not null check (cadence in ('monthly','quarterly','yearly')),
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  recipients jsonb not null default '[]'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists management_report_distributions (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references management_report_runs(id) on delete cascade,
  recipient text not null,
  channel text not null default 'email' check (channel in ('email','download','manual')),
  status text not null default 'pending' check (status in ('pending','sent','failed','acknowledged')),
  external_reference text,
  error_message text,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (report_run_id, recipient, channel)
);

create index if not exists management_report_schedules_next_idx on management_report_schedules(active,next_run_at);
create index if not exists management_report_distributions_report_idx on management_report_distributions(report_run_id,status);

alter table management_report_schedules enable row level security;
alter table management_report_distributions enable row level security;

create policy "management leaders read report schedules" on management_report_schedules for select to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "executives manage report schedules" on management_report_schedules for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo'));
create policy "management leaders read report distributions" on management_report_distributions for select to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders manage report distributions" on management_report_distributions for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
