begin;

create or replace function public.get_market_apartment_live_baseline_v1()
returns table(
  portal_listings bigint,
  portal_median_price_uf numeric,
  portal_median_uf_m2 numeric,
  portal_median_useful_area_m2 numeric,
  as_of_portal timestamptz,
  cbrs_transactions_24m bigint,
  cbrs_median_price_uf_24m numeric,
  cbrs_median_uf_m2_24m numeric,
  cbrs_from date,
  cbrs_to date
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with portal_source as (
    select ms.id
    from public.market_sources ms
    where ms.code='portal-inmobiliario-vitacura-portal-apartments'
    limit 1
  ),
  active as (
    select
      l.source_listing_id,
      l.price_uf,
      l.price_uf_m2,
      case
        when nullif(l.raw_payload->>'useful_area_m2','') ~ '^[0-9]+([.][0-9]+)?$'
          then (l.raw_payload->>'useful_area_m2')::numeric
      end as useful_area_m2,
      l.observed_at
    from public.market_current_listings l
    where l.source_id=(select id from portal_source)
      and l.status in ('active','observed')
  ),
  cmax as (
    select max(t.transaction_date) as max_date
    from public.market_cbrs_reference_transactions t
    where t.property_type='Departamento'
  ),
  cbrs as (
    select t.*
    from public.market_cbrs_reference_transactions t
    where t.property_type='Departamento'
      and t.transaction_date >= ((select max_date from cmax) - interval '24 months')
  )
  select
    count(*)::bigint,
    (percentile_cont(0.5) within group (order by a.price_uf)
      filter (where a.price_uf > 0))::numeric,
    (percentile_cont(0.5) within group (order by a.price_uf_m2)
      filter (where a.price_uf_m2 > 0))::numeric,
    (percentile_cont(0.5) within group (order by a.useful_area_m2)
      filter (where a.useful_area_m2 > 0))::numeric,
    max(a.observed_at),
    (select count(*)::bigint from cbrs),
    (select (percentile_cont(0.5) within group (order by c.price_uf)
      filter (where c.price_uf > 0))::numeric from cbrs c),
    (select (percentile_cont(0.5) within group (order by c.price_uf/nullif(c.built_area_m2,0))
      filter (where c.price_uf > 0 and c.built_area_m2 > 0))::numeric from cbrs c),
    (select min(c.transaction_date) from cbrs c),
    (select max(c.transaction_date) from cbrs c)
  from active a;
end;
$function$;

revoke all on function public.get_market_apartment_live_baseline_v1() from public, anon;
grant execute on function public.get_market_apartment_live_baseline_v1() to authenticated, service_role;

commit;
