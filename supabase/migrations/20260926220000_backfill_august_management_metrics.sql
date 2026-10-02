-- Backfill verified August 2026 management metrics from the current board authority.
-- Source authority: Ago_Directorio.pptx, sha256 395e5d942d575bf17939cef99567cfa6ef3f2c6b85bb9d1af43a7b2c20ea2f74.
-- This migration adds source-backed metric values only. It does not auto-approve publication
-- and does not overwrite the separately approved August sales target currently in management_goals.

with source_meta as (
  select
    'Ago_Directorio.pptx · canonical board restatement'::text as source_name,
    'Ago_Directorio.pptx#sha256=395e5d942d575bf17939cef99567cfa6ef3f2c6b85bb9d1af43a7b2c20ea2f74'::text as source_reference,
    timestamptz '2026-08-31 23:59:59-04' as source_cutoff_at
),
entity_map as (
  select id,name
  from public.management_entities
  where active
    and name in ('Property Partners Vitacura','Santa María','Nueva Costanera','Lo Beltrán')
),
rows(entity_name,metric_code,value) as (
  values
    ('Property Partners Vitacura','management_credited_sales',8.0::numeric),
    ('Property Partners Vitacura','management_credited_sales_uf',141650),
    ('Property Partners Vitacura','canonical_management_score',67.4),
    ('Property Partners Vitacura','canonical_portfolio_score',65.8),
    ('Property Partners Vitacura','canonical_follow_up_score',69.8),
    ('Property Partners Vitacura','canonical_conversion_score',67.3),
    ('Property Partners Vitacura','stock',324),
    ('Property Partners Vitacura','requirements',468),
    ('Property Partners Vitacura','active_leads_snapshot',1228),
    ('Property Partners Vitacura','classified_leads',808),
    ('Property Partners Vitacura','scheduled_visits',324),
    ('Property Partners Vitacura','realized_visits',189),
    ('Property Partners Vitacura','portfolio_stock_score',59.9),
    ('Property Partners Vitacura','portfolio_requirements_score',79.3),
    ('Property Partners Vitacura','portfolio_pricing_score',58.2),
    ('Property Partners Vitacura','follow_up_classified_score',65.8),
    ('Property Partners Vitacura','follow_up_managed90_score',81.3),
    ('Property Partners Vitacura','follow_up_managed15a_score',62.2),
    ('Property Partners Vitacura','conversion_visits_target_score',43.5),
    ('Property Partners Vitacura','conversion_visits_performed_score',58.3),
    ('Property Partners Vitacura','conversion_close_rate_score',100.1),

    ('Santa María','management_credited_sales',3.5),
    ('Santa María','management_credited_sales_uf',76800),
    ('Santa María','canonical_management_score',67.4),
    ('Santa María','canonical_portfolio_score',65.1),
    ('Santa María','canonical_follow_up_score',68.4),
    ('Santa María','canonical_conversion_score',69.5),
    ('Santa María','stock',134),
    ('Santa María','requirements',150),
    ('Santa María','active_leads_snapshot',532),
    ('Santa María','classified_leads',325),
    ('Santa María','scheduled_visits',94),
    ('Santa María','realized_visits',65),
    ('Santa María','portfolio_stock_score',60.9),
    ('Santa María','portfolio_requirements_score',81.2),
    ('Santa María','portfolio_pricing_score',53.1),
    ('Santa María','follow_up_classified_score',61.1),
    ('Santa María','follow_up_managed90_score',83.5),
    ('Santa María','follow_up_managed15a_score',60.6),
    ('Santa María','conversion_visits_target_score',50.7),
    ('Santa María','conversion_visits_performed_score',69.1),
    ('Santa María','conversion_close_rate_score',88.8),

    ('Nueva Costanera','management_credited_sales',2.0),
    ('Nueva Costanera','management_credited_sales_uf',26650),
    ('Nueva Costanera','canonical_management_score',67.5),
    ('Nueva Costanera','canonical_portfolio_score',69.1),
    ('Nueva Costanera','canonical_follow_up_score',66.4),
    ('Nueva Costanera','canonical_conversion_score',66.6),
    ('Nueva Costanera','stock',95),
    ('Nueva Costanera','requirements',165),
    ('Nueva Costanera','active_leads_snapshot',373),
    ('Nueva Costanera','classified_leads',294),
    ('Nueva Costanera','scheduled_visits',118),
    ('Nueva Costanera','realized_visits',62),
    ('Nueva Costanera','portfolio_stock_score',60.5),
    ('Nueva Costanera','portfolio_requirements_score',90.5),
    ('Nueva Costanera','portfolio_pricing_score',56.2),
    ('Nueva Costanera','follow_up_classified_score',78.8),
    ('Nueva Costanera','follow_up_managed90_score',71.8),
    ('Nueva Costanera','follow_up_managed15a_score',48.5),
    ('Nueva Costanera','conversion_visits_target_score',47.2),
    ('Nueva Costanera','conversion_visits_performed_score',52.5),
    ('Nueva Costanera','conversion_close_rate_score',100.1),

    ('Lo Beltrán','management_credited_sales',2.5),
    ('Lo Beltrán','management_credited_sales_uf',38200),
    ('Lo Beltrán','canonical_management_score',67.9),
    ('Lo Beltrán','canonical_portfolio_score',64.4),
    ('Lo Beltrán','canonical_follow_up_score',76.8),
    ('Lo Beltrán','canonical_conversion_score',63.6),
    ('Lo Beltrán','stock',95),
    ('Lo Beltrán','requirements',153),
    ('Lo Beltrán','active_leads_snapshot',323),
    ('Lo Beltrán','classified_leads',189),
    ('Lo Beltrán','scheduled_visits',112),
    ('Lo Beltrán','realized_visits',62),
    ('Lo Beltrán','portfolio_stock_score',57.9),
    ('Lo Beltrán','portfolio_requirements_score',68.5),
    ('Lo Beltrán','portfolio_pricing_score',66.7),
    ('Lo Beltrán','follow_up_classified_score',58.5),
    ('Lo Beltrán','follow_up_managed90_score',88.5),
    ('Lo Beltrán','follow_up_managed15a_score',83.3),
    ('Lo Beltrán','conversion_visits_target_score',35.5),
    ('Lo Beltrán','conversion_visits_performed_score',55.4),
    ('Lo Beltrán','conversion_close_rate_score',100.1)
),
validated as (
  select e.id as entity_id,r.entity_name,r.metric_code,r.value,m.formula_version
  from rows r
  join entity_map e on e.name=r.entity_name
  join public.management_metric_definitions m on m.code=r.metric_code and m.active
),
upserted as (
  insert into public.management_metric_values(
    entity_id,metric_code,period_start,period_end,value,
    source_name,source_reference,source_cutoff_at,
    quality_status,evaluation_status,formula_version,evaluated_at,evidence,updated_at
  )
  select
    v.entity_id,
    v.metric_code,
    date '2026-08-01',
    date '2026-08-31',
    v.value,
    s.source_name,
    s.source_reference,
    s.source_cutoff_at,
    'verified',
    'evaluable',
    v.formula_version,
    now(),
    jsonb_build_object(
      'authority','Ago_Directorio.pptx',
      'authority_sha256','395e5d942d575bf17939cef99567cfa6ef3f2c6b85bb9d1af43a7b2c20ea2f74',
      'report','Property_Partners_Control_Gestion_Agosto_2026.pdf',
      'period','2026-08',
      'restatesManagementSeriesThrough','2026-08',
      'importPolicy','verified_source_value_not_auto_approved'
    ),
    now()
  from validated v
  cross join source_meta s
  on conflict(entity_id,metric_code,period_start,period_end,source_name)
  do update set
    value=excluded.value,
    source_reference=excluded.source_reference,
    source_cutoff_at=excluded.source_cutoff_at,
    quality_status=excluded.quality_status,
    evaluation_status=excluded.evaluation_status,
    formula_version=excluded.formula_version,
    evaluated_at=excluded.evaluated_at,
    evidence=excluded.evidence,
    updated_at=excluded.updated_at
  returning id
)
insert into public.management_import_runs(
  source_name,source_reference,period_start,period_end,status,
  rows_received,rows_inserted,rows_updated,rows_rejected,warnings,errors,
  started_at,completed_at
)
select
  s.source_name,
  s.source_reference,
  date '2026-08-01',
  date '2026-08-31',
  'completed',
  (select count(*) from validated),
  (select count(*) from upserted),
  0,
  0,
  '[]'::jsonb,
  '[]'::jsonb,
  now(),
  now()
