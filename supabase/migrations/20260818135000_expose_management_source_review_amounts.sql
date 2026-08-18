create or replace view public.management_monthly_source_aggregates as
select
  entity_id,
  dataset,
  event_period_start as period_start,
  (event_period_start + interval '1 month - 1 day')::date as period_end,
  count(*) filter (where validation_status = 'accepted')::numeric as accepted_rows,
  sum(amount_uf) filter (where validation_status = 'accepted') as accepted_amount_uf,
  count(*) filter (where validation_status = 'needs_review')::numeric as needs_review_rows,
  count(*) filter (where validation_status = 'rejected')::numeric as rejected_rows,
  min(source_file) as source_file,
  min(source_sha256) as source_sha256,
  sum(amount_uf) filter (where validation_status = 'needs_review') as needs_review_amount_uf,
  sum(amount_uf) filter (where validation_status = 'rejected') as rejected_amount_uf
from public.management_source_records
where event_period_start is not null
group by entity_id, dataset, event_period_start;
