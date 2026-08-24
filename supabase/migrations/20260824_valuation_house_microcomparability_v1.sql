drop function if exists public.valuation_cbrs_pp_kml_candidates(text,text,integer);

create function public.valuation_cbrs_pp_kml_candidates(
  p_barrio text,
  p_property_type text,
  p_limit integer default 250
)
returns table(
  id uuid,
  event_key text,
  transaction_date date,
  address text,
  rol text,
  price_uf numeric,
  built_area_m2 numeric,
  land_area_m2 numeric,
  construction_year integer,
  bedrooms_bathrooms text,
  latitude numeric,
  longitude numeric,
  neighborhood text,
  pp_kml_barrio text,
  quality jsonb
)
language sql
stable
set search_path to 'public','extensions','private','pg_temp'
as $$
with eligible as (
  select
    t.*,
    vmn.barrio_nombre,
    case
      when lower(coalesce(p_property_type,''))='casa'
        then t.price_uf/nullif(t.built_area_m2+coalesce(t.land_area_m2,0)/4.0,0)
      else t.price_uf/nullif(t.built_area_m2,0)
    end as canonical_uf_m2
  from public.market_cbrs_reference_transactions t
  join public.vitacura_market_neighborhoods vmn
    on lower(extensions.unaccent(vmn.barrio_nombre))=lower(extensions.unaccent(trim(p_barrio)))
   and t.latitude is not null
   and t.longitude is not null
   and extensions.st_contains(
     vmn.geometry,
     extensions.st_setsrid(extensions.st_makepoint(t.longitude::double precision,t.latitude::double precision),4326)
   )
  where lower(coalesce(t.property_type,''))=lower(coalesce(p_property_type,''))
    and coalesce(t.price_uf,0)>0
    and coalesce(t.built_area_m2,0)>0
    and (lower(coalesce(p_property_type,''))<>'casa' or coalesce(t.land_area_m2,0)>0)
), stats as (
  select percentile_cont(0.5) within group(order by canonical_uf_m2) as median_uf_m2
  from eligible
  where canonical_uf_m2>0
), assessed as (
  select
    e.*,
    s.median_uf_m2,
    q.transaction_count,
    q.min_price_uf,
    q.max_price_uf,
    q.price_ratio,
    coalesce(q.has_extreme_price_conflict,false) as same_rol_conflict,
    case when s.median_uf_m2>0 then e.canonical_uf_m2/s.median_uf_m2 else null end as ratio_to_median
  from eligible e
  cross join stats s
  left join private.market_cbrs_rol_quality_v1 q on q.rol=e.rol
)
select
  a.id,
  a.event_key,
  a.transaction_date,
  a.address,
  a.rol,
  a.price_uf,
  a.built_area_m2,
  a.land_area_m2,
  a.construction_year,
  a.bedrooms_bathrooms,
  a.latitude,
  a.longitude,
  a.neighborhood,
  a.barrio_nombre,
  jsonb_build_object(
    'referenceFound',true,
    'eventKey',a.event_key,
    'rol',a.rol,
    'kmlNeighborhood',a.barrio_nombre,
    'storedNeighborhood',a.neighborhood,
    'comparableNeighborhood',a.barrio_nombre,
    'geographyConflict',false,
    'transactionCount',coalesce(a.transaction_count,0),
    'minUf',a.min_price_uf,
    'maxUf',a.max_price_uf,
    'priceRatio',a.price_ratio,
    'sameRolPriceConflict',a.same_rol_conflict,
    'neighborhoodTypeMedianUfM2',round(a.median_uf_m2::numeric,2),
    'ufM2RatioToMedian',case when a.ratio_to_median is null then null else round(a.ratio_to_median::numeric,2) end,
    'priceOutlier',coalesce(a.ratio_to_median>=3 or a.ratio_to_median<=1.0/3.0,false),
    'policy','cbrs_quality_v5_pp_kml_microcomparability'
  )
from assessed a
where not a.same_rol_conflict
order by a.transaction_date desc nulls last,a.id
limit greatest(1,least(coalesce(p_limit,250),1000));
$$;

revoke all on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) from public, anon, authenticated;
grant execute on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) to service_role;
