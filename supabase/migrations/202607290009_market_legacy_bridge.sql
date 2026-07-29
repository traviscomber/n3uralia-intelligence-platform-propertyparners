-- Puente controlado desde datos agregados heredados al modelo contractual del Módulo I.
-- No reemplaza las fuentes obligatorias CBR, Portal Inmobiliario, KML y datos del cliente.

insert into market_sources (code,name,source_type,file_name,file_hash,imported_at,period_start,period_end,row_count,status,metadata)
select
  'legacy-' || lower(regexp_replace(coalesce(ds.name,'source'), '[^a-zA-Z0-9]+', '-', 'g')),
  ds.name,
  case
    when lower(coalesce(ds.source_type,'')) like '%portal%' then 'portal'
    when lower(coalesce(ds.source_type,'')) like '%cbr%' then 'cbrs'
    when lower(coalesce(ds.source_type,'')) like '%kml%' then 'kml'
    when lower(coalesce(ds.source_type,'')) like '%client%' or lower(coalesce(ds.source_type,'')) like '%cliente%' then 'client'
    else 'other'
  end,
  null,
  null,
  ds.last_sync,
  null,
  null,
  coalesce(ds.records_count,0),
  case when lower(coalesce(ds.status,'')) in ('active','connected','online','ok') then 'active' else 'quarantined' end,
  jsonb_build_object('legacy_data_source_id',ds.id,'legacy_status',ds.status,'pipeline_order',ds.pipeline_order,'note','Registro heredado; requiere validación documental y de procedencia antes de aceptación contractual.')
from data_sources ds
on conflict (code) do update set
  name=excluded.name,
  source_type=excluded.source_type,
  imported_at=excluded.imported_at,
  row_count=excluded.row_count,
  status=excluded.status,
  metadata=excluded.metadata;

insert into market_neighborhoods (name,micro_neighborhood,geometry,geometry_source_id,assignment_status)
select distinct trim(n.name), null, null, null,
  case when n.geometry is null then 'pending' else 'exact' end
from neighborhoods n
where nullif(trim(n.name),'') is not null
on conflict (name) do update set
  assignment_status=excluded.assignment_status,
  updated_at=now();

with normalized as (
  select
    trim(md.neighborhood) as neighborhood,
    date_trunc('month',md.period_date)::date as period_start,
    (date_trunc('month',md.period_date) + interval '1 month - 1 day')::date as period_end,
    max(md.inventory_count) filter (where md.inventory_count is not null) as active_inventory,
    max(md.absorption_rate) filter (where md.absorption_rate is not null) as absorption_rate,
    max(md.avg_days_on_market) filter (where md.avg_days_on_market is not null) as median_days_on_market,
    array_remove(array_agg(distinct ms.id),null)::uuid[] as source_ids
  from market_data md
  left join market_sources ms on ms.name=md.source or ms.code='legacy-' || lower(regexp_replace(coalesce(md.source,'source'), '[^a-zA-Z0-9]+', '-', 'g'))
  where md.period_date is not null and nullif(trim(md.neighborhood),'') is not null
  group by trim(md.neighborhood),date_trunc('month',md.period_date)
), combined as (
  select * from normalized
  union all
  select
    trim(nmd.neighborhood),
    date_trunc('month',nmd.snapshot_date)::date,
    (date_trunc('month',nmd.snapshot_date)+interval '1 month - 1 day')::date,
    max(nmd.inventory_count),
    max(nmd.absorption_rate),
    max(nmd.avg_days_on_market),
    array_remove(array_agg(distinct ms.id),null)::uuid[]
  from neighborhood_market_data nmd
  left join market_sources ms on ms.name=nmd.source or ms.code='legacy-' || lower(regexp_replace(coalesce(nmd.source,'source'), '[^a-zA-Z0-9]+', '-', 'g'))
  where nmd.snapshot_date is not null and nullif(trim(nmd.neighborhood),'') is not null
  group by trim(nmd.neighborhood),date_trunc('month',nmd.snapshot_date)
), rolled as (
  select neighborhood,period_start,period_end,
    max(active_inventory) as active_inventory,
    max(absorption_rate) as absorption_rate,
    max(median_days_on_market) as median_days_on_market,
    array(select distinct unnest(source_ids))::uuid[] as source_ids
  from combined
  group by neighborhood,period_start,period_end
)
insert into market_metric_snapshots (
  period_start,period_end,neighborhood_id,property_type,active_inventory,new_listings,removed_listings,confirmed_sales,median_days_on_market,absorption_rate,offer_to_sales_ratio,source_ids,methodology_version
)
select
  r.period_start,r.period_end,mn.id,'all',coalesce(r.active_inventory,0),0,0,0,r.median_days_on_market,r.absorption_rate,null,coalesce(r.source_ids,'{}'::uuid[]),'legacy-bridge-v1'
from rolled r
join market_neighborhoods mn on mn.name=r.neighborhood
on conflict (period_start,period_end,neighborhood_id,property_type,methodology_version)
do update set
  active_inventory=excluded.active_inventory,
  median_days_on_market=excluded.median_days_on_market,
  absorption_rate=excluded.absorption_rate,
  source_ids=excluded.source_ids,
  generated_at=now();
