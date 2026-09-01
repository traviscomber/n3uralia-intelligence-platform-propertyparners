create or replace view private.market_properties_vitacura_scope_v1 as
select
  mp.id as property_id,
  case
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%vitacura%' then 'in_scope_explicit'
    when
      lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%colina%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%chicureo%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%pucon%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%lo barnechea%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%la dehesa%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%las condes%'
    then 'out_of_scope_explicit'
    else 'unknown'
  end as scope_status,
  case
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%vitacura%' then 'address_explicitly_names_vitacura'
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%colina%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%chicureo%' then 'address_explicitly_names_colina_or_chicureo'
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%pucon%' then 'address_explicitly_names_pucon'
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%lo barnechea%'
      or lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%la dehesa%' then 'address_explicitly_names_lo_barnechea_or_la_dehesa'
    when lower(extensions.unaccent(coalesce(mp.normalized_address,''))) like '%las condes%' then 'address_explicitly_names_las_condes'
    else 'address_scope_not_explicit'
  end as scope_reason
from public.market_properties mp
where mp.property_type='Casa';

create or replace function public.get_market_house_scope_summary_v1()
returns table(
  physical_house_rows bigint,
  v1_house_rows bigint,
  explicit_out_of_scope_rows bigint,
  v1_confirmed_rows bigint,
  v1_missing_neighborhood_rows bigint,
  v1_identity_candidates bigint,
  logical_house_components bigint,
  confirmed_duplicate_rows bigint,
  duplicate_components bigint,
  logical_components_with_neighborhood bigint,
  conflicting_neighborhood_components bigint
)
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode='42501';
  end if;

  return query
  with recursive
  all_houses as (
    select mp.id,mp.neighborhood_id,mp.identity_status,s.scope_status
    from public.market_properties mp
    join private.market_properties_vitacura_scope_v1 s on s.property_id=mp.id
    where mp.property_type='Casa'
  ),
  scoped_nodes as (
    select id,neighborhood_id,identity_status
    from all_houses
    where scope_status <> 'out_of_scope_explicit'
  ),
  edges as (
    select m.left_entity_id as a,m.right_entity_id as b
    from public.market_property_matches m
    where m.status='confirmed'
      and m.left_entity_type='property'
      and m.right_entity_type='property'
      and m.left_entity_id in (select id from scoped_nodes)
      and m.right_entity_id in (select id from scoped_nodes)
    union all
    select m.right_entity_id,m.left_entity_id
    from public.market_property_matches m
    where m.status='confirmed'
      and m.left_entity_type='property'
      and m.right_entity_type='property'
      and m.left_entity_id in (select id from scoped_nodes)
      and m.right_entity_id in (select id from scoped_nodes)
  ),
  reach(start_id,member_id) as (
    select id,id from scoped_nodes
    union
    select r.start_id,e.b
    from reach r
    join edges e on e.a=r.member_id
  ),
  components as (
    select member_id,min(start_id::text)::uuid as component_id
    from reach
    group by member_id
  ),
  component_rollup as (
    select
      c.component_id,
      count(*)::bigint as members,
      bool_or(n.neighborhood_id is not null) as has_neighborhood,
      count(distinct n.neighborhood_id) filter(where n.neighborhood_id is not null)::bigint as neighborhood_variants
    from components c
    join scoped_nodes n on n.id=c.member_id
    group by c.component_id
  )
  select
    (select count(*)::bigint from all_houses),
    (select count(*)::bigint from scoped_nodes),
    (select count(*)::bigint from all_houses where scope_status='out_of_scope_explicit'),
    (select count(*)::bigint from scoped_nodes where identity_status='confirmed'),
    (select count(*)::bigint from scoped_nodes where neighborhood_id is null),
    (select count(*)::bigint from scoped_nodes where identity_status in ('candidate','needs_review')),
    count(*)::bigint,
    ((select count(*) from scoped_nodes)-count(*))::bigint,
    count(*) filter(where cr.members>1)::bigint,
    count(*) filter(where cr.has_neighborhood)::bigint,
    count(*) filter(where cr.neighborhood_variants>1)::bigint
  from component_rollup cr;
end;
$$;

revoke all on function public.get_market_house_scope_summary_v1() from public;
revoke all on function public.get_market_house_scope_summary_v1() from anon;
grant execute on function public.get_market_house_scope_summary_v1() to authenticated;

create or replace function public.get_vitacura_neighborhood_property_counts_v1()
returns table(neighborhood_id uuid,property_count bigint)
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode='42501';
  end if;

  return query
  select mp.neighborhood_id,count(*)::bigint
  from public.market_properties mp
  join private.market_properties_vitacura_scope_v1 s on s.property_id=mp.id
  join public.market_neighborhoods mn on mn.id=mp.neighborhood_id
  join public.market_sources ms on ms.id=mn.geometry_source_id
  where mp.property_type='Casa'
    and s.scope_status <> 'out_of_scope_explicit'
    and ms.code='kml_vitacura_barrios_2026_08_12'
  group by mp.neighborhood_id;
end;
$$;

revoke all on function public.get_vitacura_neighborhood_property_counts_v1() from public;
revoke all on function public.get_vitacura_neighborhood_property_counts_v1() from anon;
grant execute on function public.get_vitacura_neighborhood_property_counts_v1() to authenticated;
