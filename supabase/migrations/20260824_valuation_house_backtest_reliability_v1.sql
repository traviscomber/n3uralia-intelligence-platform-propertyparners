create table if not exists public.valuation_house_backtest_reliability (
  barrio text not null,
  methodology_version text not null,
  evaluation_year integer not null,
  sample_count integer not null,
  mape_pct numeric(8,2) not null,
  median_abs_error_pct numeric(8,2) not null,
  bias_pct numeric(8,2) not null,
  within_10_pct numeric(8,2) not null,
  within_15_pct numeric(8,2) not null,
  within_20_pct numeric(8,2) not null,
  reliability text not null check (reliability in ('high','medium','low')),
  review_mode text not null check (review_mode in ('standard_review','reinforced_review','mandatory_professional_review')),
  generated_at timestamptz not null default now(),
  primary key (barrio, methodology_version, evaluation_year)
);

alter table public.valuation_house_backtest_reliability enable row level security;
revoke all on table public.valuation_house_backtest_reliability from public, anon, authenticated;
grant select, insert, update, delete on table public.valuation_house_backtest_reliability to service_role;

create or replace function public.valuation_house_reliability_v1(p_barrio text, p_methodology_version text default 'property-partners-valuation-v2-kml-house-robust-v4')
returns table(
  barrio text,
  sample_count integer,
  mape_pct numeric,
  median_abs_error_pct numeric,
  bias_pct numeric,
  within_15_pct numeric,
  within_20_pct numeric,
  reliability text,
  review_mode text,
  evaluation_year integer,
  generated_at timestamptz
)
language sql
stable
set search_path to 'public','pg_temp'
as $$
  select r.barrio,r.sample_count,r.mape_pct,r.median_abs_error_pct,r.bias_pct,r.within_15_pct,r.within_20_pct,r.reliability,r.review_mode,r.evaluation_year,r.generated_at
  from public.valuation_house_backtest_reliability r
  where lower(r.barrio)=lower(trim(p_barrio))
    and r.methodology_version=p_methodology_version
  order by r.evaluation_year desc,r.generated_at desc
  limit 1;
$$;

revoke all on function public.valuation_house_reliability_v1(text,text) from public, anon, authenticated;
grant execute on function public.valuation_house_reliability_v1(text,text) to service_role;
