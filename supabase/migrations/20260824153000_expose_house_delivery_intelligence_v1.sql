-- Contractual market intelligence surface: houses for sale in Vitacura only.
-- The functions expose aggregates and preserve raw canonical tables server-side.

create or replace function public.get_market_house_delivery_summary_v1()
returns table (
  portal_active_houses bigint,
  portal_current_houses bigint,
  portal_priced_houses bigint,
  portal_priced_m2_houses bigint,
  portal_exact_kml_houses bigint,
  portal_median_price_uf numeric,
  portal_median_uf_m2 numeric,
  portal_as_of timestamptz,
  reference_houses bigint,
  reference_geocoded_houses bigint,
  reference_priced_houses bigint,
  reference_median_price_uf numeric,
  reference_median_uf_m2 numeric,
  reference_median_area_m2 numeric,
  reference_as_of timestamptz,
  cbrs_house_transactions bigint,
  cbrs_house_with_neighborhood bigint,
  cbrs_median_price_uf numeric,
  cbrs_median_uf_m2 numeric,
  cbrs_median_built_area_m2 numeric,
  cbrs_median_land_area_m2 numeric,
  cbrs_as_of date,
  canonical_houses bigint,
  confirmed_houses bigint,
  exact_kml_houses bigint,
  review_houses bigint,
  missing_neighborhood_houses bigint,
  kml_neighborhoods bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector', 'seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with kml_source as (
    select ms.id
    from public.market_sources ms
    where ms.code = 'kml_vitacura_barrios_2026_08_12'
    order by ms.imported_at desc nulls last
    limit 1
  ),
  portal_houses as (
    select
      ml.status,
      ml.price_uf,
      ml.price_uf_m2,
      ml.observed_at,
      mn.geometry_source_id
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    left join public.market_properties mp on mp.id = ml.property_id
    left join public.market_neighborhoods mn on mn.id = mp.neighborhood_id
    where ms.source_type = 'portal'
      and coalesce(
        nullif(ms.metadata ->> 'dataset_kind', ''),
        case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end
      ) = 'portal_houses'
      and lower(btrim(ml.operation)) in ('sale', 'venta')
      and ml.status in ('active', 'observed')
  ),
  portal_summary as (
    select
      count(*) filter (where ph.status = 'active')::bigint as active_houses,
      count(*)::bigint as current_houses,
      count(*) filter (where ph.price_uf is not null)::bigint as priced_houses,
      count(*) filter (where ph.price_uf_m2 is not null)::bigint as priced_m2_houses,
      count(*) filter (
        where ph.geometry_source_id = (select ks.id from kml_source ks)
      )::bigint as exact_kml_houses,
      (percentile_cont(0.5) within group (order by ph.price_uf)
        filter (where ph.price_uf > 0))::numeric as median_price_uf,
      (percentile_cont(0.5) within group (order by ph.price_uf_m2)
        filter (where ph.price_uf_m2 > 0))::numeric as median_uf_m2,
      max(ph.observed_at) as as_of
    from portal_houses ph
  ),
  reference_latest as (
    select
      pm.listing_count,
      pm.geocoded_count,
      pm.priced_count,
      pm.median_price_uf,
      pm.median_uf_m2,
      pm.median_area_m2,
      pm.observed_at
    from public.market_portal_reference_metrics pm
    where pm.dataset_kind = 'portal_houses'
      and pm.scope = 'global'
    order by pm.observed_at desc
    limit 1
  ),
  reference_summary as (
    select
      max(rl.listing_count)::bigint as houses,
      max(rl.geocoded_count)::bigint as geocoded_houses,
      max(rl.priced_count)::bigint as priced_houses,
      max(rl.median_price_uf)::numeric as median_price_uf,
      max(rl.median_uf_m2)::numeric as median_uf_m2,
      max(rl.median_area_m2)::numeric as median_area_m2,
      max(rl.observed_at) as as_of
    from reference_latest rl
  ),
  cbrs_summary as (
    select
      count(*)::bigint as transactions,
      count(*) filter (
        where nullif(btrim(ct.neighborhood), '') is not null
      )::bigint as with_neighborhood,
      (percentile_cont(0.5) within group (order by ct.price_uf)
        filter (where ct.price_uf > 0))::numeric as median_price_uf,
      (percentile_cont(0.5) within group (order by ct.price_uf / nullif(ct.built_area_m2, 0))
        filter (where ct.price_uf > 0 and ct.built_area_m2 > 0))::numeric as median_uf_m2,
      (percentile_cont(0.5) within group (order by ct.built_area_m2)
        filter (where ct.built_area_m2 > 0))::numeric as median_built_area_m2,
      (percentile_cont(0.5) within group (order by ct.land_area_m2)
        filter (where ct.land_area_m2 > 0))::numeric as median_land_area_m2,
      max(ct.transaction_date) as as_of
    from public.market_cbrs_reference_transactions ct
    where ct.property_type = 'Casa'
  ),
  canonical_summary as (
    select
      count(*)::bigint as houses,
      count(*) filter (where mp.identity_status = 'confirmed')::bigint as confirmed_houses,
      count(*) filter (
        where mp.neighborhood_id in (
          select mn.id
          from public.market_neighborhoods mn
          where mn.geometry_source_id = (select ks.id from kml_source ks)
        )
      )::bigint as exact_kml_houses,
      count(*) filter (
        where mp.neighborhood_id is null
          or mp.neighborhood_id not in (
            select mn.id
            from public.market_neighborhoods mn
            where mn.geometry_source_id = (select ks.id from kml_source ks)
          )
      )::bigint as review_houses,
      count(*) filter (where mp.neighborhood_id is null)::bigint as missing_neighborhood_houses
    from public.market_properties mp
    where mp.property_type = 'Casa'
  ),
  territory_summary as (
    select count(*) filter (where mn.geometry is not null)::bigint as neighborhoods
    from public.market_neighborhoods mn
    where mn.geometry_source_id = (select ks.id from kml_source ks)
  )
  select
    ps.active_houses,
    ps.current_houses,
    ps.priced_houses,
    ps.priced_m2_houses,
    ps.exact_kml_houses,
    ps.median_price_uf,
    ps.median_uf_m2,
    ps.as_of,
    rs.houses,
    rs.geocoded_houses,
    rs.priced_houses,
    rs.median_price_uf,
    rs.median_uf_m2,
    rs.median_area_m2,
    rs.as_of,
    cs.transactions,
    cs.with_neighborhood,
    cs.median_price_uf,
    cs.median_uf_m2,
    cs.median_built_area_m2,
    cs.median_land_area_m2,
    cs.as_of,
    cps.houses,
    cps.confirmed_houses,
    cps.exact_kml_houses,
    cps.review_houses,
    cps.missing_neighborhood_houses,
    ts.neighborhoods
  from portal_summary ps
  cross join reference_summary rs
  cross join cbrs_summary cs
  cross join canonical_summary cps
  cross join territory_summary ts;
end;
$$;

revoke all on function public.get_market_house_delivery_summary_v1() from public, anon, authenticated;
grant execute on function public.get_market_house_delivery_summary_v1() to authenticated;

comment on function public.get_market_house_delivery_summary_v1()
is 'Contractual aggregate for houses offered for sale in Vitacura. Sources: Portal, canonical Property Partners reference, CBRS and the accepted KML.';

create or replace function public.get_market_house_neighborhood_sales_v1()
returns table (
  neighborhood_name text,
  cbrs_transactions bigint,
  cbrs_median_price_uf numeric,
  cbrs_median_uf_m2 numeric,
  cbrs_as_of date
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector', 'seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  select
    btrim(ct.neighborhood) as neighborhood_name,
    count(*)::bigint as cbrs_transactions,
    (percentile_cont(0.5) within group (order by ct.price_uf)
      filter (where ct.price_uf > 0))::numeric as cbrs_median_price_uf,
    (percentile_cont(0.5) within group (order by ct.price_uf / nullif(ct.built_area_m2, 0))
      filter (where ct.price_uf > 0 and ct.built_area_m2 > 0))::numeric as cbrs_median_uf_m2,
    max(ct.transaction_date) as cbrs_as_of
  from public.market_cbrs_reference_transactions ct
  where ct.property_type = 'Casa'
    and nullif(btrim(ct.neighborhood), '') is not null
  group by btrim(ct.neighborhood)
  order by count(*) desc, btrim(ct.neighborhood);
end;
$$;

revoke all on function public.get_market_house_neighborhood_sales_v1() from public, anon, authenticated;
grant execute on function public.get_market_house_neighborhood_sales_v1() to authenticated;

comment on function public.get_market_house_neighborhood_sales_v1()
is 'Historical CBRS house-sale medians by canonical Property Partners neighborhood. No asking-price comparison is inferred.';
