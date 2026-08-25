-- Derived market-intelligence projection for Lo Curro.
-- Canonical market/property data remains unchanged; this layer must not train Champion.

create table if not exists private.market_listing_clusters_v1 (
  cluster_id uuid primary key default gen_random_uuid(),
  barrio text not null,
  cluster_key text not null unique,
  canonical_property_id uuid,
  representative_latitude numeric,
  representative_longitude numeric,
  representative_address text,
  listing_count integer not null default 0,
  source_count integer not null default 0,
  min_price_uf numeric,
  max_price_uf numeric,
  current_median_price_uf numeric,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  terrain_position text,
  terrain_confidence text,
  identity_confidence numeric not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

create table if not exists private.market_listing_cluster_members_v1 (
  cluster_id uuid not null references private.market_listing_clusters_v1(cluster_id) on delete cascade,
  listing_id uuid not null,
  source_listing_id text not null,
  property_id uuid,
  match_basis text not null,
  match_confidence numeric not null,
  added_at timestamptz not null default now(),
  primary key(cluster_id,source_listing_id)
);
create unique index if not exists market_listing_cluster_member_source_uidx on private.market_listing_cluster_members_v1(source_listing_id);

create table if not exists private.market_listing_price_observations_v1 (
  id bigint generated always as identity primary key,
  source_listing_id text not null,
  listing_id uuid,
  cluster_id uuid references private.market_listing_clusters_v1(cluster_id) on delete set null,
  observed_at timestamptz not null,
  price_uf numeric,
  status text,
  source_url text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_listing_id,observed_at,price_uf,status)
);
create index if not exists market_listing_price_obs_cluster_idx on private.market_listing_price_observations_v1(cluster_id,observed_at desc);
create index if not exists market_listing_price_obs_source_idx on private.market_listing_price_observations_v1(source_listing_id,observed_at desc);

create or replace function public.refresh_lo_curro_multisource_intelligence_v1()
returns jsonb
language plpgsql security definer
set search_path=public,private,pg_temp
as $function$
declare v_clusters int:=0; v_members int:=0; v_obs int:=0;
begin
  insert into private.market_listing_price_observations_v1(source_listing_id,listing_id,observed_at,price_uf,status,source_url,evidence)
  select i.source_listing_id,i.listing_id,coalesce(i.last_seen_at,i.refreshed_at),i.current_price_uf,
         case when i.currently_active then 'active' else 'inactive' end,i.source_url,
         jsonb_build_object('derived',true,'canonical',false,'source','market_listing_intelligence_v1')
  from private.market_listing_intelligence_v1 i
  where i.barrio='Lo Curro'
  on conflict do nothing;
  get diagnostics v_obs=row_count;

  truncate table private.market_listing_cluster_members_v1;
  delete from private.market_listing_clusters_v1;

  with src as (
    select i.*,
      case when i.property_id is not null then 'property:'||i.property_id::text
           else 'geo:'||round(i.latitude::numeric,4)::text||':'||round(i.longitude::numeric,4)::text||':'||coalesce(round(i.current_price_uf/5000)*5000,0)::text end raw_cluster_key
    from private.market_listing_intelligence_v1 i
    where i.barrio='Lo Curro' and i.latitude is not null and i.longitude is not null
  ), grouped as (
    select raw_cluster_key,
      min(property_id::text)::uuid canonical_property_id,
      avg(latitude) lat,avg(longitude) lon,min(raw_address) representative_address,
      count(*) listing_count,
      count(distinct split_part(regexp_replace(coalesce(source_url,''),'^https?://(www\.)?','','i'), '/', 1)) source_count,
      min(current_price_uf) min_price,max(current_price_uf) max_price,
      percentile_cont(.5) within group(order by current_price_uf) median_price,
      min(first_seen_at) first_seen,max(last_seen_at) last_seen,
      mode() within group(order by terrain_position) terrain_position,
      mode() within group(order by terrain_confidence) terrain_confidence,
      avg(data_confidence) avg_conf,
      jsonb_agg(jsonb_build_object('listingId',listing_id,'sourceListingId',source_listing_id,'priceUf',current_price_uf,'url',source_url,'coordinateSource',coordinate_source) order by source_listing_id) listings
    from src group by raw_cluster_key
  )
  insert into private.market_listing_clusters_v1(barrio,cluster_key,canonical_property_id,representative_latitude,representative_longitude,representative_address,listing_count,source_count,min_price_uf,max_price_uf,current_median_price_uf,first_seen_at,last_seen_at,terrain_position,terrain_confidence,identity_confidence,evidence)
  select 'Lo Curro',raw_cluster_key,canonical_property_id,lat,lon,representative_address,listing_count,source_count,min_price,max_price,median_price,first_seen,last_seen,terrain_position,terrain_confidence,
         least(1.0,case when canonical_property_id is not null then .98 when listing_count>=2 and source_count>=2 then .92 when listing_count>=2 then .82 else .65 end * greatest(avg_conf,.5)),
         jsonb_build_object('derived',true,'canonical',false,'mayTrainChampion',false,'clusterMethod','canonical_property_else_geo_4dp_price_band_5000uf','members',listings)
  from grouped;
  get diagnostics v_clusters=row_count;

  insert into private.market_listing_cluster_members_v1(cluster_id,listing_id,source_listing_id,property_id,match_basis,match_confidence)
  select c.cluster_id,i.listing_id,i.source_listing_id,i.property_id,
         case when i.property_id is not null then 'canonical_property_id' else 'geo_4dp_price_band_5000uf' end,
         case when i.property_id is not null then .99 when c.source_count>=2 then .90 else .70 end
  from private.market_listing_intelligence_v1 i
  join private.market_listing_clusters_v1 c on c.cluster_key=case when i.property_id is not null then 'property:'||i.property_id::text else 'geo:'||round(i.latitude::numeric,4)::text||':'||round(i.longitude::numeric,4)::text||':'||coalesce(round(i.current_price_uf/5000)*5000,0)::text end
  where i.barrio='Lo Curro' and i.latitude is not null and i.longitude is not null;
  get diagnostics v_members=row_count;

  update private.market_listing_price_observations_v1 o set cluster_id=m.cluster_id
  from private.market_listing_cluster_members_v1 m
  where m.source_listing_id=o.source_listing_id and o.cluster_id is distinct from m.cluster_id;

  return jsonb_build_object('clusters',v_clusters,'members',v_members,'newObservations',v_obs,'canonical',false,'mayTrainChampion',false);
end;$function$;

revoke all on function public.refresh_lo_curro_multisource_intelligence_v1() from public;
grant execute on function public.refresh_lo_curro_multisource_intelligence_v1() to authenticated,service_role;