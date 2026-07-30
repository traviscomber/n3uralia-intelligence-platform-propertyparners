-- Administración, carga conciliada y auditoría del Módulo III.

create table if not exists management_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_reference text,
  period_start date not null,
  period_end date not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','completed_with_warnings','failed')),
  rows_received integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_rejected integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  requested_by uuid references profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists management_change_log (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  entity_id text not null,
  action text not null check (action in ('create','update','delete','acknowledge','resolve','dismiss','import')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists management_import_runs_created_idx on management_import_runs(created_at desc);
create index if not exists management_change_log_entity_idx on management_change_log(entity_name, entity_id, changed_at desc);

alter table management_import_runs enable row level security;
alter table management_change_log enable row level security;

create policy "management leaders read import runs" on management_import_runs for select to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders create import runs" on management_import_runs for insert to authenticated with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders update import runs" on management_import_runs for update to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "executives read management change log" on management_change_log for select to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders insert change log" on management_change_log for insert to authenticated with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
