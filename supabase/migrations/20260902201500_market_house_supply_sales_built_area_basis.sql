-- Correct the live-house UF/m2 basis before release.
-- The upstream price_uf_m2 field is not consistently price_uf / built_area_m2 for houses.
-- Keep all active listings in supply counts, but only listings with valid price UF and built area
-- participate in the Portal UF/m2 median. CBRS already uses the same built-area basis.

create or replace function public.get_market_house_supply_sales_live_v1()
returns table(
  neighborhood_name text,
  portal_listings bigint,
  cbrs_transactions bigint,
  portal_median_price_uf numeric,
  cbrs_median_price_uf numeric,
  price_gap_pct numeric,
  portal_median_uf_m2 numeric,
  cbrs_median_uf_m2 numeric,
  uf_m2_gap_pct numeric,
  supply_depth_ratio numeric,
  as_of_portal timestamptz,
  as_of_cbrs date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector', 'seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with portal_source as (
    select ms.id
    from public.market_sources ms
    where ms.code = 'portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ),
  kml_source as (
    select ms.id
    from public.market_sources ms
    where ms.code = 'kml_vitacura_barrios_2026_08_12'
    limit 1
  ),
  latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,
      l.source_listing_id,
      l.property_id,
      l.status,
      l.price_uf,
      nullif(l.raw_payload ->> 'built_area_m2', '')::numeric as built_area_m2,
      l.observed_at,
      l.created_at
    from public.market_listings l
    where l.source_id = (select id from portal_source)
    order by l.source_listing_id, l.observed_at desc nulls last, l.created_at desc
  ),
  latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,
      r.decision,
      r.suggested_neighborhood_id,
      r.created_at,
      r.id
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id = r.listing_id
    where l.source_id = (select id from portal_source)
    order by l.source_listing_id, r.created_at desc, r.id desc
  ),
  resolved_live as (
    select
      ll.source_listing_id,
      ll.price_uf,
      case
        when ll.price_uf > 0 and ll.built_area_m2 > 0
          then ll.price_uf / ll.built_area_m2
        else null
      end as derived_uf_m2,
      ll.observed_at,
      coalesce(
        case when pn.geometry_source_id = (select id from kml_source) then pn.name end,
        case
          when lr.decision in ('accepted', 'resolved_by_system')
            and rn.geometry_source_id = (select id from kml_source)
          then rn.name
        end
      ) as neighborhood_name
    from latest_listing ll
    left join public.market_properties mp on mp.id = ll.property_id
    left join public.market_neighborhoods pn on pn.id = mp.neighborhood_id
    left join latest_review lr on lr.source_listing_id = ll.source_listing_id
    left join public.market_neighborhoods rn on rn.id = lr.suggested_neighborhood_id
    where ll.status = 'active'
  ),
  portal as (
    select
      r.neighborhood_name,
      count(*)::bigint as portal_listings,
      (percentile_cont(0.5) within group (order by r.price_uf)
        filter (where r.price_uf > 0))::numeric as portal_median_price_uf,
      (percentile_cont(0.5) within group (order by r.derived_uf_m2)
        filter (where r.derived_uf_m2 > 0))::numeric as portal_median_uf_m2,
      max(r.observed_at) as as_of_portal
    from resolved_live r
    where nullif(btrim(r.neighborhood_name), '') is not null
    group by r.neighborhood_name
  ),
  cbrs as (
    select
      lower(extensions.unaccent(btrim(ct.neighborhood))) as neighborhood_key,
      count(*)::bigint as cbrs_transactions,
      (percentile_cont(0.5) within group (order by ct.price_uf)
        filter (where ct.price_uf > 0))::numeric as cbrs_median_price_uf,
      (percentile_cont(0.5) within group (order by ct.price_uf / nullif(ct.built_area_m2, 0))
        filter (where ct.price_uf > 0 and ct.built_area_m2 > 0))::numeric as cbrs_median_uf_m2,
      max(ct.transaction_date) as as_of_cbrs
    from public.market_cbrs_reference_transactions ct
    where ct.property_type = 'Casa'
      and nullif(btrim(ct.neighborhood), '') is not null
    group by lower(extensions.unaccent(btrim(ct.neighborhood)))
  )
  select
    p.neighborhood_name,
    p.portal_listings,
    coalesce(c.cbrs_transactions, 0)::bigint,
    p.portal_median_price_uf,
    c.cbrs_median_price_uf,
    case
      when p.portal_median_price_uf is null or c.cbrs_median_price_uf is null or c.cbrs_median_price_uf = 0 then null
      else (p.portal_median_price_uf - c.cbrs_median_price_uf) / c.cbrs_median_price_uf
    end::numeric as price_gap_pct,
    p.portal_median_uf_m2,
    c.cbrs_median_uf_m2,
    case
      when p.portal_median_uf_m2 is null or c.cbrs_median_uf_m2 is null or c.cbrs_median_uf_m2 = 0 then null
      else (p.portal_median_uf_m2 - c.cbrs_median_uf_m2) / c.cbrs_median_uf_m2
    end::numeric as uf_m2_gap_pct,
    case
      when coalesce(c.cbrs_transactions, 0) = 0 then null
      else p.portal_listings::numeric / c.cbrs_transactions::numeric
    end as supply_depth_ratio,
    p.as_of_portal,
    c.as_of_cbrs
  from portal p
  left join cbrs c
    on c.neighborhood_key = lower(extensions.unaccent(btrim(p.neighborhood_name)))
  order by p.portal_listings desc, p.neighborhood_name;
end;
$$;

revoke all on function public.get_market_house_supply_sales_live_v1() from public, anon;
grant execute on function public.get_market_house_supply_sales_live_v1() to authenticated;

comment on function public.get_market_house_supply_sales_live_v1() is
  'Authenticated live house supply vs CBRS metrics by canonical Property Partners KML neighborhood. Portal and CBRS UF/m2 are both derived from price UF divided by built area where available. Exposes observed metrics only; it does not classify price signals.';
