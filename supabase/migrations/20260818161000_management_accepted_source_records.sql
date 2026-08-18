create or replace view public.management_accepted_source_records
with (security_invoker = true) as
select *
from public.management_source_records
where validation_status = 'accepted';

comment on view public.management_accepted_source_records is
  'Canonical boundary for granular management history. Consumers such as YoY must read only accepted source records; needs_review and rejected rows are excluded.';

create or replace view public.management_accepted_monthly_source_aggregates
with (security_invoker = true) as
select
  entity_id,
  dataset,
  event_period_start as period_start,
  (event_period_start + interval '1 month - 1 day')::date as period_end,
  count(*)::numeric as accepted_rows,
  sum(amount_uf) as accepted_amount_uf,
  min(source_file) as source_file,
  min(source_sha256) as source_sha256
from public.management_accepted_source_records
where event_period_start is not null
group by entity_id, dataset, event_period_start;

comment on view public.management_accepted_monthly_source_aggregates is
  'Monthly aggregates computed exclusively from accepted granular management source records.';
