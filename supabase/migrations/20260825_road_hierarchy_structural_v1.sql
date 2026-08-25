-- Road hierarchy structural evidence v1.
-- Non-binding by design: this layer must not alter Champion weights until backtested.

create table if not exists public.valuation_road_hierarchy_samples (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  nearest_road_name text,
  highway_class text not null,
  hierarchy_rank smallint not null check (hierarchy_rank between 1 and 9),
  distance_to_road_m numeric not null check (distance_to_road_m >= 0),
  distance_to_arterial_m numeric check (distance_to_arterial_m is null or distance_to_arterial_m >= 0),
  access_context text,
  source_name text not null,
  source_version text not null,
  source_observed_at timestamptz not null,
  source_url text,
  methodology text not null default 'nearest_osm_highway_and_arterial_distance',
  metadata jsonb not null default '{}'::jsonb,
  location geography(Point,4326) generated always as
    (st_setsrid(st_makepoint(longitude,latitude),4326)::geography) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists valuation_road_hierarchy_sample_version_uidx
  on public.valuation_road_hierarchy_samples
  (round(latitude::numeric,6), round(longitude::numeric,6), source_name, source_version);
create index if not exists valuation_road_hierarchy_samples_location_gix
  on public.valuation_road_hierarchy_samples using gist(location);

alter table public.valuation_road_hierarchy_samples enable row level security;
revoke all on public.valuation_road_hierarchy_samples from public, anon, authenticated;
grant select, insert, update, delete on public.valuation_road_hierarchy_samples to service_role;

create or replace function public.valuation_road_hierarchy_lookup_v1(
  p_lat double precision,
  p_lon double precision,
  p_max_distance_m numeric default 150
) returns jsonb
language sql stable security definer
set search_path=public,extensions
as $$
with target as (
  select st_setsrid(st_makepoint(p_lon,p_lat),4326)::geography g
), ranked as (
  select s.*, st_distance(s.location,target.g) sample_distance_m
  from public.valuation_road_hierarchy_samples s cross join target
  where st_dwithin(s.location,target.g,greatest(coalesce(p_max_distance_m,150),1))
  order by st_distance(s.location,target.g), s.source_observed_at desc
  limit 1
)
select case when exists(select 1 from ranked) then
  (select jsonb_build_object(
    'available',true,
    'sampleId',id,
    'nearestRoadName',nearest_road_name,
    'highwayClass',highway_class,
    'hierarchyRank',hierarchy_rank,
    'distanceToRoadM',distance_to_road_m,
    'distanceToArterialM',distance_to_arterial_m,
    'accessContext',access_context,
    'sampleDistanceM',round(sample_distance_m::numeric,1),
    'sourceName',source_name,
    'sourceVersion',source_version,
    'sourceObservedAt',source_observed_at,
    'methodology',methodology,
    'nonBinding',true,
    'valuationAdjustmentPct',0,
    'changesChampionWeights',false,
    'status','structural_evidence_only'
  ) from ranked)
else jsonb_build_object(
  'available',false,
  'reason','no_versioned_road_hierarchy_sample',
  'nonBinding',true,
  'valuationAdjustmentPct',0,
  'changesChampionWeights',false
) end;
$$;

revoke all on function public.valuation_road_hierarchy_lookup_v1(double precision,double precision,numeric) from public,anon;
grant execute on function public.valuation_road_hierarchy_lookup_v1(double precision,double precision,numeric) to authenticated,service_role;
