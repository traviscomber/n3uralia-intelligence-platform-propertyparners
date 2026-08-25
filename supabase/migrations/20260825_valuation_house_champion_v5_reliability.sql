create table if not exists public.valuation_house_champion_v5_reliability (
  barrio text not null,
  evaluation_year integer not null,
  methodology_version text not null default 'property-partners-house-champion-v5',
  sample_count integer not null,
  mape_pct numeric not null,
  median_abs_error_pct numeric not null,
  p80_abs_error_pct numeric not null,
  p90_abs_error_pct numeric not null,
  within_10_pct numeric not null,
  within_15_pct numeric not null,
  within_20_pct numeric not null,
  reliability text not null,
  review_mode text not null,
  generated_at timestamptz not null default now(),
  primary key (barrio,evaluation_year,methodology_version)
);

alter table public.valuation_house_champion_v5_reliability enable row level security;
revoke all on public.valuation_house_champion_v5_reliability from anon, authenticated;
grant select on public.valuation_house_champion_v5_reliability to service_role;

create or replace function public.valuation_house_champion_v5_reliability_lookup(p_barrio text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with candidate as (
    select r.*
    from public.valuation_house_champion_v5_reliability r
    where lower(r.barrio)=lower(trim(p_barrio))
      and r.methodology_version='property-partners-house-champion-v5'
    order by r.evaluation_year desc
    limit 1
  ), fallback as (
    select r.*
    from public.valuation_house_champion_v5_reliability r
    where r.barrio='__GLOBAL__'
      and r.methodology_version='property-partners-house-champion-v5'
    order by r.evaluation_year desc
    limit 1
  ), chosen as (
    select * from candidate
    union all
    select * from fallback where not exists (select 1 from candidate)
    limit 1
  )
  select case when r.barrio is null then null else jsonb_build_object(
    'barrio',r.barrio,
    'isGlobalFallback',r.barrio='__GLOBAL__',
    'evaluationYear',r.evaluation_year,
    'methodologyVersion',r.methodology_version,
    'sampleCount',r.sample_count,
    'mapePct',r.mape_pct,
    'medianAbsErrorPct',r.median_abs_error_pct,
    'p80AbsErrorPct',r.p80_abs_error_pct,
    'p90AbsErrorPct',r.p90_abs_error_pct,
    'within10Pct',r.within_10_pct,
    'within15Pct',r.within_15_pct,
    'within20Pct',r.within_20_pct,
    'reliability',r.reliability,
    'reviewMode',r.review_mode,
    'generatedAt',r.generated_at
  ) end
  from chosen r;
$$;

revoke all on function public.valuation_house_champion_v5_reliability_lookup(text) from public,anon,authenticated;
grant execute on function public.valuation_house_champion_v5_reliability_lookup(text) to service_role;
