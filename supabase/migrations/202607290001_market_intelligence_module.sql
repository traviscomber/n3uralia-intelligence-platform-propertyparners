-- Módulo I: Inteligencia de Mercado
-- Modelo canónico, historial, deduplicación, vínculos y métricas contractuales.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

create table if not exists market_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  source_type text not null check (source_type in ('portal','cbrs','kml','client','other')),
  file_name text,
  file_hash text,
  imported_at timestamptz not null default now(),
  period_start date,
  period_end date,
  row_count integer not null default 0,
  status text not null default 'active' check (status in ('active','quarantined','superseded')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists market_neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  micro_neighborhood text,
  geometry jsonb,
  geometry_source_id uuid references market_sources(id),
  assignment_status text not null default 'exact' check (assignment_status in ('exact','ambiguous','outside','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_properties (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  property_type text check (property_type in ('Casa','Departamento','Proyecto','Otro')),
  normalized_address text,
  street_name text,
  street_number text,
  unit_number text,
  rol text,
  latitude numeric,
  longitude numeric,
  neighborhood_id uuid references market_neighborhoods(id),
  land_area_m2 numeric,
  built_area_m2 numeric,
  useful_area_m2 numeric,
  bedrooms integer,
  bathrooms integer,
  parking_spaces integer,
  construction_year integer,
  identity_status text not null default 'candidate' check (identity_status in ('candidate','confirmed','rejected','needs_review')),
  identity_confidence numeric check (identity_confidence between 0 and 1),
  identity_evidence jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_properties_rol_idx on market_properties (rol) where rol is not null;
create index if not exists market_properties_coordinates_idx on market_properties (latitude, longitude);
create index if not exists market_properties_neighborhood_idx on market_properties (neighborhood_id);

create table if not exists market_listings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references market_sources(id),
  source_listing_id text not null,
  property_id uuid references market_properties(id),
  operation text check (operation in ('Venta','Arriendo','Sin confirmar')),
  status text not null default 'observed' check (status in ('observed','active','inactive','sold','removed','quarantined')),
  url text,
  title text,
  raw_address text,
  normalized_address text,
  latitude numeric,
  longitude numeric,
  price_clp numeric,
  price_uf numeric,
  price_uf_m2 numeric,
  published_at timestamptz,
  observed_at timestamptz not null,
  removed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, source_listing_id, observed_at)
);

create index if not exists market_listings_property_idx on market_listings (property_id);
create index if not exists market_listings_observed_idx on market_listings (observed_at);
create index if not exists market_listings_status_idx on market_listings (status);

create table if not exists market_transactions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references market_sources(id),
  event_key text not null unique,
  asset_key text,
  property_id uuid references market_properties(id),
  rol text,
  transaction_date date,
  price_clp numeric,
  price_uf numeric,
  price_uf_m2 numeric,
  description text,
  tomo text,
  foja text,
  numero text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_transactions_property_idx on market_transactions (property_id);
create index if not exists market_transactions_date_idx on market_transactions (transaction_date);

create table if not exists market_property_matches (
  id uuid primary key default gen_random_uuid(),
  left_entity_type text not null check (left_entity_type in ('listing','transaction','property')),
  left_entity_id uuid not null,
  right_entity_type text not null check (right_entity_type in ('listing','transaction','property')),
  right_entity_id uuid not null,
  score numeric not null check (score between 0 and 1),
  status text not null check (status in ('candidate_high','candidate_medium','rejected','confirmed')),
  evidence jsonb not null default '[]'::jsonb,
  contradictions jsonb not null default '[]'::jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (left_entity_type, left_entity_id, right_entity_type, right_entity_id)
);

create table if not exists market_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  neighborhood_id uuid references market_neighborhoods(id),
  property_type text,
  active_inventory integer,
  new_listings integer,
  removed_listings integer,
  confirmed_sales integer,
  median_days_on_market numeric,
  absorption_rate numeric,
  offer_to_sales_ratio numeric,
  source_ids uuid[] not null default '{}',
  methodology_version text not null,
  generated_at timestamptz not null default now(),
  unique (period_start, period_end, neighborhood_id, property_type, methodology_version)
);

create or replace view market_listing_history as
select
  l.property_id,
  l.source_listing_id,
  min(l.observed_at) as first_seen_at,
  max(l.observed_at) as last_seen_at,
  min(l.price_uf) filter (where l.price_uf is not null) as minimum_price_uf,
  max(l.price_uf) filter (where l.price_uf is not null) as maximum_price_uf,
  count(*) as observation_count,
  bool_or(l.status = 'active') as currently_active,
  max(l.removed_at) as removed_at
from market_listings l
group by l.property_id, l.source_listing_id;

create or replace view market_property_lifecycle as
select
  p.id as property_id,
  p.canonical_key,
  p.property_type,
  p.neighborhood_id,
  min(h.first_seen_at) as first_published_at,
  max(h.last_seen_at) as last_observed_at,
  max(h.removed_at) as removed_at,
  min(t.transaction_date) as first_confirmed_sale_date,
  case
    when min(t.transaction_date) is not null and min(h.first_seen_at) is not null
      then greatest(0, min(t.transaction_date) - min(h.first_seen_at)::date)
    else null
  end as days_on_market
from market_properties p
left join market_listing_history h on h.property_id = p.id
left join market_transactions t on t.property_id = p.id
group by p.id, p.canonical_key, p.property_type, p.neighborhood_id;

alter table market_sources enable row level security;
alter table market_neighborhoods enable row level security;
alter table market_properties enable row level security;
alter table market_listings enable row level security;
alter table market_transactions enable row level security;
alter table market_property_matches enable row level security;
alter table market_metric_snapshots enable row level security;

create policy "authenticated users read market sources" on market_sources for select to authenticated using (true);
create policy "authenticated users read neighborhoods" on market_neighborhoods for select to authenticated using (true);
create policy "authenticated users read market properties" on market_properties for select to authenticated using (true);
create policy "authenticated users read listings" on market_listings for select to authenticated using (true);
create policy "authenticated users read transactions" on market_transactions for select to authenticated using (true);
create policy "authenticated users read matches" on market_property_matches for select to authenticated using (true);
create policy "authenticated users read snapshots" on market_metric_snapshots for select to authenticated using (true);
