-- Avoid N x full-dataset median scans. Compute the PP KML barrio median once per candidate request.

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
  latitude numeric,
  longitude numeric,
  neighborhood text,
  pp_kml_barrio text,
  quality jsonb
)
language sql
stable
security invoker
set search_path = public, extensions, private, pg_temp
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
     and t.latitude is not null and t.longitude is not null
     and extensions.st_contains(vmn.geometry,extensions.st_setsrid(extensions.st_makepoint(t.longitude::double precision,t.latitude::double precision),4326))
    where lower(coalesce(t.property_type,''))=lower(coalesce(p_property_type,''))
      and coalesce(t.price_uf,0)>0
      and coalesce(t.built_area_m2,0)>0
      and (lower(coalesce(p_property_type,''))<>'casa' or coalesce(t.land_area_m2,0)>0)
  ), stats as (
    select percentile_cont(0.5) within group (order by canonical_uf_m2) as median_uf_m2
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
    a.id,a.event_key,a.transaction_date,a.address,a.rol,a.price_uf,a.built_area_m2,a.land_area_m2,
    a.latitude,a.longitude,a.neighborhood,a.barrio_nombre,
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
      'policy','cbrs_quality_v4_pp_kml_single_pass'
    )
  from assessed a
  where not a.same_rol_conflict
  order by a.transaction_date desc nulls last,a.id
  limit greatest(1,least(coalesce(p_limit,250),1000));
$$;

revoke all on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) from public,anon,authenticated;
grant execute on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) to service_role;

-- Also make the per-reference quality function use a direct polygon join instead of resolving every row through a helper.
create or replace function private.cbrs_reference_quality_v2(
  p_source_reference text,
  p_price_uf numeric,
  p_price_uf_m2 numeric,
  p_neighborhood text,
  p_property_type text
)
returns jsonb
language plpgsql
stable
set search_path=''
as $$
declare
  v_event_key text;
  v_rol text;
  v_ref public.market_cbrs_reference_transactions%rowtype;
  v_kml_neighborhood text;
  v_transaction_count integer:=0;
  v_min_uf numeric;
  v_max_uf numeric;
  v_price_ratio numeric;
  v_same_rol_conflict boolean:=false;
  v_median_uf_m2 numeric;
  v_ratio_to_median numeric;
  v_geo_conflict boolean:=false;
  v_price_outlier boolean:=false;
begin
  v_event_key:=substring(coalesce(p_source_reference,'') from '([0-9]+\|[0-9]+\|[0-9]{4}-[0-9]{2}-[0-9]{2}\|[0-9]{4})');
  v_rol:=substring(coalesce(p_source_reference,'') from 'ROL ([^ ]+)');
  if v_event_key is not null then select * into v_ref from public.market_cbrs_reference_transactions r where r.event_key=v_event_key limit 1; end if;
  if v_ref.id is null and v_rol is not null then
    select * into v_ref from public.market_cbrs_reference_transactions r where r.rol=v_rol and (p_price_uf is null or r.price_uf=p_price_uf) order by r.transaction_date desc limit 1;
  end if;
  v_rol:=coalesce(v_ref.rol,v_rol);
  v_kml_neighborhood:=private.resolve_vitacura_kml_neighborhood_v1(v_ref.latitude,v_ref.longitude);
  if v_rol is not null then
    select q.transaction_count,q.min_price_uf,q.max_price_uf,q.price_ratio,q.has_extreme_price_conflict
      into v_transaction_count,v_min_uf,v_max_uf,v_price_ratio,v_same_rol_conflict
    from private.market_cbrs_rol_quality_v1 q where q.rol=v_rol;
  end if;
  if v_ref.id is not null and nullif(trim(coalesce(v_kml_neighborhood,'')),'') is not null then
    select percentile_cont(0.5) within group (order by case
      when lower(extensions.unaccent(coalesce(v_ref.property_type,'')))='casa'
        then rr.price_uf/nullif(rr.built_area_m2+coalesce(rr.land_area_m2,0)/4.0,0)
      else rr.price_uf/nullif(rr.built_area_m2,0)
    end)
    into v_median_uf_m2
    from public.market_cbrs_reference_transactions rr
    join public.vitacura_market_neighborhoods vmn
      on lower(extensions.unaccent(vmn.barrio_nombre))=lower(extensions.unaccent(v_kml_neighborhood))
     and rr.latitude is not null and rr.longitude is not null
     and extensions.st_contains(vmn.geometry,extensions.st_setsrid(extensions.st_makepoint(rr.longitude::double precision,rr.latitude::double precision),4326))
    where rr.price_uf>0 and rr.built_area_m2>0
      and lower(extensions.unaccent(coalesce(rr.property_type,'')))=lower(extensions.unaccent(coalesce(v_ref.property_type,'')))
      and (lower(extensions.unaccent(coalesce(v_ref.property_type,'')))<>'casa' or coalesce(rr.land_area_m2,0)>0);
  end if;
  if coalesce(p_price_uf_m2,0)>0 and coalesce(v_median_uf_m2,0)>0 then
    v_ratio_to_median:=p_price_uf_m2/v_median_uf_m2;
    v_price_outlier:=v_ratio_to_median>=3 or v_ratio_to_median<=1.0/3.0;
  end if;
  if nullif(trim(coalesce(v_kml_neighborhood,'')),'') is not null and nullif(trim(coalesce(p_neighborhood,'')),'') is not null then
    v_geo_conflict:=lower(extensions.unaccent(v_kml_neighborhood))<>lower(extensions.unaccent(p_neighborhood));
  end if;
  return jsonb_build_object('referenceFound',v_ref.id is not null,'eventKey',v_event_key,'rol',v_rol,'kmlNeighborhood',v_kml_neighborhood,'storedNeighborhood',v_ref.neighborhood,'comparableNeighborhood',p_neighborhood,'geographyConflict',v_geo_conflict,'transactionCount',coalesce(v_transaction_count,0),'minUf',v_min_uf,'maxUf',v_max_uf,'priceRatio',v_price_ratio,'sameRolPriceConflict',coalesce(v_same_rol_conflict,false),'neighborhoodTypeMedianUfM2',case when v_median_uf_m2 is null then null else round(v_median_uf_m2::numeric,2) end,'ufM2RatioToMedian',case when v_ratio_to_median is null then null else round(v_ratio_to_median::numeric,2) end,'priceOutlier',v_price_outlier,'policy','cbrs_quality_v4_pp_kml_single_pass');
end;
$$;
