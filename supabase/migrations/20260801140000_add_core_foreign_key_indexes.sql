-- Add covering indexes for active foreign keys used by the contractual modules.
-- The affected tables currently contain little or no production data, so regular
-- index creation is safe and avoids the transaction restrictions of CONCURRENTLY.

create index if not exists management_tasks_assigned_to_idx
  on public.management_tasks (assigned_to);

create index if not exists management_tasks_created_by_idx
  on public.management_tasks (created_by);

create index if not exists management_tasks_updated_by_idx
  on public.management_tasks (updated_by);

create index if not exists management_task_comments_author_id_idx
  on public.management_task_comments (author_id);

create index if not exists management_task_events_actor_id_idx
  on public.management_task_events (actor_id);

create index if not exists property_assignments_assigned_by_idx
  on public.property_assignments (assigned_by);

create index if not exists valuation_comparables_comparable_property_id_idx
  on public.valuation_comparables (comparable_property_id);

create index if not exists management_metric_reconciliations_approved_by_idx
  on public.management_metric_reconciliations (approved_by);

create index if not exists management_metric_reconciliations_metric_code_idx
  on public.management_metric_reconciliations (metric_code);

create index if not exists market_properties_canonical_latest_raw_record_id_idx
  on public.market_properties_canonical (latest_raw_record_id);

create index if not exists market_property_observations_raw_record_id_idx
  on public.market_property_observations (raw_record_id);
