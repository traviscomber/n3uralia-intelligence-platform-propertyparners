alter table valuation_comparables
  add column if not exists source_transaction_id uuid references market_transactions(id) on delete set null,
  add column if not exists source_listing_id uuid references market_listings(id) on delete set null,
  add column if not exists source_observed_at timestamptz,
  add column if not exists source_methodology_version text,
  add column if not exists selected_by uuid references auth.users(id) on delete set null,
  add column if not exists selected_at timestamptz,
  add column if not exists excluded_by uuid references auth.users(id) on delete set null,
  add column if not exists excluded_at timestamptz;

create index if not exists valuation_comparables_transaction_idx on valuation_comparables(source_transaction_id);
create index if not exists valuation_comparables_listing_idx on valuation_comparables(source_listing_id);

create table if not exists valuation_decision_log (
  id uuid primary key default gen_random_uuid(),
  valuation_case_id uuid not null references valuation_cases(id) on delete cascade,
  action text not null check (action in ('candidate_generated','comparable_selected','comparable_excluded','adjustment_updated','submitted_for_review','approved','rejected','issued')),
  actor_id uuid references auth.users(id) on delete set null,
  comparable_id uuid references valuation_comparables(id) on delete set null,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists valuation_decision_log_case_idx on valuation_decision_log(valuation_case_id,created_at desc);

alter table valuation_decision_log enable row level security;

create policy valuation_decision_log_read on valuation_decision_log
for select to authenticated
using (
  exists (
    select 1 from valuation_cases vc
    where vc.id=valuation_decision_log.valuation_case_id
      and (
        vc.requested_by=auth.uid()
        or vc.reviewed_by=auth.uid()
        or vc.approved_by=auth.uid()
        or exists (select 1 from profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector'))
      )
  )
);

create policy valuation_decision_log_insert on valuation_decision_log
for insert to authenticated
with check (actor_id=auth.uid());

create or replace function valuation_candidate_pool(p_case_id uuid, p_limit integer default 30)
returns table (
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
security invoker
as $$
with subject as (
  select * from valuation_cases where id=p_case_id
), transaction_candidates as (
  select
    'transaction'::text source_type,
    mt.event_key source_reference,
    mpc.id comparable_property_id,
    mt.id source_transaction_id,
    null::uuid source_listing_id,
    mt.transaction_date,
    null::timestamptz observed_at,
    mpc.address,
    mpc.neighborhood,
    mpc.property_type,
    null::numeric useful_area_m2,
    mpc.built_area_m2,
    mpc.total_area_m2 land_area_m2,
    mpc.bedrooms,
    mpc.bathrooms,
    mpc.parking_spaces,
    mt.price_uf,
    mt.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and mpc.latitude is not null and mpc.longitude is not null then
      111320 * sqrt(power((mpc.latitude-s.latitude)::numeric,2)+power(((mpc.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2))
    else null end distance_meters,
    greatest(0,least(100,
      100
      - case when lower(coalesce(mpc.property_type,''))=lower(coalesce(s.property_type,'')) then 0 else 25 end
      - case when coalesce(mpc.neighborhood,'')=coalesce(s.neighborhood,'') then 0 else 20 end
      - least(25,coalesce(abs(mpc.built_area_m2-s.built_area_m2)/nullif(s.built_area_m2,0)*100,10))
      - least(15,coalesce(abs(mpc.bedrooms-s.bedrooms)*5,5))
      - least(15,coalesce(abs(mpc.bathrooms-s.bathrooms)*5,5))
    ))::numeric similarity_score,
    jsonb_build_array(jsonb_build_object('marketSourceId',mt.source_id,'eventKey',mt.event_key,'transactionDate',mt.transaction_date,'priceUf',mt.price_uf,'priceUfM2',mt.price_uf_m2)) evidence
  from subject s
  join market_transactions mt on mt.price_uf is not null
  join market_properties_canonical mpc on mpc.id=mt.property_id
  where (s.property_type is null or lower(mpc.property_type)=lower(s.property_type) or lower(mpc.property_type)=case lower(s.property_type) when 'casa' then 'house' when 'departamento' then 'apartment' else lower(s.property_type) end)
), listing_candidates as (
  select
    'listing'::text,
    ml.source_listing_id,
    mpc.id,
    null::uuid,
    ml.id,
    null::date,
    ml.observed_at,
    coalesce(ml.normalized_address,mpc.address),
    mpc.neighborhood,
    mpc.property_type,
    null::numeric,
    mpc.built_area_m2,
    mpc.total_area_m2,
    mpc.bedrooms,
    mpc.bathrooms,
    mpc.parking_spaces,
    ml.price_uf,
    ml.price_uf_m2,
    case when s.latitude is not null and s.longitude is not null and ml.latitude is not null and ml.longitude is not null then
      111320 * sqrt(power((ml.latitude-s.latitude)::numeric,2)+power(((ml.longitude-s.longitude)*cos(radians(s.latitude::double precision)))::numeric,2))
    else null end,
    greatest(0,least(100,
      92
      - case when lower(coalesce(mpc.property_type,''))=lower(coalesce(s.property_type,'')) then 0 else 25 end
      - case when coalesce(mpc.neighborhood,'')=coalesce(s.neighborhood,'') then 0 else 20 end
      - least(25,coalesce(abs(mpc.built_area_m2-s.built_area_m2)/nullif(s.built_area_m2,0)*100,10))
      - least(15,coalesce(abs(mpc.bedrooms-s.bedrooms)*5,5))
      - least(15,coalesce(abs(mpc.bathrooms-s.bathrooms)*5,5))
    ))::numeric,
    jsonb_build_array(jsonb_build_object('marketSourceId',ml.source_id,'listingId',ml.source_listing_id,'url',ml.url,'observedAt',ml.observed_at,'status',ml.status,'priceUf',ml.price_uf,'priceUfM2',ml.price_uf_m2))
  from subject s
  join market_listings ml on ml.price_uf is not null and ml.status in ('active','observed','sold','removed')
  join market_properties_canonical mpc on mpc.id=ml.property_id
  where (s.property_type is null or lower(mpc.property_type)=lower(s.property_type) or lower(mpc.property_type)=case lower(s.property_type) when 'casa' then 'house' when 'departamento' then 'apartment' else lower(s.property_type) end)
), unioned as (
  select * from transaction_candidates
  union all
  select * from listing_candidates
)
select * from unioned
order by similarity_score desc, transaction_date desc nulls last, observed_at desc nulls last
limit greatest(1,least(coalesce(p_limit,30),100));
$$;

grant execute on function valuation_candidate_pool(uuid,integer) to authenticated;
