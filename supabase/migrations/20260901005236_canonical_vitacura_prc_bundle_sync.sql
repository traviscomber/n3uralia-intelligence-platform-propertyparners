create or replace function public.sync_vitacura_prc_bundle_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $$
declare
  zone_result jsonb;
  feature_result jsonb;
  current_version text;
  version_count integer;
  stale_zones integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'p_rows must be a non-empty JSON array';
  end if;

  select count(distinct x.source_version), min(x.source_version)
  into version_count, current_version
  from jsonb_to_recordset(p_rows) as x(source_version text);

  if version_count <> 1 or coalesce(trim(current_version),'') = '' then
    raise exception 'p_rows must contain one non-empty source_version';
  end if;

  zone_result := public.sync_vitacura_prc_zones_v1(p_rows);
  feature_result := public.sync_vitacura_prc_features_v1(p_rows);

  delete from public.vitacura_prc_zones z
  where z.source_url = 'https://vitacura.cl/municipalidad/planificacion-urbana/visor-interactivo-prcv/'
    and z.source_version is distinct from current_version;
  get diagnostics stale_zones = row_count;

  return jsonb_build_object(
    'sourceVersion', current_version,
    'zones', zone_result,
    'features', feature_result,
    'staleZonesRemoved', stale_zones,
    'syncedAt', now()
  );
end;
$$;

revoke execute on function public.sync_vitacura_prc_bundle_v1(jsonb) from public,anon,authenticated;
grant execute on function public.sync_vitacura_prc_bundle_v1(jsonb) to service_role;

create or replace function public.valuation_prc_lookup_v2_internal_20260901(p_lat double precision,p_lon double precision)
returns jsonb
language sql
stable
security definer
set search_path='public','extensions','pg_temp'
as $$
with latest_version as (
  select f.source_version
  from public.valuation_prc_features f
  order by f.source_observed_at desc, f.updated_at desc
  limit 1
), p as (
  select st_setsrid(st_makepoint(p_lon,p_lat),4326) g
), ranked as (
  select f.*
  from public.valuation_prc_features f,p
  where f.source_version=(select source_version from latest_version)
    and st_covers(f.geometry,p.g)
), latest as (
  select distinct on(layer_type)
    layer_type,feature_name,description,source_map_id,source_url,source_version,source_observed_at,raw_properties
  from ranked
  order by layer_type,source_observed_at desc,updated_at desc
)
select jsonb_build_object(
  'available',exists(select 1 from latest),
  'edificacion',(select jsonb_build_object('name',feature_name,'description',description,'sourceMapId',source_map_id,'sourceUrl',source_url,'sourceVersion',source_version,'sourceObservedAt',source_observed_at,'rawProperties',raw_properties) from latest where layer_type='edificacion'),
  'usoSuelo',(select jsonb_build_object('name',feature_name,'description',description,'sourceMapId',source_map_id,'sourceUrl',source_url,'sourceVersion',source_version,'sourceObservedAt',source_observed_at,'rawProperties',raw_properties) from latest where layer_type='uso_suelo'),
  'nonBinding',true,
  'valuationAdjustmentPct',0,
  'changesChampionWeights',false
);
$$;
