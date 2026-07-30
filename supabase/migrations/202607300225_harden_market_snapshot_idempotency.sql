alter table public.market_metric_snapshots
  drop constraint if exists market_metric_snapshots_period_start_period_end_neighborhoo_key;

alter table public.market_metric_snapshots
  add constraint market_metric_snapshots_period_identity_key
  unique nulls not distinct (
    period_start,
    period_end,
    neighborhood_id,
    property_type,
    methodology_version