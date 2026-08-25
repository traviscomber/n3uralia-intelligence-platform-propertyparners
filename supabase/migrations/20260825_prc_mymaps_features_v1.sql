create table if not exists public.valuation_prc_features (
  id uuid primary key default gen_random_uuid(),
  source_feature_id text not null,
  layer_type text not null check (layer_type in ('edificacion','uso_suelo')),
  feature_name text not null,
  description text,
  source_map_id text not null,
  source_url text not null,
  source_version text not null,
  source_observed_at timestamptz not null,
  raw_properties jsonb not null default '{}'::jsonb,
  geometry geometry(MultiPolygon,4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_feature_id,source_version)
);
create index if not exists valuation_prc_features_geometry_gix on public.valuation_prc_features using gist(geometry);
create index if not exists valuation_prc_features_layer_version_idx on public.valuation_prc_features(layer_type,source_version);
alter table public.valuation_prc_features enable row level security;
revoke all on public.valuation_prc_features from public,anon,authenticated;
grant select,insert,update,delete on public.valuation_prc_features to service_role;

create or replace function public.sync_vitacura_prc_features_v1(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r record; g geometry; affected integer:=0;
begin
  if jsonb_typeof(p_rows)<>'array' then raise exception 'p_rows must be a JSON array'; end if;
  for r in select * from jsonb_to_recordset(p_rows) as x(
    source_feature_id text,layer_type text,feature_name text,description text,source_map_id text,source_url text,source_version text,source_observed_at timestamptz,raw_properties jsonb,geometry jsonb
  ) loop
    if r.geometry is null or r.layer_type not in ('edificacion','uso_suelo') then continue; end if;
    g:=st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(r.geometry::text),4326)),3));
    if g is null or st_isempty(g) then continue; end if;
    insert into public.valuation_prc_features(source_feature_id,layer_type,feature_name,description,source_map_id,source_url,source_version,source_observed_at,raw_properties,geometry)
    values(r.source_feature_id,r.layer_type,coalesce(nullif(trim(r.feature_name),''),'Sin nombre'),r.description,r.source_map_id,r.source_url,r.source_version,coalesce(r.source_observed_at,now()),coalesce(r.raw_properties,'{}'::jsonb),g)
    on conflict(source_feature_id,source_version) do update set feature_name=excluded.feature_name,description=excluded.description,source_url=excluded.source_url,source_observed_at=excluded.source_observed_at,raw_properties=excluded.raw_properties,geometry=excluded.geometry,updated_at=now();
    affected:=affected+1;
  end loop;
  return jsonb_build_object('affected',affected,'syncedAt',now());
end $$;
revoke all on function public.sync_vitacura_prc_features_v1(jsonb) from public,anon,authenticated;
grant execute on function public.sync_vitacura_prc_features_v1(jsonb) to service_role;

create or replace function public.valuation_prc_lookup_v2(p_lat double precision,p_lon double precision)
returns jsonb language sql stable security definer set search_path=public,extensions as $$
with p as (select st_setsrid(st_makepoint(p_lon,p_lat),4326) g), ranked as (
  select f.* from public.valuation_prc_features f,p where st_covers(f.geometry,p.g)
), latest as (
  select distinct on(layer_type) layer_type,feature_name,description,source_map_id,source_url,source_version,source_observed_at,raw_properties
  from ranked order by layer_type,source_observed_at desc,updated_at desc
)
select jsonb_build_object(
 'available',exists(select 1 from latest),
 'edificacion',(select jsonb_build_object('name',feature_name,'description',description,'sourceMapId',source_map_id,'sourceUrl',source_url,'sourceVersion',source_version,'sourceObservedAt',source_observed_at,'rawProperties',raw_properties) from latest where layer_type='edificacion'),
 'usoSuelo',(select jsonb_build_object('name',feature_name,'description',description,'sourceMapId',source_map_id,'sourceUrl',source_url,'sourceVersion',source_version,'sourceObservedAt',source_observed_at,'rawProperties',raw_properties) from latest where layer_type='uso_suelo'),
 'nonBinding',true,'valuationAdjustmentPct',0,'changesChampionWeights',false
); $$;
revoke all on function public.valuation_prc_lookup_v2(double precision,double precision) from public,anon;
grant execute on function public.valuation_prc_lookup_v2(double precision,double precision) to authenticated,service_role;
