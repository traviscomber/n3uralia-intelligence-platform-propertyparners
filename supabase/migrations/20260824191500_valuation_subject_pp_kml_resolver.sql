create or replace function public.valuation_pp_kml_barrio_at(p_lat numeric, p_lon numeric)
returns text
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select vmn.barrio_nombre
  from public.vitacura_market_neighborhoods vmn
  where p_lat is not null
    and p_lon is not null
    and extensions.st_contains(
      vmn.geometry,
      extensions.st_setsrid(extensions.st_makepoint(p_lon::double precision, p_lat::double precision), 4326)
    )
  limit 1;
$$;

revoke all on function public.valuation_pp_kml_barrio_at(numeric,numeric) from public, anon, authenticated;
grant execute on function public.valuation_pp_kml_barrio_at(numeric,numeric) to service_role;
