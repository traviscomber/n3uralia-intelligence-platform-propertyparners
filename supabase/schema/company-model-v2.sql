-- N3uralia Company Model v2
-- Based on real company structure:
-- Directorio -> CEO -> Sucursales/Unidades -> Partners/Ejecutivas

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists territories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists market_signals (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references territories(id),
  signal text,
  source text,
  created_at timestamptz default now()
);

create table if not exists valuation_models (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  methodology text,
  confidence numeric,
  created_at timestamptz default now()
);
