-- Property Partners valuation references must first belong to the same canonical PP KML barrio.

create or replace function public.valuation_cbrs_pp_kml_candidates(
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
  pp_kml_barrio text
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    t.id,
    t.event_key,
    t.transaction_date,
    t.address,
    t.rol,
    t.price_uf,
    t.built_area_m2,
    t.land_area_m2,
    t.latitude,
    t.longitude,
    t.neighborhood,
    vmn.barrio_nombre
  from public.market_cbrs_reference_transactions t
  join public.vitacura_market_neighborhoods vmn
    on lower(extensions.unaccent(vmn.barrio_nombre)) = lower(extensions.unaccent(trim(p_barrio)))
   and t.latitude is not null
   and t.longitude is not null
   and extensions.st_contains(
     vmn.geometry,
     extensions.st_setsrid(extensions.st_makepoint(t.longitude::double precision, t.latitude::double precision), 4326)
   )
  where lower(coalesce(t.property_type, '')) = lower(coalesce(p_property_type, ''))
    and coalesce(t.price_uf, 0) > 0
    and coalesce(t.built_area_m2, 0) > 0
    and (lower(coalesce(p_property_type, '')) <> 'casa' or coalesce(t.land_area_m2, 0) > 0)
  order by t.transaction_date desc nulls last, t.id
  limit greatest(1, least(coalesce(p_limit, 250), 1000));
$$;

revoke all on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) from public, anon, authenticated;
grant execute on function public.valuation_cbrs_pp_kml_candidates(text,text,integer) to service_role;

create or replace function public.valuation_portal_pp_kml_candidates(
  p_barrio text,
  p_property_type text,
  p_limit integer default 500
)
returns table(
  id uuid,
  source_listing_id text,
  url text,
  title text,
  normalized_address text,
  price_uf numeric,
  price_uf_m2 numeric,
  observed_at timestamptz,
  raw_payload jsonb,
  property_type text,
  useful_area_m2 numeric,
  built_area_m2 numeric,
  land_area_m2 numeric,
  bedrooms integer,
  bathrooms integer,
  parking_spaces integer,
  latitude numeric,
  longitude numeric,
  pp_kml_barrio text
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    ml.id,
    ml.source_listing_id,
    ml.url,
    ml.title,
    coalesce(ml.normalized_address, mp.normalized_address),
    ml.price_uf,
    ml.price_uf_m2,
    ml.observed_at,
    ml.raw_payload,
    mp.property_type,
    mp.useful_area_m2,
    mp.built_area_m2,
    mp.land_area_m2,
    mp.bedrooms,
    mp.bathrooms,
    mp.parking_spaces,
    coalesce(ml.latitude, mp.latitude),
    coalesce(ml.longitude, mp.longitude),
    vmn.barrio_nombre
  from public.market_current_listings ml
  join public.market_properties mp on mp.id = ml.property_id
  join public.vitacura_market_neighborhoods vmn
    on lower(extensions.unaccent(vmn.barrio_nombre)) = lower(extensions.unaccent(trim(p_barrio)))
   and coalesce(ml.latitude, mp.latitude) is not null
   and coalesce(ml.longitude, mp.longitude) is not null
   and extensions.st_contains(
     vmn.geometry,
     extensions.st_setsrid(
       extensions.st_makepoint(coalesce(ml.longitude, mp.longitude)::double precision, coalesce(ml.latitude, mp.latitude)::double precision),
       4326
     )
   )
  where ml.status = 'active'
    and lower(coalesce(mp.property_type, '')) = lower(coalesce(p_property_type, ''))
    and coalesce(ml.price_uf, 0) > 0
  order by ml.observed_at desc nulls last, ml.created_at desc
  limit greatest(1, least(coalesce(p_limit, 500), 1000));
$$;

revoke all on function public.valuation_portal_pp_kml_candidates(text,text,integer) from public, anon, authenticated;
grant execute on function public.valuation_portal_pp_kml_candidates(text,text,integer) to service_role;
