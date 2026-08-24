-- Collapse repeated Portal observations/URL variants to one logical listing before valuation ranking.

create or replace function private.market_listing_identity_v1(p_url text,p_source_listing_id text,p_source_id uuid)
returns text
language sql
immutable
set search_path=''
as $$
  select coalesce(
    substring(coalesce(p_url,p_source_listing_id,'') from '(?i)MLC-?([0-9]+)'),
    private.normalize_market_external_id(coalesce(p_url,p_source_listing_id)),
    p_source_id::text||':'||coalesce(p_source_listing_id,'')
  );
$$;
revoke all on function private.market_listing_identity_v1(text,text,uuid) from public,anon,authenticated;

create or replace function public.valuation_candidate_pool(p_case_id uuid,p_limit integer default 30)
returns table(source_type text,source_reference text,comparable_property_id uuid,source_transaction_id uuid,source_listing_id uuid,transaction_date date,observed_at timestamptz,address text,neighborhood text,property_type text,useful_area_m2 numeric,built_area_m2 numeric,land_area_m2 numeric,bedrooms integer,bathrooms integer,parking_spaces integer,price_uf numeric,price_uf_m2 numeric,distance_meters numeric,similarity_score numeric,evidence jsonb)
language sql stable set search_path to 'public','extensions','private'
as $function$
with subject as (
  select vc.*,
    coalesce(geo_subject.neighborhood_id,mp.neighborhood_id,(select mn0.id from public.market_neighborhoods mn0 where lower(extensions.unaccent(mn0.name))=lower(extensions.unaccent(coalesce(vc.neighborhood,''))) limit 1)) as resolved_neighborhood_id,
    coalesce(vc.useful_area_m2,vc.built_area_m2,mp.useful_area_m2,mp.built_area_m2) as comparison_area_m2
  from public.valuation_cases vc
  left join public.market_properties mp on mp.id=vc.subject_property_id
  left join lateral (
    select mn.id as neighborhood_id from public.vitacura_market_neighborhoods vmn
    join public.market_neighborhoods mn on lower(extensions.unaccent(mn.name))=lower(extensions.unaccent(vmn.barrio_nombre))
    where vc.latitude is not null and vc.longitude is not null and st_contains(vmn.geometry,st_setsrid(st_makepoint(vc.longitude::double precision,vc.latitude::double precision),4326)) limit 1
  ) geo_subject on true where vc.id=p_case_id
),
latest_listings as (
  select distinct on (private.market_listing_identity_v1(ml.url,ml.source_listing_id,ml.source_id)) ml.*
  from public.market_listings ml
  where ml.price_uf is not null and ml.status in ('active','observed','sold','removed')
  order by private.market_listing_identity_v1(ml.url,ml.source_listing_id,ml.source_id),ml.observed_at desc,ml.created_at desc
),
raw_candidates as (
  select
    'transaction'::text as source_type,
    mt.event_key as source_reference,
    mp.id as comparable_property_id,
    mt.id as source_transaction_id,
    null::uuid as source_listing_id,
    mt.transaction_date,
    null::timestamptz as observed_at,
    mp.normalized_address as address,
    coalesce(geo_tx.neighborhood_name,mn.name) as neighborhood,
    mp.property_type,
    mp.useful_area_m2,mp.built_area_m2,mp.land_area_m2,mp.bedrooms,mp.bathrooms,mp.parking_spaces,
    mt.price_uf,mt.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and mp.latitude is not null and mp.longitude is not null then 111320*sqrt(power((mp.latitude-s.latitude)::numeric,2)+power(((mp.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2)) else null end as distance_meters,
    coalesce(geo_tx.neighborhood_id,mp.neighborhood_id) as neighborhood_id,
    coalesce(mp.useful_area_m2,mp.built_area_m2) as comparison_area_m2,
    s.comparison_area_m2 as subject_area_m2,
    s.resolved_neighborhood_id as subject_neighborhood_id,
    s.bedrooms as subject_bedrooms,
    s.bathrooms as subject_bathrooms,
    jsonb_build_array(jsonb_build_object('marketSourceId',mt.source_id,'eventKey',mt.event_key,'transactionDate',mt.transaction_date,'priceUf',mt.price_uf,'priceUfM2',mt.price_uf_m2,'scopeGuard','canonical_transaction','geographyMethod',case when geo_tx.neighborhood_id is not null then 'property_partners_kml_point_in_polygon' else 'stored_neighborhood' end)) as source_evidence
  from subject s join public.market_transactions mt on mt.price_uf is not null join public.market_properties mp on mp.id=mt.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  left join lateral (
    select mn2.id as neighborhood_id,mn2.name as neighborhood_name from public.vitacura_market_neighborhoods vmn2
    join public.market_neighborhoods mn2 on lower(extensions.unaccent(mn2.name))=lower(extensions.unaccent(vmn2.barrio_nombre))
    where mp.latitude is not null and mp.longitude is not null and st_contains(vmn2.geometry,st_setsrid(st_makepoint(mp.longitude::double precision,mp.latitude::double precision),4326)) limit 1
  ) geo_tx on true
  where lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,'')) and (s.subject_property_id is null or mp.id<>s.subject_property_id)
  union all
  select 'listing'::text,ml.source_listing_id,mp.id,null::uuid,ml.id,null::date,ml.observed_at,coalesce(ml.normalized_address,mp.normalized_address),
    coalesce(geo_listing.neighborhood_name,mn.name),mp.property_type,mp.useful_area_m2,mp.built_area_m2,mp.land_area_m2,mp.bedrooms,mp.bathrooms,mp.parking_spaces,ml.price_uf,ml.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and ml.latitude is not null and ml.longitude is not null then 111320*sqrt(power((ml.latitude-s.latitude)::numeric,2)+power(((ml.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2)) else null end,
    coalesce(geo_listing.neighborhood_id,mp.neighborhood_id),coalesce(mp.useful_area_m2,mp.built_area_m2),s.comparison_area_m2,s.resolved_neighborhood_id,s.bedrooms,s.bathrooms,
    jsonb_build_array(jsonb_build_object('marketSourceId',ml.source_id,'listingId',ml.source_listing_id,'url',ml.url,'observedAt',ml.observed_at,'status',ml.status,'priceUf',ml.price_uf,'priceUfM2',ml.price_uf_m2,'scopeGuard','logical_listing_deduplicated_v5','geographyMethod',case when geo_listing.neighborhood_id is not null then 'property_partners_kml_point_in_polygon' else 'stored_neighborhood' end))
  from subject s join latest_listings ml on true join public.market_properties mp on mp.id=ml.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  left join lateral (
    select mn3.id as neighborhood_id,mn3.name as neighborhood_name from public.vitacura_market_neighborhoods vmn3
    join public.market_neighborhoods mn3 on lower(extensions.unaccent(mn3.name))=lower(extensions.unaccent(vmn3.barrio_nombre))
    where ml.latitude is not null and ml.longitude is not null and st_contains(vmn3.geometry,st_setsrid(st_makepoint(ml.longitude::double precision,ml.latitude::double precision),4326)) limit 1
  ) geo_listing on true
  where lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,'')) and (s.subject_property_id is null or mp.id<>s.subject_property_id)
    and not (coalesce(ml.raw_payload->>'bridge','')='legacy_properties_v1' and lower(extensions.unaccent(coalesce(ml.normalized_address,ml.raw_address,''))) not like '%vitacura%')
),
components as (
  select rc.*,
    case when rc.subject_neighborhood_id is not null and rc.neighborhood_id is not null then 20 else 0 end as neighborhood_weight,
    case when rc.subject_neighborhood_id is not null and rc.neighborhood_id is not null and rc.subject_neighborhood_id=rc.neighborhood_id then 1.0 else 0.0 end as neighborhood_score,
    case when rc.subject_area_m2 is not null and rc.subject_area_m2>0 and rc.comparison_area_m2 is not null and rc.comparison_area_m2>0 then 25 else 0 end as area_weight,
    case when rc.subject_area_m2 is not null and rc.subject_area_m2>0 and rc.comparison_area_m2 is not null and rc.comparison_area_m2>0 then greatest(0.0,1.0-least(1.0,abs(rc.comparison_area_m2-rc.subject_area_m2)/rc.subject_area_m2)) else 0.0 end as area_score,
    case when rc.subject_bedrooms is not null and rc.bedrooms is not null then 15 else 0 end as bedrooms_weight,
    case when rc.subject_bedrooms is not null and rc.bedrooms is not null then greatest(0.0,1.0-least(1.0,abs(rc.bedrooms-rc.subject_bedrooms)/3.0)) else 0.0 end as bedrooms_score,
    case when rc.subject_bathrooms is not null and rc.bathrooms is not null then 15 else 0 end as bathrooms_weight,
    case when rc.subject_bathrooms is not null and rc.bathrooms is not null then greatest(0.0,1.0-least(1.0,abs(rc.bathrooms-rc.subject_bathrooms)/3.0)) else 0.0 end as bathrooms_score
  from raw_candidates rc
),
scored as (
  select c.*,(c.neighborhood_weight+c.area_weight+c.bedrooms_weight+c.bathrooms_weight)::numeric as evaluated_weight,
    case when (c.neighborhood_weight+c.area_weight+c.bedrooms_weight+c.bathrooms_weight)>0 then round(((c.neighborhood_score*c.neighborhood_weight+c.area_score*c.area_weight+c.bedrooms_score*c.bedrooms_weight+c.bathrooms_score*c.bathrooms_weight)/(c.neighborhood_weight+c.area_weight+c.bedrooms_weight+c.bathrooms_weight))::numeric,4) else 0.1::numeric end as final_similarity
  from components c
)
select s.source_type,s.source_reference,s.comparable_property_id,s.source_transaction_id,s.source_listing_id,s.transaction_date,s.observed_at,s.address,s.neighborhood,s.property_type,s.useful_area_m2,s.built_area_m2,s.land_area_m2,s.bedrooms,s.bathrooms,s.parking_spaces,s.price_uf,s.price_uf_m2,s.distance_meters,
  greatest(0.1,least(1,s.final_similarity)),
  s.source_evidence||jsonb_build_array(jsonb_build_object('methodology','valuation_candidate_pool_v5_kml_dedup','evaluatedWeight',s.evaluated_weight,'coveragePct',round(100*s.evaluated_weight/75.0,1),'components',jsonb_build_object('neighborhood',jsonb_build_object('weight',s.neighborhood_weight,'score',s.neighborhood_score),'area',jsonb_build_object('weight',s.area_weight,'score',round(s.area_score::numeric,4)),'bedrooms',jsonb_build_object('weight',s.bedrooms_weight,'score',round(s.bedrooms_score::numeric,4)),'bathrooms',jsonb_build_object('weight',s.bathrooms_weight,'score',round(s.bathrooms_score::numeric,4)))))
from scored s order by final_similarity desc,distance_meters asc nulls last,transaction_date desc nulls last,observed_at desc nulls last
limit greatest(1,least(coalesce(p_limit,30),100));
$function$;
