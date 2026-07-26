-- N3uralia Intelligence OS core schema foundation

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key,
  company_id uuid references companies(id),
  role text not null,
  created_at timestamptz default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  name text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists intelligence_evidence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  source text,
  content text,
  confidence numeric,
  validated boolean default false,
  created_at timestamptz default now()
);

create table if not exists strategic_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  decision text,
  context text,
  outcome text,
  created_at timestamptz default now()
);

create table if not exists executive_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  memory_type text,
  content jsonb,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  user_id uuid,
  action text,
  created_at timestamptz default now()
);
