update public.valuation_comparables
set similarity_score = similarity_score / 100.0
where similarity_score > 1 and similarity_score <= 100;

alter table public.valuation_comparables
  drop constraint if exists valuation_comparables_similarity_score_check;

alter table public.valuation_comparables
  add constraint valuation_comparables_similarity_score_check
  check (similarity_score is null or (similarity_score >= 0 and similarity_score <= 1));

create or replace function public.valuation_candidate_pool(p_case_id uuid, p_limit integer default 30)
returns table(
  source_type text,
  source_reference text,
  comparable_property_id uuid,
  source_transaction_id uuid,
  source_listing_id uuid,
  transaction_date date,
  observed_at timestamptz,
  address text,
  neighborhood text,
  property_type text,
  useful_area_m2 numeric,
  built_area_m2 numeric,
  land_area_m2 numeric,
  bedrooms integer,
  bathrooms integer,
  parking_spaces integer,
  price_uf numeric,
  price_uf_m2 numeric,
  distance_meters numeric,
  similarity_score numeric,
  evidence jsonb
)
language sql
stable
set search_path to 'public','extensions'
as $function$
with subject as (
  select vc.*, mp.neighborhood_id
  from public.valuation_cases vc
  left join public.market_properties mp on mp.id = vc.subject_property_id
  where vc.id = p_case_id
),
transaction_candidates as (
  select
    'transaction'::text as source_type,
    mt.event_key as source_reference,
    mp.id as comparable_property_id,
    mt.id as source_transaction_id,
    null::uuid as source_listing_id,
    mt.transaction_date,
    null::timestamptz as observed_at,
    mp.normalized_address as address,
    mn.name as neighborhood,
    mp.property_type,
    mp.useful_area_m2,
    mp.built_area_m2,
    mp.land_area_m2,
    mp.bedrooms,
    mp.bathrooms,
    mp.parking_spaces,
    mt.price_uf,
    mt.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and mp.latitude is not null and mp.longitude is not null
      then 111320 * sqrt(power((mp.latitude-s.latitude)::numeric,2)+power(((mp.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2))
      else null end as distance_meters,
    round((greatest(0, least(100,
      100
      - case when lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,'')) then 0 else 25 end
      - case when mp.neighborhood_id is not distinct from s.neighborhood_id then 0 else 20 end
      - least(25,coalesce(abs(mp.built_area_m2-s.built_area_m2)/nullif(s.built_area_m2,0)*100,10))
      - least(15,coalesce(abs(mp.bedrooms-s.bedrooms)*5,5))
      - least(15,coalesce(abs(mp.bathrooms-s.bathrooms)*5,5))
    )) / 100.0)::numeric, 4) as similarity_score,
    jsonb_build_array(jsonb_build_object('marketSourceId',mt.source_id,'eventKey',mt.event_key,'transactionDate',mt.transaction_date,'priceUf',mt.price_uf,'priceUfM2',mt.price_uf_m2)) as evidence
  from subject s
  join public.market_transactions mt on mt.price_uf is not null
  join public.market_properties mp on mp.id=mt.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  where s.subject_property_id is null or mp.id <> s.subject_property_id
),
listing_candidates as (
  select
    'listing'::text as source_type,
    ml.source_listing_id as source_reference,
    mp.id as comparable_property_id,
    null::uuid as source_transaction_id,
    ml.id as source_listing_id,
    null::date as transaction_date,
    ml.observed_at,
    coalesce(ml.normalized_address,mp.normalized_address) as address,
    mn.name as neighborhood,
    mp.property_type,
    mp.useful_area_m2,
    mp.built_area_m2,
    mp.land_area_m2,
    mp.bedrooms,
    mp.bathrooms,
    mp.parking_spaces,
    ml.price_uf,
    ml.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and ml.latitude is not null and ml.longitude is not null
      then 111320 * sqrt(power((ml.latitude-s.latitude)::numeric,2)+power(((ml.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2))
      else null end as distance_meters,
    round((greatest(0, least(100,
      92
      - case when lower(coalesce(mp.property_type,''))=lower(coalesce(s.property_type,'')) then 0 else 25 end
      - case when mp.neighborhood_id is not distinct from s.neighborhood_id then 0 else 20 end
      - least(25,coalesce(abs(mp.built_area_m2-s.built_area_m2)/nullif(s.built_area_m2,0)*100,10))
      - least(15,coalesce(abs(mp.bedrooms-s.bedrooms)*5,5))
      - least(15,coalesce(abs(mp.bathrooms-s.bathrooms)*5,5))
    )) / 100.0)::numeric, 4) as similarity_score,
    jsonb_build_array(jsonb_build_object('marketSourceId',ml.source_id,'listingId',ml.source_listing_id,'url',ml.url,'observedAt',ml.observed_at,'status',ml.status,'priceUf',ml.price_uf,'priceUfM2',ml.price_uf_m2)) as evidence
  from subject s
  join public.market_listings ml on ml.price_uf is not null and ml.status in ('active','observed','sold','removed')
  join public.market_properties mp on mp.id=ml.property_id
  left join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  where s.subject_property_id is null or mp.id <> s.subject_property_id
),
unioned as (
  select * from transaction_candidates
  union all
  select * from listing_candidates
)
select * from unioned
order by similarity_score desc, transaction_date desc nulls last, observed_at desc nulls last
limit greatest(1,least(coalesce(p_limit,30),100));
$function$;
