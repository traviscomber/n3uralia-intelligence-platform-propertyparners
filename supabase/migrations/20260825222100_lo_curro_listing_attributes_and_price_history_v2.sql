-- Enrich Lo Curro listing intelligence with source-reported attributes and raw scraper price history.
-- All fields are derived/source claims and remain non-canonical.

alter table private.market_listing_intelligence_v1 add column if not exists reported_useful_area_m2 numeric;
alter table private.market_listing_intelligence_v1 add column if not exists reported_total_area_m2 numeric;
alter table private.market_listing_intelligence_v1 add column if not exists reported_built_area_m2 numeric;
alter table private.market_listing_intelligence_v1 add column if not exists reported_bedrooms integer;
alter table private.market_listing_intelligence_v1 add column if not exists reported_bathrooms integer;
alter table private.market_listing_intelligence_v1 add column if not exists reported_parking_spaces integer;
alter table private.market_listing_intelligence_v1 add column if not exists reported_construction_year integer;

create or replace function public.refresh_lo_curro_raw_price_history_v1()
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $function$
declare v_rows int:=0;
begin
  insert into private.market_listing_price_observations_v1(source_listing_id,listing_id,cluster_id,observed_at,price_uf,status,source_url,evidence)
  select i.source_listing_id,i.listing_id,m.cluster_id,r.observed_at,nullif(r.payload->>'price_uf','')::numeric,coalesce(r.payload->>'status','observed'),coalesce(r.payload->>'source_url',r.payload->>'url'),
         jsonb_build_object('derived',true,'canonical',false,'source','market_raw_records','rawRecordId',r.id,'sourceSystem',r.source_system,'mayTrainChampion',false)
  from public.market_raw_records r
  join private.market_listing_intelligence_v1 i on (
       coalesce(r.payload->>'source_listing_id',r.source_record_id)=i.source_listing_id
       or i.source_listing_id like '%'||coalesce(r.payload->>'source_listing_id',r.source_record_id)||'%')
  left join private.market_listing_cluster_members_v1 m on m.source_listing_id=i.source_listing_id
  where i.barrio='Lo Curro' and lower(coalesce(r.payload->>'property_type',''))='casa' and nullif(r.payload->>'price_uf','')::numeric>0
  on conflict do nothing;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('inserted',v_rows,'canonical',false,'mayTrainChampion',false);
end;$function$;

create or replace function public.lo_curro_market_cluster_watch_v2()
returns table(cluster_id uuid,listing_count integer,source_count integer,representative_address text,current_median_price_uf numeric,min_price_uf numeric,max_price_uf numeric,first_seen_at timestamptz,last_seen_at timestamptz,terrain_position text,terrain_confidence text,identity_confidence numeric,price_observation_count bigint,first_observed_price_uf numeric,last_observed_price_uf numeric,price_change_pct numeric)
language sql stable security definer set search_path=public,private,pg_temp as $function$
with obs as (
 select o.cluster_id,count(*) n,
        (array_agg(o.price_uf order by o.observed_at asc) filter(where o.price_uf is not null))[1] first_price,
        (array_agg(o.price_uf order by o.observed_at desc) filter(where o.price_uf is not null))[1] last_price
 from private.market_listing_price_observations_v1 o where o.cluster_id is not null group by o.cluster_id
)
select c.cluster_id,c.listing_count,c.source_count,c.representative_address,c.current_median_price_uf,c.min_price_uf,c.max_price_uf,c.first_seen_at,c.last_seen_at,c.terrain_position,c.terrain_confidence,c.identity_confidence,
       coalesce(o.n,0),o.first_price,o.last_price,
       case when o.first_price>0 and o.last_price is not null then round((100*(o.last_price-o.first_price)/o.first_price)::numeric,2) end
from private.market_listing_clusters_v1 c left join obs o on o.cluster_id=c.cluster_id;
$function$;

revoke all on function public.refresh_lo_curro_raw_price_history_v1() from public;
revoke all on function public.lo_curro_market_cluster_watch_v2() from public;
grant execute on function public.refresh_lo_curro_raw_price_history_v1() to authenticated,service_role;
grant execute on function public.lo_curro_market_cluster_watch_v2() to authenticated,service_role;

-- NOTE: refresh_lo_curro_listing_intelligence_v1 is upgraded in production to populate
-- reported_* columns from market_current_listings.raw_payload and mark these as source claims.
