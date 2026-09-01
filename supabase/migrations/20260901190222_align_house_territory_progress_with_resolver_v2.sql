create or replace function public.get_market_house_territory_progress_v1()
returns table(
  portal_current_houses bigint,
  exact_kml_houses bigint,
  pending_unique_suggestions bigint,
  ambiguous_suggestions bigint,
  unmatched_houses bigint,
  accepted_reviews bigint,
  rejected_reviews bigint
)
language plpgsql
stable
security definer
set search_path=''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id=auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode='42501';
  end if;

  return query
  with source as (
    select ms.id
    from public.market_sources ms
    where ms.code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), kml_source as (
    select ms.id
    from public.market_sources ms
    where ms.code='kml_vitacura_barrios_2026_08_12'
    limit 1
  ), current_houses as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.property_id,l.status,l.operation
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.decision,r.classification,r.created_at
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source)
    order by l.source_listing_id,r.created_at desc,r.id desc
  ), resolved as (
    select ch.source_listing_id,ch.property_id,
           mp.neighborhood_id as property_neighborhood_id,
           property_neighborhood.geometry_source_id as property_geometry_source_id,
           lr.decision,lr.classification,
           sig.neighborhood_id as resolved_neighborhood_id
    from current_houses ch
    left join public.market_properties mp on mp.id=ch.property_id
    left join public.market_neighborhoods property_neighborhood on property_neighborhood.id=mp.neighborhood_id
    left join latest_review lr using(source_listing_id)
    left join lateral private.resolve_market_neighborhood_signal_v2(ch.id) sig on true
    where ch.status in ('active','observed')
      and lower(btrim(coalesce(ch.operation,''))) in ('sale','venta')
  ), classified as (
    select r.*,
      (
        r.property_neighborhood_id is not null
        and r.property_geometry_source_id=(select id from kml_source)
        and (r.resolved_neighborhood_id is null or r.resolved_neighborhood_id=r.property_neighborhood_id)
      ) as canonical_exact
    from resolved r
  )
  select
    count(*)::bigint,
    count(*) filter (where c.canonical_exact)::bigint,
    count(*) filter (
      where c.decision='pending'
        and c.resolved_neighborhood_id is not null
        and not c.canonical_exact
    )::bigint,
    count(*) filter (
      where c.decision='pending'
        and c.resolved_neighborhood_id is null
        and c.classification='ambiguous'
    )::bigint,
    count(*) filter (
      where c.decision='pending'
        and c.resolved_neighborhood_id is null
        and coalesce(c.classification,'no_match')<>'ambiguous'
    )::bigint,
    count(*) filter (where c.decision='accepted')::bigint,
    count(*) filter (where c.decision='discarded')::bigint
  from classified c;
end;
$function$;

revoke all on function public.get_market_house_territory_progress_v1() from public,anon;
grant execute on function public.get_market_house_territory_progress_v1() to authenticated;
