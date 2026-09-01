alter function public.valuation_prc_lookup_v2(double precision,double precision) rename to valuation_prc_lookup_v2_internal_20260901;
alter function public.lookup_vitacura_prc_v1(double precision,double precision) rename to lookup_vitacura_prc_v1_internal_20260901;
alter function public.valuation_topography_lookup_v1(double precision,double precision,numeric) rename to valuation_topography_lookup_v1_internal_20260901;
alter function public.valuation_road_hierarchy_lookup_v1(double precision,double precision,numeric) rename to valuation_road_hierarchy_lookup_v1_internal_20260901;
alter function public.lo_curro_market_watch_v1() rename to lo_curro_market_watch_v1_internal_20260901;

revoke execute on function public.valuation_prc_lookup_v2_internal_20260901(double precision,double precision) from public,anon,authenticated;
revoke execute on function public.lookup_vitacura_prc_v1_internal_20260901(double precision,double precision) from public,anon,authenticated;
revoke execute on function public.valuation_topography_lookup_v1_internal_20260901(double precision,double precision,numeric) from public,anon,authenticated;
revoke execute on function public.valuation_road_hierarchy_lookup_v1_internal_20260901(double precision,double precision,numeric) from public,anon,authenticated;
revoke execute on function public.lo_curro_market_watch_v1_internal_20260901() from public,anon,authenticated;
grant execute on function public.valuation_prc_lookup_v2_internal_20260901(double precision,double precision) to service_role;
grant execute on function public.lookup_vitacura_prc_v1_internal_20260901(double precision,double precision) to service_role;
grant execute on function public.valuation_topography_lookup_v1_internal_20260901(double precision,double precision,numeric) to service_role;
grant execute on function public.valuation_road_hierarchy_lookup_v1_internal_20260901(double precision,double precision,numeric) to service_role;
grant execute on function public.lo_curro_market_watch_v1_internal_20260901() to service_role;

create function public.valuation_prc_lookup_v2(p_lat double precision,p_lon double precision) returns jsonb language plpgsql stable security definer set search_path='public','private','extensions','pg_temp' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and lower(coalesce(p.role,''))=any(array['admin','ceo','director','subdirector','seller','analyst']::text[])) then raise exception 'Insufficient permissions' using errcode='42501'; end if;
  return public.valuation_prc_lookup_v2_internal_20260901(p_lat,p_lon);
end $$;

create function public.lookup_vitacura_prc_v1(p_lat double precision,p_lon double precision) returns jsonb language plpgsql stable security definer set search_path='public','private','extensions','pg_temp' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and lower(coalesce(p.role,''))=any(array['admin','ceo','director','subdirector','seller','analyst']::text[])) then raise exception 'Insufficient permissions' using errcode='42501'; end if;
  return public.lookup_vitacura_prc_v1_internal_20260901(p_lat,p_lon);
end $$;

create function public.valuation_topography_lookup_v1(p_lat double precision,p_lon double precision,p_max_distance_m numeric default 120) returns jsonb language plpgsql stable security definer set search_path='public','private','extensions','pg_temp' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and lower(coalesce(p.role,''))=any(array['admin','ceo','director','subdirector','seller','analyst']::text[])) then raise exception 'Insufficient permissions' using errcode='42501'; end if;
  return public.valuation_topography_lookup_v1_internal_20260901(p_lat,p_lon,p_max_distance_m);
end $$;

create function public.valuation_road_hierarchy_lookup_v1(p_lat double precision,p_lon double precision,p_max_distance_m numeric default 150) returns jsonb language plpgsql stable security definer set search_path='public','private','extensions','pg_temp' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and lower(coalesce(p.role,''))=any(array['admin','ceo','director','subdirector','seller','analyst']::text[])) then raise exception 'Insufficient permissions' using errcode='42501'; end if;
  return public.valuation_road_hierarchy_lookup_v1_internal_20260901(p_lat,p_lon,p_max_distance_m);
end $$;

create function public.lo_curro_market_watch_v1() returns table(source_listing_id text,raw_address text,current_price_uf numeric,price_drop_pct numeric,market_signal text,terrain_position text,terrain_confidence text,data_confidence numeric,source_url text,refreshed_at timestamptz) language plpgsql stable security definer set search_path='public','private','pg_temp' as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and lower(coalesce(p.role,''))=any(array['admin','ceo','director','subdirector','seller','analyst']::text[])) then raise exception 'Insufficient permissions' using errcode='42501'; end if;
  return query select * from public.lo_curro_market_watch_v1_internal_20260901();
end $$;

revoke execute on function public.valuation_prc_lookup_v2(double precision,double precision) from public,anon;
revoke execute on function public.lookup_vitacura_prc_v1(double precision,double precision) from public,anon;
revoke execute on function public.valuation_topography_lookup_v1(double precision,double precision,numeric) from public,anon;
revoke execute on function public.valuation_road_hierarchy_lookup_v1(double precision,double precision,numeric) from public,anon;
revoke execute on function public.lo_curro_market_watch_v1() from public,anon;
grant execute on function public.valuation_prc_lookup_v2(double precision,double precision) to authenticated,service_role;
grant execute on function public.lookup_vitacura_prc_v1(double precision,double precision) to authenticated,service_role;
grant execute on function public.valuation_topography_lookup_v1(double precision,double precision,numeric) to authenticated,service_role;
grant execute on function public.valuation_road_hierarchy_lookup_v1(double precision,double precision,numeric) to authenticated,service_role;
grant execute on function public.lo_curro_market_watch_v1() to authenticated,service_role;
