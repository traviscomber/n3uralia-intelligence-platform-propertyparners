create or replace function public.valuation_candidate_pool(p_case_id uuid, p_limit integer default 30)
returns table(
  source_type text, source_reference text, comparable_property_id uuid,
  source_transaction_id uuid, source_listing_id uuid, transaction_date date,
  observed_at timestamptz, address text, neighborhood text, property_type text,
  useful_area_m2 numeric, built_area_m2 numeric, land_area_m2 numeric,
  bedrooms integer, bathrooms integer, parking_spaces integer,
  price_uf numeric, price_uf_m2 numeric, distance_meters numeric,
  similarity_score numeric, evidence jsonb
)
language sql
stable
set search_path to 'public','extensions'
as $function$
with subject as (
  select vc.*, mp.neighborhood_id,
    coalesce(vc.useful_area_m2, vc.built_area_m2, mp.useful_area_m2, mp.built_area_m2) as comparison_area_m2
  from public.valuation_cases vc
  left join public.market_properties mp on mp.id = vc.subject_property_id
  where vc.id = p_case_id
),
raw_candidates as (
  select 'transaction'::text source_type, mt.event_key source_reference, mp.id comparable_property_id,
    mt.id source_transaction_id, null::uuid source_listing_id, mt.transaction_date,
    null::timestamptz observed_at, mp.normalized_address address, mn.name neighborhood,
    mp.property_type, mp.useful_area_m2, mp.built_area_m2, mp.land_area_m2,
    mp.bedrooms, mp.bathrooms, mp.parking_spaces, mt.price_uf, mt.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and mp.latitude is not null and mp.longitude is not null
      then 111320 * sqrt(power((mp.latitude-s.latitude)::numeric,2)+power(((mp.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2)) else null end distance_meters,
    mp.neighborhood_id, coalesce(mp.useful_area_m2, mp.built_area_m2) comparison_area_m2,
    s.comparison_area_m2 subject_area_m2, s.neighborhood_id subject_neighborhood_id,
    s.bedrooms subject_bedrooms, s.bathrooms subject_bathrooms,
    jsonb_build_array(jsonb_build_object('marketSourceId',mt.source_id,'eventKey',mt.event_key,'transactionDate',mt.transaction_date,'priceUf',mt.price_uf,'priceUfM2',mt.price_uf_m2)) source_evidence
  from subject s
  join public.market_transactions mt on mt.price_uf is not null
  join public.market_properties mp on mp.id=mt.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  where lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,''))
    and (s.subject_property_id is null or mp.id<>s.subject_property_id)
  union all
  select 'listing'::text, ml.source_listing_id, mp.id, null::uuid, ml.id, null::date,
    ml.observed_at, coalesce(ml.normalized_address,mp.normalized_address), mn.name,
    mp.property_type, mp.useful_area_m2, mp.built_area_m2, mp.land_area_m2,
    mp.bedrooms, mp.bathrooms, mp.parking_spaces, ml.price_uf, ml.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and ml.latitude is not null and ml.longitude is not null
      then 111320 * sqrt(power((ml.latitude-s.latitude)::numeric,2)+power(((ml.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2)) else null end,
    mp.neighborhood_id, coalesce(mp.useful_area_m2, mp.built_area_m2), s.comparison_area_m2,
    s.neighborhood_id, s.bedrooms, s.bathrooms,
    jsonb_build_array(jsonb_build_object('marketSourceId',ml.source_id,'listingId',ml.source_listing_id,'url',ml.url,'observedAt',ml.observed_at,'status',ml.status,'priceUf',ml.price_uf,'priceUfM2',ml.price_uf_m2))
  from subject s
  join public.market_listings ml on ml.price_uf is not null and ml.status in ('active','observed','sold','removed')
  join public.market_properties mp on mp.id=ml.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  where lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,''))
    and (s.subject_property_id is null or mp.id<>s.subject_property_id)
),
components as (
  select rc.*,
    case when subject_neighborhood_id is not null and neighborhood_id is not null then 20 else 0 end neighborhood_weight,
    case when subject_neighborhood_id is not null and neighborhood_id is not null and subject_neighborhood_id=neighborhood_id then 1.0 else 0.0 end neighborhood_score,
    case when subject_area_m2>0 and comparison_area_m2>0 then 25 else 0 end area_weight,
    case when subject_area_m2>0 and comparison_area_m2>0 then greatest(0.0,1.0-least(1.0,abs(comparison_area_m2-subject_area_m2)/subject_area_m2)) else 0.0 end area_score,
    case when subject_bedrooms is not null and bedrooms is not null then 15 else 0 end bedrooms_weight,
    case when subject_bedrooms is not null and bedrooms is not null then greatest(0.0,1.0-least(1.0,abs(bedrooms-subject_bedrooms)/3.0)) else 0.0 end bedrooms_score,
    case when subject_bathrooms is not null and bathrooms is not null then 15 else 0 end bathrooms_weight,
    case when subject_bathrooms is not null and bathrooms is not null then greatest(0.0,1.0-least(1.0,abs(bathrooms-subject_bathrooms)/3.0)) else 0.0 end bathrooms_score
  from raw_candidates rc
),
scored as (
  select c.*,
    (neighborhood_weight+area_weight+bedrooms_weight+bathrooms_weight)::numeric evaluated_weight,
    case when neighborhood_weight+area_weight+bedrooms_weight+bathrooms_weight>0 then
      round(((neighborhood_score*neighborhood_weight+area_score*area_weight+bedrooms_score*bedrooms_weight+bathrooms_score*bathrooms_weight)/(neighborhood_weight+area_weight+bedrooms_weight+bathrooms_weight))::numeric,4)
    else 0.1::numeric end final_similarity
  from components c
)
select source_type, source_reference, comparable_property_id, source_transaction_id, source_listing_id,
  transaction_date, observed_at, address, neighborhood, property_type, useful_area_m2,
  built_area_m2, land_area_m2, bedrooms, bathrooms, parking_spaces, price_uf, price_uf_m2,
  distance_meters, greatest(0.1,least(1,final_similarity)),
  source_evidence || jsonb_build_array(jsonb_build_object(
    'methodology','valuation_candidate_pool_v2','evaluatedWeight',evaluated_weight,
    'coveragePct',round(100*evaluated_weight/75.0,1),
    'components',jsonb_build_object(
      'neighborhood',jsonb_build_object('weight',neighborhood_weight,'score',neighborhood_score),
      'area',jsonb_build_object('weight',area_weight,'score',round(area_score::numeric,4)),
      'bedrooms',jsonb_build_object('weight',bedrooms_weight,'score',round(bedrooms_score::numeric,4)),
      'bathrooms',jsonb_build_object('weight',bathrooms_weight,'score',round(bathrooms_score::numeric,4))
    )))
from scored
order by final_similarity desc, distance_meters asc nulls last, transaction_date desc nulls last, observed_at desc nulls last
limit greatest(1,least(coalesce(p_limit,30),100));
$function$;
