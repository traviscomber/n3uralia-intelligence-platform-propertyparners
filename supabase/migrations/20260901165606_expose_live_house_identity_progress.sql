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
set search_path = 'pg_catalog', 'public', 'private'
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with live as (
    select ml.source_listing_id, ml.property_id
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    left join public.market_properties mp on mp.id = ml.property_id
    where coalesce(
      nullif(ms.metadata ->> 'dataset_kind',''),
      case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end
    ) = 'portal_houses'
      and lower(btrim(ml.operation)) in ('sale','venta')
      and ml.status in ('active','observed')
      and nullif(btrim(ml.source_listing_id),'') is not null
  ), identity_counts as (
    select
      l.source_listing_id,
      l.property_id,
      count(distinct candidate.id)::bigint as canonical_property_candidates
    from live l
    left join public.market_properties candidate
      on l.property_id is null
      and candidate.property_type = 'Casa'
      and coalesce(candidate.identity_evidence::text,'') ilike '%' || l.source_listing_id || '%'
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
$$;

revoke all on function public.get_market_house_identity_progress_v1() from public;
revoke all on function public.get_market_house_identity_progress_v1() from anon;
grant execute on function public.get_market_house_identity_progress_v1() to authenticated;
