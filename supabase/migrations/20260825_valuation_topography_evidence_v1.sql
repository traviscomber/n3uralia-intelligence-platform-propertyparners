create table if not exists public.valuation_topography_samples (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  elevation_m numeric not null,
  slope_pct numeric,
  slope_degrees numeric,
  aspect_degrees numeric,
  sample_radius_m numeric not null default 30 check (sample_radius_m > 0),
  source_name text not null,
  source_url text,
  source_version text not null,
  source_observed_at timestamptz not null,
  methodology text not null default 'terrain_sample',
  metadata jsonb not null default '{}'::jsonb,
  location geography(Point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valuation_topography_slope_pct_check check (slope_pct is null or slope_pct >= 0),
  constraint valuation_topography_slope_degrees_check check (slope_degrees is null or slope_degrees between 0 and 90),
  constraint valuation_topography_aspect_check check (aspect_degrees is null or aspect_degrees between 0 and 360)
);

create unique index if not exists valuation_topography_sample_version_uidx
  on public.valuation_topography_samples (
    round(latitude::numeric, 6),
    round(longitude::numeric, 6),
    source_name,
    source_version
  );
create index if not exists valuation_topography_samples_location_gix
  on public.valuation_topography_samples using gist (location);
create index if not exists valuation_topography_samples_observed_idx
  on public.valuation_topography_samples (source_observed_at desc);

alter table public.valuation_topography_samples enable row level security;
revoke all on public.valuation_topography_samples from public, anon, authenticated;
grant select, insert, update, delete on public.valuation_topography_samples to service_role;

create or replace function public.valuation_topography_upsert_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  target_id uuid;
  affected integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for r in
    select * from jsonb_to_recordset(p_rows) as x(
      latitude double precision,
      longitude double precision,
      elevation_m numeric,
      slope_pct numeric,
      slope_degrees numeric,
      aspect_degrees numeric,
      sample_radius_m numeric,
      source_name text,
      source_url text,
      source_version text,
      source_observed_at timestamptz,
      methodology text,
      metadata jsonb
    )
  loop
    if r.latitude is null or r.longitude is null or r.elevation_m is null
      or coalesce(trim(r.source_name), '') = '' or coalesce(trim(r.source_version), '') = '' then
      continue;
    end if;

    select id into target_id
    from public.valuation_topography_samples s
    where round(s.latitude::numeric, 6) = round(r.latitude::numeric, 6)
      and round(s.longitude::numeric, 6) = round(r.longitude::numeric, 6)
      and s.source_name = trim(r.source_name)
      and s.source_version = trim(r.source_version)
    limit 1;

    if target_id is null then
      insert into public.valuation_topography_samples(
        latitude, longitude, elevation_m, slope_pct, slope_degrees, aspect_degrees,
        sample_radius_m, source_name, source_url, source_version, source_observed_at,
        methodology, metadata
      ) values (
        r.latitude, r.longitude, r.elevation_m, r.slope_pct, r.slope_degrees, r.aspect_degrees,
        coalesce(r.sample_radius_m, 30), trim(r.source_name), nullif(trim(r.source_url), ''),
        trim(r.source_version), coalesce(r.source_observed_at, now()),
        coalesce(nullif(trim(r.methodology), ''), 'terrain_sample'), coalesce(r.metadata, '{}'::jsonb)
      );
    else
      update public.valuation_topography_samples set
        elevation_m = r.elevation_m,
        slope_pct = r.slope_pct,
        slope_degrees = r.slope_degrees,
        aspect_degrees = r.aspect_degrees,
        sample_radius_m = coalesce(r.sample_radius_m, sample_radius_m),
        source_url = nullif(trim(r.source_url), ''),
        source_observed_at = coalesce(r.source_observed_at, source_observed_at),
        methodology = coalesce(nullif(trim(r.methodology), ''), methodology),
        metadata = coalesce(r.metadata, metadata),
        updated_at = now()
      where id = target_id;
    end if;
    target_id := null;
    affected := affected + 1;
  end loop;

  return jsonb_build_object('affected', affected, 'syncedAt', now());
end;
$$;

revoke all on function public.valuation_topography_upsert_v1(jsonb) from public, anon, authenticated;
grant execute on function public.valuation_topography_upsert_v1(jsonb) to service_role;

create or replace function public.valuation_topography_lookup_v1(
  p_lat double precision,
  p_lon double precision,
  p_max_distance_m numeric default 120
) returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with target as (
    select st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography as g
  ), ranked as (
    select s.*,
      st_distance(s.location, target.g) as distance_m
    from public.valuation_topography_samples s
    cross join target
    where st_dwithin(s.location, target.g, greatest(coalesce(p_max_distance_m, 120), 1))
    order by st_distance(s.location, target.g), s.source_observed_at desc
    limit 1
  )
  select case when exists(select 1 from ranked) then (
    select jsonb_build_object(
      'available', true,
      'sampleId', id,
      'elevationM', elevation_m,
      'slopePct', slope_pct,
      'slopeDegrees', slope_degrees,
      'aspectDegrees', aspect_degrees,
      'sampleRadiusM', sample_radius_m,
      'distanceM', round(distance_m::numeric, 1),
      'sourceName', source_name,
      'sourceUrl', source_url,
      'sourceVersion', source_version,
      'sourceObservedAt', source_observed_at,
      'methodology', methodology,
      'metadata', metadata,
      'nonBinding', true,
      'valuationAdjustmentPct', 0,
      'status', 'structural_evidence_only'
    ) from ranked
  ) else jsonb_build_object(
    'available', false,
    'reason', 'no_versioned_topography_sample',
    'nonBinding', true,
    'valuationAdjustmentPct', 0
  ) end;
$$;

grant execute on function public.valuation_topography_lookup_v1(double precision, double precision, numeric)
  to authenticated, service_role;

create or replace function public.valuation_topography_coverage_v1()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with houses as (
    select id, latitude::double precision as latitude, longitude::double precision as longitude,
      public.valuation_pp_kml_barrio_at(latitude, longitude) as barrio
    from public.valuation_cases
    where property_type ilike '%casa%'
      and latitude is not null and longitude is not null
  ), evaluated as (
    select h.*,
      exists (
        select 1 from public.valuation_topography_samples s
        where st_dwithin(
          s.location,
          st_setsrid(st_makepoint(h.longitude, h.latitude), 4326)::geography,
          120
        )
      ) as covered
    from houses h
  )
  select jsonb_build_object(
    'geocodedHouseCases', count(*),
    'coveredHouseCases', count(*) filter (where covered),
    'coveragePct', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where covered) / count(*), 1) end,
    'loCurroHouseCases', count(*) filter (where barrio = 'Lo Curro'),
    'loCurroCoveredHouseCases', count(*) filter (where barrio = 'Lo Curro' and covered),
    'loCurroCoveragePct', case when count(*) filter (where barrio = 'Lo Curro') = 0 then 0
      else round(100.0 * count(*) filter (where barrio = 'Lo Curro' and covered) / count(*) filter (where barrio = 'Lo Curro'), 1) end,
    'sampleCount', (select count(*) from public.valuation_topography_samples),
    'mode', 'structural_evidence_only',
    'changesChampionWeights', false
  )
  from evaluated;
$$;

grant execute on function public.valuation_topography_coverage_v1() to authenticated, service_role;
