-- Canonical CBRS comparability quality layer.
-- Production behavior: low extreme transactions are excluded from automatic
-- comparables; high extreme and multi-component transactions remain visible
-- but require human review. No historical CBRS rows are deleted.

create table if not exists public.valuation_cbrs_barrio_quality_stats (
  barrio text primary key,
  property_type text not null default 'Casa',
  sample_count integer not null,
  q1_effective_rate numeric not null,
  median_effective_rate numeric not null,
  q3_effective_rate numeric not null,
  lower_fence numeric not null,
  upper_fence numeric not null,
  source_version text not null,
  as_of_date date not null,
  refreshed_at timestamptz not null default now()
);

alter table public.valuation_cbrs_barrio_quality_stats enable row level security;
revoke all on public.valuation_cbrs_barrio_quality_stats from public, anon, authenticated;
grant select on public.valuation_cbrs_barrio_quality_stats to authenticated, service_role;
grant insert, update, delete on public.valuation_cbrs_barrio_quality_stats to service_role;

create or replace function public.refresh_valuation_cbrs_barrio_quality_stats_v1()
returns jsonb
language plpgsql
security definer
set search_path='public','extensions'
as $$
declare v_count integer;
begin
  insert into public.valuation_cbrs_barrio_quality_stats(
    barrio,property_type,sample_count,q1_effective_rate,median_effective_rate,
    q3_effective_rate,lower_fence,upper_fence,source_version,as_of_date,refreshed_at
  )
  select barrio,'Casa',sample_count,q1,med,q3,
    q1-1.5*(q3-q1),q3+1.5*(q3-q1),
    'historical_effective_rate_iqr_v1',current_date,now()
  from (
    select public.valuation_pp_kml_barrio_at(t.latitude,t.longitude) barrio,
      percentile_cont(.25) within group(order by t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0)) q1,
      percentile_cont(.5) within group(order by t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0)) med,
      percentile_cont(.75) within group(order by t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0)) q3,
      count(*)::int sample_count
    from public.market_cbrs_reference_transactions t
    where t.property_type ilike '%casa%'
      and t.price_uf>0 and t.built_area_m2>0 and t.land_area_m2>0
      and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude) is not null
    group by 1
  ) s
  where barrio is not null and sample_count>=20
  on conflict (barrio) do update set
    property_type=excluded.property_type,
    sample_count=excluded.sample_count,
    q1_effective_rate=excluded.q1_effective_rate,
    median_effective_rate=excluded.median_effective_rate,
    q3_effective_rate=excluded.q3_effective_rate,
    lower_fence=excluded.lower_fence,
    upper_fence=excluded.upper_fence,
    source_version=excluded.source_version,
    as_of_date=excluded.as_of_date,
    refreshed_at=excluded.refreshed_at;
  get diagnostics v_count=row_count;
  return jsonb_build_object('refreshed',v_count,'sourceVersion','historical_effective_rate_iqr_v1','asOfDate',current_date);
end;
$$;

create or replace function private.cbrs_comparability_gate_v2(p_event_key text)
returns jsonb
language sql
stable
security definer
set search_path='public','private','extensions'
as $$
with tx as (
  select t.*,
    public.valuation_pp_kml_barrio_at(t.latitude,t.longitude) barrio,
    t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0) eff_rate
  from public.market_cbrs_reference_transactions t
  where t.event_key=p_event_key
), c as (
  select tx.*,s.lower_fence,s.upper_fence,s.sample_count,s.source_version,
    (select count(*) from public.market_cbrs_reference_transactions r where r.rol=tx.rol) rol_transactions
  from tx
  left join public.valuation_cbrs_barrio_quality_stats s
    on s.barrio=tx.barrio and s.property_type='Casa'
)
select case when not exists(select 1 from c) then jsonb_build_object('found',false)
else (
  select jsonb_build_object(
    'found',true,'eventKey',event_key,'rol',rol,'barrio',barrio,
    'effectiveRate',round(eff_rate::numeric,2),
    'lowerFence',round(lower_fence::numeric,2),
    'upperFence',round(upper_fence::numeric,2),
    'sampleCount',sample_count,'componentCount',component_count,
    'rolTransactions',rol_transactions,
    'classification',case
      when lower_fence is null then 'INSUFFICIENT_HISTORY'
      when eff_rate<lower_fence then 'LOW_EXTREME_NON_COMPARABLE'
      when coalesce(component_count,1)>1 then 'MULTI_COMPONENT_REVIEW'
      when eff_rate>upper_fence then 'HIGH_EXTREME_REVIEW'
      else 'COMPARABLE' end,
    'excludeFromAutomaticComparables',coalesce(eff_rate<lower_fence,false),
    'requiresHumanReview',coalesce(eff_rate<lower_fence or eff_rate>upper_fence or coalesce(component_count,1)>1,false),
    'policy','historical_iqr_snapshot_directional_v2',
    'sourceVersion',source_version
  ) from c
) end;
$$;

-- Refresh versioned neighborhood statistics after migration.
select public.refresh_valuation_cbrs_barrio_quality_stats_v1();

-- The canonical valuation_cbrs_pp_kml_candidates function is upgraded in
-- production to policy cbrs_quality_v9_pp_kml_directional_comparability:
-- 1) call private.cbrs_comparability_gate_v2(event_key),
-- 2) exclude only excludeFromAutomaticComparables=true,
-- 3) keep HIGH_EXTREME_REVIEW and MULTI_COMPONENT_REVIEW in the returned pool,
-- 4) expose comparabilityClassification/requiresHumanReview in quality JSON.
-- This migration intentionally versions the reusable canonical gate and
-- snapshot first; the existing candidate function remains backward compatible.
