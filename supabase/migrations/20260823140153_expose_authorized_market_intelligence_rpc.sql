-- Read-only market intelligence surfaces for authenticated internal users.
-- Raw listings and server-owned aggregates remain unavailable to client roles.

create or replace function public.get_market_current_listing_summary_v1()
returns table (
  dataset_kind text,
  active_listing_count bigint,
  current_listing_count bigint,
  median_price_uf numeric,
  median_uf_m2 numeric,
  median_area_m2 numeric,
  latest_observed_at timestamptz
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
  with classified as (
    select
      coalesce(
        nullif(ms.metadata ->> 'dataset_kind', ''),
        case mp.property_type
          when 'Departamento' then 'portal_apartments'
          when 'Casa' then 'portal_houses'
          when 'Proyecto' then 'portal_projects'
          else 'unknown'
        end
      ) as listing_kind,
      ml.status,
      ml.price_uf,
      ml.price_uf_m2,
      mp.useful_area_m2,
      ml.observed_at
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    left join public.market_properties mp on mp.id = ml.property_id
    where ms.source_type = 'portal'
      and ml.status in ('active', 'observed')
  )
  select
    classified.listing_kind,
    count(*) filter (where classified.status = 'active')::bigint,
    count(*)::bigint,
    (percentile_cont(0.5) within group (order by classified.price_uf)
      filter (where classified.price_uf is not null))::numeric,
    (percentile_cont(0.5) within group (order by classified.price_uf_m2)
      filter (where classified.price_uf_m2 is not null))::numeric,
    (percentile_cont(0.5) within group (order by classified.useful_area_m2)
      filter (where classified.useful_area_m2 is not null))::numeric,
    max(classified.observed_at)
  from classified
  group by classified.listing_kind
  order by classified.listing_kind;
end;
$$;

revoke all on function public.get_market_current_listing_summary_v1() from public, anon, authenticated;
grant execute on function public.get_market_current_listing_summary_v1() to authenticated;

comment on function public.get_market_current_listing_summary_v1()
is 'Aggregated current Portal listing summary for authenticated Property Partners users. Does not expose listing rows or raw payloads.';

create or replace function public.get_market_supply_sales_intelligence_v1()
returns table (
  neighborhood_name text,
  property_type text,
  portal_listings integer,
  cbrs_transactions integer,
  portal_median_price_uf numeric,
  cbrs_median_price_uf numeric,
  price_gap_pct numeric,
  portal_median_uf_m2 numeric,
  cbrs_median_uf_m2 numeric,
  uf_m2_gap_pct numeric,
  supply_depth_ratio numeric,
  signal text,
  confidence text,
  as_of_portal timestamptz,
  as_of_cbrs timestamptz
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
    i.neighborhood_name,
    i.property_type,
    i.portal_listings,
    i.cbrs_transactions,
    i.portal_median_price_uf,
    i.cbrs_median_price_uf,
    i.price_gap_pct,
    i.portal_median_uf_m2,
    i.cbrs_median_uf_m2,
    i.uf_m2_gap_pct,
    i.supply_depth_ratio,
    i.signal,
    i.confidence,
    i.as_of_portal,
    i.as_of_cbrs
  from public.market_supply_sales_intelligence i
  order by i.uf_m2_gap_pct desc nulls last, i.neighborhood_name;
end;
$$;

revoke all on function public.get_market_supply_sales_intelligence_v1() from public, anon, authenticated;
grant execute on function public.get_market_supply_sales_intelligence_v1() to authenticated;

comment on function public.get_market_supply_sales_intelligence_v1()
is 'Read-only offer-versus-sales aggregate for authenticated Property Partners users. Canonical data remains server-owned.';
