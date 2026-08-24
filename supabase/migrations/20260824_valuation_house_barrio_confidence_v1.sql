create or replace function public.valuation_house_barrio_confidence_v1(p_barrio text)
returns table(
  barrio text,
  total_5y integer,
  clean_5y integer,
  flagged_5y integer,
  flagged_pct numeric,
  median_uf_m2 numeric,
  iqr_pct numeric,
  confidence text,
  review_mode text
)
language sql
stable
set search_path to 'public','extensions','private','pg_temp'
as $$
with candidates as (
  select
    c.*,
    c.price_uf/nullif(c.built_area_m2+c.land_area_m2/4.0,0) as uf_m2,
    coalesce((c.quality->>'priceOutlier')::boolean,false) as flagged
  from public.valuation_cbrs_pp_kml_candidates(p_barrio,'Casa',1000) c
  where c.transaction_date >= current_date - interval '5 years'
), stats as (
  select
    count(*)::integer as total_5y,
    count(*) filter(where not flagged)::integer as clean_5y,
    count(*) filter(where flagged)::integer as flagged_5y,
    percentile_cont(.25) within group(order by uf_m2) filter(where not flagged) as q1,
    percentile_cont(.5) within group(order by uf_m2) filter(where not flagged) as med,
    percentile_cont(.75) within group(order by uf_m2) filter(where not flagged) as q3
  from candidates
), scored as (
  select *,
    case when total_5y>0 then 100.0*flagged_5y/total_5y else null end as flagged_pct,
    case when med>0 then 100.0*(q3-q1)/med else null end as iqr_pct
  from stats
)
select
  p_barrio,
  total_5y,
  clean_5y,
  flagged_5y,
  round(flagged_pct::numeric,1),
  round(med::numeric,2),
  round(iqr_pct::numeric,1),
  case
    when clean_5y>=60 and coalesce(iqr_pct,999)<=35 and coalesce(flagged_pct,999)<=15 then 'high'
    when clean_5y>=25 and coalesce(iqr_pct,999)<=55 and coalesce(flagged_pct,999)<=25 then 'medium'
    else 'low'
  end,
  case
    when clean_5y>=60 and coalesce(iqr_pct,999)<=35 and coalesce(flagged_pct,999)<=15 then 'standard_review'
    when clean_5y>=25 and coalesce(iqr_pct,999)<=55 and coalesce(flagged_pct,999)<=25 then 'reinforced_review'
    else 'mandatory_professional_review'
  end
from scored;
$$;

revoke all on function public.valuation_house_barrio_confidence_v1(text) from public,anon,authenticated;
grant execute on function public.valuation_house_barrio_confidence_v1(text) to service_role;
