create or replace function public.get_ceo_market_neighborhood_queue_v1()
returns table (
  review_id uuid,
  source_listing_id text,
  raw_address text,
  title text,
  url text,
  classification text,
  proposed_neighborhood_id uuid,
  proposed_neighborhood_name text,
  resolution_kind text,
  reason text,
  can_decide boolean,
  observed_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('ceo','admin')
  ) then
    raise exception 'CEO or admin role required';
  end if;

  return query
  with source as (
    select id
    from public.market_sources
    where code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.raw_address,l.title,l.url,l.status,l.observed_at
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.id,r.classification,r.decision,r.created_at
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source)
    order by l.source_listing_id,r.created_at desc,r.id desc
  )
  select lr.id,ll.source_listing_id,ll.raw_address,ll.title,ll.url,lr.classification,
         sig.neighborhood_id,sig.neighborhood_name,coalesce(sig.resolution_kind,'manual'),
         coalesce(sig.reason,'La evidencia disponible todavía no converge en un único barrio KML.'),
         (sig.neighborhood_id is not null),ll.observed_at
  from latest_listing ll
  join latest_review lr using(source_listing_id)
  left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig on true
  where ll.status='active' and lr.decision='pending'
  order by case when sig.neighborhood_id is not null then 0 else 1 end,
           ll.observed_at desc nulls last,
           ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;
