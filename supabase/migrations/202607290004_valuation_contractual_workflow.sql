-- Módulo II: flujo contractual de valorización.

alter table valuation_cases
  add column if not exists property_type text,
  add column if not exists address text,
  add column if not exists neighborhood text,
  add column if not exists homogeneous_area text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists rol text,
  add column if not exists land_area_m2 numeric,
  add column if not exists built_area_m2 numeric,
  add column if not exists useful_area_m2 numeric,
  add column if not exists terrace_area_m2 numeric,
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists parking_spaces integer,
  add column if not exists construction_year integer,
  add column if not exists floor_number integer,
  add column if not exists qualitative_factors jsonb not null default '{}'::jsonb,
  add column if not exists adjustment_total_pct numeric not null default 0,
  add column if not exists base_value_uf numeric,
  add column if not exists justification text,
  add column if not exists report_payload jsonb not null default '{}'::jsonb,
  add column if not exists version_number integer not null default 1,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists issued_at timestamptz;

alter table valuation_cases drop constraint if exists valuation_cases_status_check;
alter table valuation_cases add constraint valuation_cases_status_check
  check (status in ('draft','review','approved','issued'));

alter table valuation_comparables
  add column if not exists source_type text,
  add column if not exists source_reference text,
  add column if not exists transaction_date date,
  add column if not exists address text,
  add column if not exists neighborhood text,
  add column if not exists property_type text,
  add column if not exists useful_area_m2 numeric,
  add column if not exists built_area_m2 numeric,
  add column if not exists land_area_m2 numeric,
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  add column if not exists parking_spaces integer,
  add column if not exists price_uf numeric,
  add column if not exists price_uf_m2 numeric,
  add column if not exists selected boolean not null default true,
  add column if not exists exclusion_reason text,
  add column if not exists adjustment_pct numeric not null default 0,
  add column if not exists adjustment_notes text;

create table if not exists valuation_case_versions (
  id uuid primary key default gen_random_uuid(),
  valuation_case_id uuid not null references valuation_cases(id) on delete cascade,
  version_number integer not null,
  status text not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (valuation_case_id, version_number)
);

create table if not exists valuation_adjustment_catalog (
  code text primary key,
  label text not null,
  description text,
  min_pct numeric not null default -20,
  max_pct numeric not null default 20,
  active boolean not null default true,
  sort_order integer not null default 0
);

insert into valuation_adjustment_catalog (code,label,description,min_pct,max_pct,sort_order) values
('condition','Estado de conservación','Estado general y mantenciones visibles.',-20,20,10),
('remodeling','Remodelaciones','Calidad y vigencia de remodelaciones.',-15,20,20),
('orientation','Orientación','Impacto de orientación y asoleamiento.',-10,10,30),
('floor','Piso','Impacto de altura y accesibilidad.',-10,12,40),
('light','Luminosidad','Nivel de iluminación natural.',-10,12,50),
('view','Vista','Calidad y permanencia de la vista.',-15,20,60),
('noise','Ruido','Exposición a ruido vial o ambiental.',-20,5,70),
('commercial_potential','Potencial comercial','Potencial de uso o reconversión comercial.',-10,20,80)
on conflict (code) do update set label=excluded.label,description=excluded.description,min_pct=excluded.min_pct,max_pct=excluded.max_pct,active=true,sort_order=excluded.sort_order;

create or replace function valuation_case_effective_value(p_case_id uuid)
returns table(base_value_uf numeric, adjustment_total_pct numeric, estimated_value_uf numeric, low_value_uf numeric, high_value_uf numeric)
language sql
stable
security invoker
set search_path=public
as $$
  select
    vc.base_value_uf,
    vc.adjustment_total_pct,
    round(vc.base_value_uf * (1 + vc.adjustment_total_pct / 100.0), 2),
    round(vc.base_value_uf * (1 + vc.adjustment_total_pct / 100.0) * 0.95, 2),
    round(vc.base_value_uf * (1 + vc.adjustment_total_pct / 100.0) * 1.05, 2)
  from valuation_cases vc where vc.id=p_case_id;
$$;

alter table valuation_case_versions enable row level security;
alter table valuation_adjustment_catalog enable row level security;

create policy "authenticated users read valuation versions" on valuation_case_versions for select to authenticated using (true);
create policy "authenticated users insert valuation versions" on valuation_case_versions for insert to authenticated with check (true);
create policy "authenticated users read adjustment catalog" on valuation_adjustment_catalog for select to authenticated using (true);

create index if not exists valuation_cases_status_idx on valuation_cases(status);
create index if not exists valuation_cases_neighborhood_idx on valuation_cases(neighborhood);
create index if not exists valuation_comparables_case_selected_idx on valuation_comparables(valuation_case_id,selected);
create index if not exists valuation_case_versions_case_idx on valuation_case_versions(valuation_case_id,version_number desc);