from source_meta s
where not exists (
  select 1
  from public.management_import_runs r
  where r.source_reference=s.source_reference
    and r.period_start=date '2026-08-01'
    and r.period_end=date '2026-08-31'
);

create or replace view public.management_history_coverage_v1 as
with classified as (
  select
    entity_id,
    period_start,
    period_end,
    metric_code,
    source_name,
    quality_status,
    evaluation_status,
    case
      when period_start=date_trunc('month',period_start)::date
       and period_end=(date_trunc('month',period_start)+interval '1 month - 1 day')::date
      then 'monthly'
      else 'aggregate'
    end as period_grain
  from public.management_metric_values
  where period_start>=date '2025-01-01'
), grouped as (
  select
    entity_id,
    period_start,
    period_end,
    period_grain,
    count(*) filter(where quality_status='verified' and evaluation_status='evaluable')::int as verified_metrics,
    count(distinct metric_code) filter(where quality_status='verified' and evaluation_status='evaluable')::int as verified_metric_codes,
    array_agg(distinct source_name order by source_name) as sources
  from classified
  group by entity_id,period_start,period_end,period_grain
)
select
  g.entity_id,
  e.name as entity_name,
  e.entity_type,
  g.period_start,
  g.period_end,
  g.period_grain,
  g.verified_metrics,
  g.verified_metric_codes,
  g.sources,
  case
    when g.period_grain='aggregate' then 'historical_aggregate'
    when g.period_start<date '2026-01-01' and g.verified_metric_codes<=2 then 'historical_partial'
    when g.verified_metric_codes>=8 then 'operationally_complete'
    else 'partial'
  end as coverage_status
from grouped g
join public.management_entities e on e.id=g.entity_id;
revoke all on public.management_history_coverage_v1 from public,anon;
grant select on public.management_history_coverage_v1 to authenticated,service_role;

comment on view public.management_history_coverage_v1 is
'Observed management metric coverage by entity and month from 2025 onward. 2025 monthly coverage remains partial unless source-backed metrics exist; annual-only facts are not fabricated into monthly values.';
