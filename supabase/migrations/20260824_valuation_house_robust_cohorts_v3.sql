create or replace function public.valuation_cbrs_pp_kml_candidates(
  p_barrio text,
  p_property_type text,
  p_limit integer default 250
)
returns table(
  id uuid,event_key text,transaction_date date,address text,rol text,price_uf numeric,built_area_m2 numeric,land_area_m2 numeric,construction_year integer,bedrooms_bathrooms text,latitude numeric,longitude numeric,neighborhood text,pp_kml_barrio text,quality jsonb
)
language sql stable
set search_path to 'public','extensions','private','pg_temp'
as $$
with eligible as (
  select t.*,vmn.barrio_nombre,
    case when lower(coalesce(p_property_type,''))='casa' then t.price_uf/nullif(t.built_area_m2+coalesce(t.land_area_m2,0)/4.0,0) else t.price_uf/nullif(t.built_area_m2,0) end canonical_uf_m2,
    case when t.built_area_m2<150 then 1 when t.built_area_m2<300 then 2 when t.built_area_m2<450 then 3 else 4 end built_band,
    case when coalesce(t.land_area_m2,0)<300 then 1 when t.land_area_m2<600 then 2 when t.land_area_m2<1200 then 3 when t.land_area_m2<2500 then 4 else 5 end land_band
  from public.market_cbrs_reference_transactions t
  join public.vitacura_market_neighborhoods vmn on lower(extensions.unaccent(vmn.barrio_nombre))=lower(extensions.unaccent(trim(p_barrio)))
   and t.latitude is not null and t.longitude is not null
   and extensions.st_contains(vmn.geometry,extensions.st_setsrid(extensions.st_makepoint(t.longitude::double precision,t.latitude::double precision),4326))
  where lower(coalesce(t.property_type,''))=lower(coalesce(p_property_type,'')) and coalesce(t.price_uf,0)>0 and coalesce(t.built_area_m2,0)>0
    and (lower(coalesce(p_property_type,''))<>'casa' or coalesce(t.land_area_m2,0)>0)
), neighborhood_stats as (
  select percentile_cont(.25) within group(order by canonical_uf_m2) q1,percentile_cont(.5) within group(order by canonical_uf_m2) median_uf_m2,percentile_cont(.75) within group(order by canonical_uf_m2) q3,count(*) n from eligible where canonical_uf_m2>0
), cohort_stats as (
  select built_band,land_band,percentile_cont(.25) within group(order by canonical_uf_m2) q1,percentile_cont(.5) within group(order by canonical_uf_m2) median_uf_m2,percentile_cont(.75) within group(order by canonical_uf_m2) q3,count(*) n from eligible where canonical_uf_m2>0 group by built_band,land_band
), assessed as (
  select e.*,cs.n cohort_n,q.transaction_count,q.min_price_uf,q.max_price_uf,q.price_ratio,coalesce(q.has_extreme_price_conflict,false) same_rol_conflict,
    case when coalesce(cs.n,0)>=8 then cs.q1 else ns.q1 end effective_q1,
    case when coalesce(cs.n,0)>=8 then cs.q3 else ns.q3 end effective_q3,
    case when coalesce(cs.n,0)>=8 then cs.median_uf_m2 else ns.median_uf_m2 end effective_median,
    case when coalesce(cs.n,0)>=8 then 'size_land_cohort' else 'neighborhood_fallback' end robust_scope
  from eligible e cross join neighborhood_stats ns left join cohort_stats cs on cs.built_band=e.built_band and cs.land_band=e.land_band left join private.market_cbrs_rol_quality_v1 q on q.rol=e.rol
), flagged as (
  select a.*,greatest(1,a.effective_q1-1.5*(a.effective_q3-a.effective_q1)) lower_fence,a.effective_q3+1.5*(a.effective_q3-a.effective_q1) upper_fence,
    case when a.effective_median>0 then a.canonical_uf_m2/a.effective_median else null end ratio_to_median
  from assessed a
)
select f.id,f.event_key,f.transaction_date,f.address,f.rol,f.price_uf,f.built_area_m2,f.land_area_m2,f.construction_year,f.bedrooms_bathrooms,f.latitude,f.longitude,f.neighborhood,f.barrio_nombre,
 jsonb_build_object(
   'referenceFound',true,'eventKey',f.event_key,'rol',f.rol,'kmlNeighborhood',f.barrio_nombre,'storedNeighborhood',f.neighborhood,'comparableNeighborhood',f.barrio_nombre,'geographyConflict',false,
   'transactionCount',coalesce(f.transaction_count,0),'minUf',f.min_price_uf,'maxUf',f.max_price_uf,'priceRatio',f.price_ratio,'sameRolPriceConflict',f.same_rol_conflict,
   'robustScope',f.robust_scope,'cohortCount',coalesce(f.cohort_n,0),'builtBand',f.built_band,'landBand',f.land_band,'robustMedianUfM2',round(f.effective_median::numeric,2),
   'robustLowerFenceUfM2',round(f.lower_fence::numeric,2),'robustUpperFenceUfM2',round(f.upper_fence::numeric,2),'ufM2RatioToMedian',case when f.ratio_to_median is null then null else round(f.ratio_to_median::numeric,2) end,
   'iqrOutlier',coalesce(f.canonical_uf_m2<f.lower_fence or f.canonical_uf_m2>f.upper_fence,false),
   'cohortRatioOutlier',coalesce(f.ratio_to_median<0.65 or f.ratio_to_median>1.80,false),
   'rolRatioOutlier',coalesce(f.transaction_count>=2 and f.price_ratio>=1.8,false),
   'priceOutlier',coalesce(f.canonical_uf_m2<f.lower_fence or f.canonical_uf_m2>f.upper_fence or f.ratio_to_median<0.65 or f.ratio_to_median>1.80 or (f.transaction_count>=2 and f.price_ratio>=1.8),false),
   'policy','cbrs_quality_v8_pp_kml_robust_cohort'
 )
from flagged f where not f.same_rol_conflict order by f.transaction_date desc nulls last,f.id limit greatest(1,least(coalesce(p_limit,250),1000));
$$;

revoke all on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) from public,anon,authenticated;
grant execute on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) to service_role;
