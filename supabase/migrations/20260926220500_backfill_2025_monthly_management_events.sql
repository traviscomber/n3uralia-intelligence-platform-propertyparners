-- Backfill the verified 2025 monthly event baseline from authoritative CRM XLSX contracts.
-- Sources and SHA-256 values are locked by data/management-source-contracts-2025.json
-- and data/management-baseline-2025-events.json. No raw PII is persisted here.
-- Sales/sales_uf remain governed by their existing verified monthly baseline.

with company as (
  select id
  from public.management_entities
  where name='Property Partners Vitacura' and entity_type='company' and active
  limit 1
),
months(period,leads,requirements,scheduled,realized) as (
  values
    ('2025-01',348,262,330,191),
    ('2025-02',313,226,191,115),
    ('2025-03',390,243,358,215),
    ('2025-04',261,228,275,175),
    ('2025-05',352,389,260,160),
    ('2025-06',429,493,299,175),
    ('2025-07',423,546,386,239),
    ('2025-08',410,526,359,234),
    ('2025-09',266,419,260,167),
    ('2025-10',294,426,344,210),
    ('2025-11',294,427,319,216),
    ('2025-12',243,409,238,155)
),
expanded as (
  select period,'leads'::text as metric_code,leads::numeric as value,
    'Datos 2025/raw/leads_2025.xlsx#sha256=fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82#monthly-derived-baseline-v1'::text as source_reference
  from months
  union all
  select period,'requirements',requirements,
    'Datos 2025/raw/requerimientos_por_propiedades_2025.xlsx#sha256=bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e#monthly-derived-baseline-v1'
  from months
  union all
  select period,'scheduled_visits',scheduled,
    'Datos 2025/raw/visitas_agendadas_2025.xlsx#sha256=7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9#monthly-derived-baseline-v1'
  from months
  union all
  select period,'realized_visits',realized,
    'Datos 2025/raw/visitas_agendadas_2025.xlsx#sha256=7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9#monthly-derived-baseline-v1'
  from months
),
validated as (
  select
    c.id as entity_id,
    e.period,
    e.metric_code,
    e.value,
    e.source_reference,
    d.formula_version
  from expanded e
  cross join company c
  join public.management_metric_definitions d on d.code=e.metric_code and d.active
)
insert into public.management_metric_values(
  entity_id,metric_code,period_start,period_end,value,
  source_name,source_reference,source_cutoff_at,
  quality_status,evaluation_status,formula_version,evaluated_at,evidence,updated_at
)
select
  v.entity_id,
  v.metric_code,
  (v.period || '-01')::date,
  ((v.period || '-01')::date + interval '1 month - 1 day')::date,
  v.value,
  'CRM 2025 monthly authoritative baseline',
  v.source_reference,
  timestamptz '2025-12-31 23:59:59-03',
  'verified',
  'evaluable',
  v.formula_version,
  now(),
  jsonb_build_object(
    'status','verified_from_authoritative_xlsx',
    'scope',jsonb_build_object('branch','Vitacura','operation','Venta','propertyTypes',jsonb_build_array('Casa','Departamento')),
    'monthlyAggregation',true,
    'rawPiiPersisted',false,
    'baselineVersion',1
  ),
  now()
from validated v
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
  updated_at=excluded.updated_at;

insert into public.management_import_runs(
  source_name,source_reference,period_start,period_end,status,
  rows_received,rows_inserted,rows_updated,rows_rejected,warnings,errors,started_at,completed_at
)
select *
from (
  values
  (
    'CRM 2025 monthly authoritative baseline'::text,
    'Datos 2025/raw/leads_2025.xlsx#sha256=fa9f808072f5f9a10c5c1413c58a933c5c4d4d2747405c4163337dcfd2448e82#monthly-derived-baseline-v1'::text,
    date '2025-01-01',date '2025-12-31','completed'::text,12,12,0,0,'[]'::jsonb,'[]'::jsonb,now(),now()
  ),
  (
    'CRM 2025 monthly authoritative baseline',
    'Datos 2025/raw/requerimientos_por_propiedades_2025.xlsx#sha256=bcfff5094019f6b511f291467d7c37df698f47d199874f91c06873fa5253b98e#monthly-derived-baseline-v1',
    date '2025-01-01',date '2025-12-31','completed',12,12,0,0,'[]'::jsonb,'[]'::jsonb,now(),now()
  ),
  (
    'CRM 2025 monthly authoritative baseline',
    'Datos 2025/raw/visitas_agendadas_2025.xlsx#sha256=7ff31054dabedf2bf9518362462c954ca77e8efb356a427662f64d6584af4aa9#monthly-derived-baseline-v1',
    date '2025-01-01',date '2025-12-31','completed',24,24,0,0,'[]'::jsonb,'[]'::jsonb,now(),now()
  )
) as r(source_name,source_reference,period_start,period_end,status,rows_received,rows_inserted,rows_updated,rows_rejected,warnings,errors,started_at,completed_at)
where not exists (
  select 1 from public.management_import_runs x
  where x.source_reference=r.source_reference
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
    when g.period_start<date '2026-01-01' and g.verified_metric_codes>=6 then 'historical_operational_baseline'
    when g.period_start<date '2026-01-01' then 'historical_partial'
    when g.verified_metric_codes>=8 then 'operationally_complete'
    else 'partial'
  end as coverage_status
from grouped g
join public.management_entities e on e.id=g.entity_id;

revoke all on public.management_history_coverage_v1 from public,anon;
grant select on public.management_history_coverage_v1 to authenticated,service_role;
