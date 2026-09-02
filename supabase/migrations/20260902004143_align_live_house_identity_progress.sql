create or replace function public.get_market_house_identity_progress_v1()
returns table(
  portal_current_houses bigint,
  linked_houses bigint,
  unlinked_houses bigint,
  external_identity_collisions bigint,
  unlinked_without_existing_external_identity bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with source as (
    select id
    from public.market_sources
    where code = 'portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,
      l.property_id,
      l.status
    from public.market_listings l
    where l.source_id = (select id from source)
      and nullif(btrim(l.source_listing_id), '') is not null
    order by l.source_listing_id, l.observed_at desc nulls last, l.created_at desc
  ), live as (
    select source_listing_id, property_id
    from latest_listing
    where status = 'active'
  ), identity_counts as (
    select
      l.source_listing_id,
      l.property_id,
      count(distinct candidate.id)::bigint as canonical_property_candidates
    from live l
    left join public.market_properties candidate
      on l.property_id is null
      and candidate.property_type = 'Casa'
      and coalesce(candidate.identity_evidence::text, '') ilike '%' || l.source_listing_id || '%'
    group by l.source_listing_id, l.property_id
  )
  select
    count(*)::bigint,
    count(*) filter (where property_id is not null)::bigint,
    count(*) filter (where property_id is null)::bigint,
    count(*) filter (where property_id is null and canonical_property_candidates > 1)::bigint,
    count(*) filter (where property_id is null and canonical_property_candidates = 0)::bigint
  from identity_counts;
end;
$function$;