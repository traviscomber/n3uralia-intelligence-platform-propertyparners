create or replace view private.market_data_quality_v1
with (security_invoker = true)
as
with
market_property_stats as (
  select
    count(*)::bigint as property_rows,
    count(*) filter (where identity_status = 'candidate')::bigint as candidate_rows,
    count(*) filter (where identity_status = 'confirmed')::bigint as confirmed_rows,
    max(last_seen_at) as latest_property_seen_at
  from public.market_properties
),
address_duplicates as (
  select count(*)::bigint as duplicate_address_groups,
         coalesce(sum(n), 0)::bigint as rows_in_duplicate_address_groups
  from (
    select normalized_address, count(*)::bigint as n
    from public.market_properties
    where normalized_address is not null and btrim(normalized_address) <> ''
    group by normalized_address
    having count(*) > 1
  ) d
),
listing_stats as (
  select
    count(*)::bigint as listing_rows,
    count(distinct source_listing_id)::bigint as distinct_listing_ids,
    count(*) filter (where url is null or btrim(url) = '')::bigint as listings_missing_url,
    max(observed_at) as latest_listing_seen_at
  from public.market_listings
),
raw_stats as (
  select
    count(*)::bigint as raw_rows,
    count(*) filter (where validation_status = 'accepted')::bigint as raw_accepted_rows,
    count(distinct nullif(payload->>'source_listing_id',''))::bigint as raw_distinct_payload_listing_ids,
    count(*) filter (where nullif(payload->>'source_listing_id','') is null)::bigint as raw_missing_payload_listing_id,
    count(*) filter (where nullif(payload->>'source_url','') is null)::bigint as raw_missing_source_url,
    max(observed_at) as latest_raw_observed_at,
    max(ingested_at) as latest_raw_ingested_at
  from public.market_raw_records
),
legacy_source_stats as (
  select
    count(*)::bigint as legacy_property_rows,
    count(*) filter (where source_listing_id is null or btrim(source_listing_id) = '')::bigint as legacy_missing_source_listing_id,
    count(*) filter (where source_url is null or btrim(source_url) = '')::bigint as legacy_missing_source_url
  from public.properties
),
neighborhood_stats as (
  select
    count(*)::bigint as neighborhood_market_rows,
    count(*) filter (where source_url is null or btrim(source_url) = '')::bigint as neighborhood_rows_missing_source_url,
    max(recorded_at) as latest_neighborhood_recorded_at
  from public.neighborhood_market_data
),
management_stats as (
  select
    count(*)::bigint as management_metric_rows,
    count(*) filter (where quality_status = 'verified' and evaluation_status = 'evaluable')::bigint as management_verified_evaluable_rows,
    max(source_cutoff_at) as latest_management_source_cutoff_at
  from public.management_metric_values
),
approved_management as (
  select count(*)::bigint as management_approved_rows
  from public.management_approved_metric_values
)
select
  now() as evaluated_at,
  mps.property_rows,
  mps.candidate_rows,
  mps.confirmed_rows,
  mps.latest_property_seen_at,
  case when mps.latest_property_seen_at is null then null else (current_date - mps.latest_property_seen_at::date) end as market_property_age_days,
  ads.duplicate_address_groups,
  ads.rows_in_duplicate_address_groups,
  ls.listing_rows,
  ls.distinct_listing_ids,
  ls.listings_missing_url,
  ls.latest_listing_seen_at,
  rs.raw_rows,
  rs.raw_accepted_rows,
  rs.raw_distinct_payload_listing_ids,
  rs.raw_missing_payload_listing_id,
  rs.raw_missing_source_url,
  rs.latest_raw_observed_at,
  rs.latest_raw_ingested_at,
  lss.legacy_property_rows,
  lss.legacy_missing_source_listing_id,
  lss.legacy_missing_source_url,
  (select count(*)::bigint from public.market_properties_canonical) as alternate_canonical_rows,
  (select count(*)::bigint from public.market_property_observations) as observation_rows,
  (select count(*)::bigint from public.market_transactions) as transaction_rows,
  (select count(*)::bigint from public.valuation_cases) as valuation_case_rows,
  (select count(*)::bigint from public.valuation_comparables) as valuation_comparable_rows,
  ns.neighborhood_market_rows,
  ns.neighborhood_rows_missing_source_url,
  ns.latest_neighborhood_recorded_at,
  ms.management_metric_rows,
  ms.management_verified_evaluable_rows,
  am.management_approved_rows,
  ms.latest_management_source_cutoff_at,
  case
    when mps.property_rows = 0 then 'blocked_no_market_properties'
    when mps.confirmed_rows = 0 then 'blocked_identity_unconfirmed'
    when (current_date - mps.latest_property_seen_at::date) > 7 then 'blocked_stale_market'
    when (select count(*) from public.market_transactions) = 0 then 'limited_no_transactions'
    else 'usable_with_controls'
  end as market_decision_status
from market_property_stats mps
cross join address_duplicates ads
cross join listing_stats ls
cross join raw_stats rs
cross join legacy_source_stats lss
cross join neighborhood_stats ns
cross join management_stats ms
cross join approved_management am;

revoke all on private.market_data_quality_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.market_data_quality_v1 to service_role;

comment on view private.market_data_quality_v1 is 'Server-only quality gate for market intelligence. Reports data readiness and provenance gaps without modifying canonical records.';
