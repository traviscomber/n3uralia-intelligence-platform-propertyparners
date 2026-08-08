drop view if exists private.market_production_release_gate_v1;

create view private.market_production_release_gate_v1
with (security_invoker = true)
as
with
raw_quality as (
  select
    count(*)::bigint as raw_rows,
    count(*) filter (where validation_status <> 'accepted')::bigint as raw_not_accepted_rows,
    count(*) filter (where coalesce(array_length(validation_errors,1),0) > 0)::bigint as raw_rows_with_validation_errors,
    count(*) filter (where lower(payload::text) ~ '(mock|fake|placeholder|dummy|lorem|demo[ _-]?data|sample[ _-]?data)')::bigint as suspicious_payload_rows
  from public.market_raw_records
),
property_quality as (
  select
    count(*)::bigint as property_rows,
    count(*) filter (where identity_status = 'candidate')::bigint as candidate_property_rows,
    count(*) filter (where identity_status = 'confirmed')::bigint as confirmed_property_rows,
    count(*) filter (where identity_status not in ('candidate','confirmed','rejected','needs_review'))::bigint as unexpected_identity_status_rows,
    min(identity_confidence) as min_identity_confidence,
    max(identity_confidence) as max_identity_confidence,
    max(last_seen_at) as latest_property_seen_at
  from public.market_properties
),
effective_identity as (
  select
    count(*) filter (where provenance_origin = 'unresolved')::bigint as unresolved_provenance_rows,
    count(*) filter (where provenance_origin = 'recovered')::bigint as recovered_provenance_rows,
    count(*) filter (where identity_signal_class = 'conflicting_external_identity')::bigint as conflicting_external_identity_rows,
    count(*) filter (where identity_signal_class = 'probable_duplicate_listing')::bigint as probable_duplicate_rows,
    count(distinct effective_external_listing_id) filter (where identity_signal_class = 'probable_duplicate_listing')::bigint as probable_duplicate_external_ids
  from private.market_identity_quality_effective_v1
),
unresolved_duplicate_rows as (
  select count(*)::bigint as rows_without_confirmed_duplicate_edge
  from private.market_identity_quality_effective_v1 q
  where q.identity_signal_class = 'probable_duplicate_listing'
    and not exists (
      select 1
      from private.market_identity_quality_effective_v1 q2
      join public.market_property_matches m
        on m.status = 'confirmed'
       and m.left_entity_type = 'property'
       and m.right_entity_type = 'property'
       and ((m.left_entity_id = q.property_id and m.right_entity_id = q2.property_id)
         or (m.left_entity_id = q2.property_id and m.right_entity_id = q.property_id))
      where q2.effective_external_listing_id = q.effective_external_listing_id
        and q2.property_id <> q.property_id
    )
),
neighborhood_quality as (
  select
    (select count(*)::bigint from public.neighborhood_market_data) as neighborhood_source_rows,
    (select count(*)::bigint from private.neighborhood_market_data_verified_v1) as neighborhood_verified_rows,
    has_table_privilege('authenticated', 'public.neighborhood_market_data', 'SELECT') as authenticated_can_read_neighborhood_source
),
capability_counts as (
  select
    (select count(*)::bigint from public.market_transactions) as transaction_rows,
    (select count(*)::bigint from public.valuation_cases) as valuation_case_rows,
    (select count(*)::bigint from public.valuation_comparables) as valuation_comparable_rows,
    (select count(*)::bigint from public.management_approved_metric_values) as management_approved_rows
),
assembled as (
  select rq.*, pq.*, ei.*, ud.rows_without_confirmed_duplicate_edge,
         nq.neighborhood_source_rows, nq.neighborhood_verified_rows,
         nq.authenticated_can_read_neighborhood_source,
         cc.transaction_rows, cc.valuation_case_rows, cc.valuation_comparable_rows, cc.management_approved_rows,
         case when pq.latest_property_seen_at is null then null else current_date - pq.latest_property_seen_at::date end as market_age_days
  from raw_quality rq
  cross join property_quality pq
  cross join effective_identity ei
  cross join unresolved_duplicate_rows ud
  cross join neighborhood_quality nq
  cross join capability_counts cc
),
classified as (
  select a.*,
    array_remove(array[
      case when a.raw_not_accepted_rows > 0 then 'raw_records_not_accepted' end,
      case when a.raw_rows_with_validation_errors > 0 then 'raw_validation_errors_present' end,
      case when a.suspicious_payload_rows > 0 then 'suspicious_mock_or_placeholder_payloads' end,
      case when a.unexpected_identity_status_rows > 0 then 'unexpected_property_identity_status' end,
      case when a.candidate_property_rows > 0 then 'canonical_property_identity_not_confirmed' end,
      case when a.conflicting_external_identity_rows > 0 then 'conflicting_external_identity' end,
      case when a.unresolved_provenance_rows > 0 then 'unresolved_market_provenance' end,
      case when a.rows_without_confirmed_duplicate_edge > 0 then 'probable_duplicates_without_confirmed_edge' end,
      case when a.market_age_days is null or a.market_age_days > 7 then 'market_data_stale' end,
      case when a.neighborhood_source_rows > a.neighborhood_verified_rows and a.authenticated_can_read_neighborhood_source then 'unverified_neighborhood_data_exposed_to_clients' end
    ], null) as blockers,
    array_remove(array[
      case when a.neighborhood_verified_rows = 0 then 'neighborhood_data_unverified_disable_neighborhood_features' end,
      case when a.transaction_rows = 0 then 'transactions_unavailable_disable_transaction_features' end,
      case when a.valuation_case_rows = 0 or a.valuation_comparable_rows = 0 then 'valuation_evidence_unavailable_disable_valuation_features' end,
      case when a.management_approved_rows = 0 then 'management_metrics_unpublished_disable_management_reporting' end
    ], null) as limitations
  from assembled a
)
select
  now() as evaluated_at,
  case when cardinality(blockers) > 0 then 'BLOCK'
       when cardinality(limitations) > 0 then 'HOLD'
       else 'PASS' end as release_verdict,
  cardinality(blockers)::integer as blocker_count,
  blockers,
  cardinality(limitations)::integer as limitation_count,
  limitations,
  raw_rows,
  raw_not_accepted_rows,
  raw_rows_with_validation_errors,
  suspicious_payload_rows,
  property_rows,
  candidate_property_rows,
  confirmed_property_rows,
  unexpected_identity_status_rows,
  min_identity_confidence,
  max_identity_confidence,
  recovered_provenance_rows,
  unresolved_provenance_rows,
  conflicting_external_identity_rows,
  probable_duplicate_rows,
  probable_duplicate_external_ids,
  rows_without_confirmed_duplicate_edge,
  latest_property_seen_at,
  market_age_days,
  neighborhood_source_rows,
  neighborhood_verified_rows,
  authenticated_can_read_neighborhood_source,
  transaction_rows,
  valuation_case_rows,
  valuation_comparable_rows,
  management_approved_rows
from classified;

revoke all on private.market_production_release_gate_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.market_production_release_gate_v1 to service_role;

comment on view private.market_production_release_gate_v1 is 'Server-only production release gate. Unverified source data may remain stored as quarantined evidence, but any client exposure is a blocker. Missing evidence-driven capabilities remain disabled as explicit HOLD limitations; no synthetic fallback is permitted.';
