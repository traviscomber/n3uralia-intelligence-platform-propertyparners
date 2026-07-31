-- Reversible QA for market -> comparable -> valuation.
-- Run with known QA user, draft valuation and listing IDs.
-- Required psql variables: qa_user_id, valuation_case_id, listing_id.

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'qa_user_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into valuation_comparables (
  valuation_case_id, comparable_property_id, rank, similarity_score,
  base_value_uf, adjusted_value_uf, adjustments, evidence, contradictions,
  match_status, source_type, source_reference, address, price_uf, price_uf_m2,
  selected, adjustment_pct, source_listing_id, source_observed_at,
  source_methodology_version
)
select
  vc.id, ml.property_id,
  coalesce((select max(rank) from valuation_comparables where valuation_case_id=vc.id),0)+1,
  0, ml.price_uf, ml.price_uf, '[]'::jsonb,
  jsonb_build_array(jsonb_build_object('module','market','listingId',ml.id,'propertyId',ml.property_id,'observedAt',ml.observed_at,'url',ml.url)),
  array[]::text[], 'candidate', 'market_listing', coalesce(ml.url,ml.source_listing_id,ml.id::text),
  ml.normalized_address, ml.price_uf, ml.price_uf_m2, false, 0, ml.id, ml.observed_at,
  'market_manual_link_v1'
from valuation_cases vc
join market_current_listings ml on ml.id=:'listing_id'::uuid
where vc.id=:'valuation_case_id'::uuid
  and vc.status='draft'
  and vc.requested_by=auth.uid();

select
  count(*) filter (where source_methodology_version='market_manual_link_v1') as linked_candidates,
  count(*) filter (where evidence @> '[{"module":"market"}]'::jsonb) as candidates_with_market_evidence
from valuation_comparables
where valuation_case_id=:'valuation_case_id'::uuid;

rollback;
