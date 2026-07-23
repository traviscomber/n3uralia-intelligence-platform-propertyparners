create extension if not exists pgcrypto;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  status text not null default 'queued',
  title text not null,
  instructions text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  confidence numeric,
  error_message text,
  requested_by uuid not null default auth.uid() references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  idempotency_key text,
  constraint agent_runs_agent_key_check check (agent_key in ('market_intelligence','valuation','executive_reports')),
  constraint agent_runs_status_check check (status in ('draft','queued','running','needs_review','approved','rejected','failed','completed','cancelled'))
);

create unique index if not exists agent_runs_idempotency_idx on public.agent_runs(requested_by, agent_key, idempotency_key) where idempotency_key is not null;
create index if not exists agent_runs_created_at_idx on public.agent_runs(created_at desc);
create index if not exists agent_runs_status_idx on public.agent_runs(status);

create table if not exists public.agent_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  source_type text not null,
  source_name text not null,
  source_url text,
  source_table text,
  source_record_id text,
  observed_at timestamptz,
  freshness_status text not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_sources_freshness_check check (freshness_status in ('current','stale','unknown'))
);

create table if not exists public.agent_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  finding_type text not null,
  title text not null,
  summary text not null,
  severity text not null default 'info',
  confidence numeric,
  evidence jsonb not null default '[]'::jsonb,
  dimensions jsonb not null default '{}'::jsonb,
  approval_status text not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_findings_severity_check check (severity in ('info','opportunity','warning','critical')),
  constraint agent_findings_approval_check check (approval_status in ('pending','approved','rejected'))
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  finding_id uuid references public.agent_findings(id) on delete cascade,
  decision text not null,
  notes text,
  decided_by uuid not null default auth.uid() references public.profiles(id),
  decided_at timestamptz not null default now(),
  constraint agent_approvals_decision_check check (decision in ('approved','rejected','changes_requested'))
);

create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  version integer not null default 1,
  storage_path text,
  content jsonb not null default '{}'::jsonb,
  checksum text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(run_id, artifact_type, version)
);

create table if not exists public.agent_schedules (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  name text not null,
  cron_expression text not null,
  timezone text not null default 'America/Santiago',
  input jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_schedules_agent_key_check check (agent_key in ('market_intelligence','valuation','executive_reports'))
);

alter table public.agent_runs enable row level security;
alter table public.agent_sources enable row level security;
alter table public.agent_findings enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_schedules enable row level security;
