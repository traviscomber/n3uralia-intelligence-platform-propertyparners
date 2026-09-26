create or replace view private.market_source_refresh_health_all_v1
with (security_invoker = true)
as
with required(dataset_kind, required_for_release) as (
  values
    ('portal_houses'::text, true),
    ('portal_apartments'::text, false),
    ('portal_projects'::text, false)
),
latest as (
  select distinct on (r.dataset_kind)
    r.dataset_kind,
    r.id as run_id,
    r.status,
    r.received_rows,
    r.accepted_rows,
    r.rejected_rows,
    r.completed_at,
    r.metadata
  from public.market_ingestion_runs r
  where r.source_system='portal_inmobiliario'
    and r.dataset_kind in ('portal_houses','portal_apartments','portal_projects')
  order by r.dataset_kind,r.completed_at desc nulls last,r.created_at desc
)
select
  req.dataset_kind,
  req.required_for_release,
  l.run_id,
  l.status,
  l.received_rows,
  l.accepted_rows,
  l.rejected_rows,
  l.completed_at,
  case
    when l.run_id is null then 'missing'
    when l.status <> 'completed' then 'failed_or_incomplete'
    when coalesce(l.accepted_rows,0)=0 then 'no_accepted_rows'
    when l.completed_at < now()-interval '7 days' then 'stale'
    else 'fresh'
  end as refresh_status
from required req
left join latest l using(dataset_kind);

revoke all on private.market_source_refresh_health_all_v1 from public,anon,authenticated;
grant select on private.market_source_refresh_health_all_v1 to service_role;

create or replace view private.market_source_refresh_health_v1
with (security_invoker = true)
as
select
  dataset_kind,
  run_id,
  status,
  received_rows,
  accepted_rows,
  rejected_rows,
  completed_at,
  refresh_status
from private.market_source_refresh_health_all_v1
where required_for_release;

revoke all on private.market_source_refresh_health_v1 from public,anon,authenticated;
grant select on private.market_source_refresh_health_v1 to service_role;

comment on view private.market_source_refresh_health_all_v1 is
'Health of all Portal datasets. portal_houses is the current contractual operational dataset; apartments/projects remain visible as optional reference datasets and do not block release freshness.';

comment on view private.market_source_refresh_health_v1 is
'Release-required Portal refresh health. Kept aligned to the current houses-only operational cron scope.';
