create or replace function public.get_ceo_market_neighborhood_batch_summary_v1()
returns table (
  resolution_kind text,
  eligible_count integer,
  conflict_count integer
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
  ) then raise exception 'CEO or admin role required'; end if;

  return query
  with latest_listing as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,l.property_id
    from public.market_listings l
    join public.market_sources s on s.id=l.source_id and s.code='portal-inmobiliario-vitacura-portal-houses'
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), classified as (
    select q.resolution_kind,q.can_decide,q.proposed_neighborhood_id,ll.property_id,mp.neighborhood_id canonical_neighborhood_id
    from public.get_ceo_market_neighborhood_queue_v1() q
    left join latest_listing ll using(source_listing_id)
    left join public.market_properties mp on mp.id=ll.property_id
  )
  select c.resolution_kind,
    count(*) filter (
      where c.can_decide
        and (c.property_id is null or c.canonical_neighborhood_id is null or c.canonical_neighborhood_id=c.proposed_neighborhood_id)
    )::integer as eligible_count,
    count(*) filter (
      where c.can_decide
        and c.property_id is not null
        and c.canonical_neighborhood_id is not null
        and c.canonical_neighborhood_id<>c.proposed_neighborhood_id
    )::integer as conflict_count
  from classified c
  group by c.resolution_kind
  order by c.resolution_kind;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_batch_summary_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_batch_summary_v1() to authenticated;

drop function if exists public.get_ceo_market_neighborhood_conflicts_v1();
create function public.get_ceo_market_neighborhood_conflicts_v1()
returns table (
  review_id uuid,
  source_listing_id text,
  raw_address text,
  canonical_neighborhood_id uuid,
  canonical_neighborhood_name text,
  proposed_neighborhood_id uuid,
  proposed_neighborhood_name text,
  resolution_kind text,
  correction_ready boolean,
  correction_reason text
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
  ) then raise exception 'CEO or admin role required'; end if;

  return query
  with latest_listing as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,l.property_id
    from public.market_listings l
    join public.market_sources s on s.id=l.source_id and s.code='portal-inmobiliario-vitacura-portal-houses'
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  )
  select q.review_id,q.source_listing_id,q.raw_address,
    mp.neighborhood_id,cn.name,
    q.proposed_neighborhood_id,q.proposed_neighborhood_name,q.resolution_kind,
    (lower(coalesce(e.evidence->>'correction_ready','false'))='true' and e.neighborhood_id=q.proposed_neighborhood_id),
    coalesce(e.reason,q.reason)
  from public.get_ceo_market_neighborhood_queue_v1() q
  join latest_listing ll using(source_listing_id)
  join public.market_properties mp on mp.id=ll.property_id
  left join public.market_neighborhoods cn on cn.id=mp.neighborhood_id
  left join private.market_neighborhood_resolution_evidence_v1 e on e.source_listing_id=q.source_listing_id
  where q.can_decide
    and mp.neighborhood_id is not null
    and q.proposed_neighborhood_id is not null
    and mp.neighborhood_id<>q.proposed_neighborhood_id
  order by q.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_conflicts_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_conflicts_v1() to authenticated;

create or replace function public.approve_ceo_market_neighborhood_batch_v1(p_resolution_kind text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_row record;
  v_item record;
  v_approved integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'AAL2 required for neighborhood batch approval'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('ceo','admin')
  ) then raise exception 'CEO or admin role required'; end if;
  if p_resolution_kind is null or length(p_resolution_kind)>64 then
    raise exception 'Unsupported neighborhood batch';
  end if;

  for v_row in
    with latest_listing as (
      select distinct on (l.source_listing_id)
        l.source_listing_id,l.property_id
      from public.market_listings l
      join public.market_sources s on s.id=l.source_id and s.code='portal-inmobiliario-vitacura-portal-houses'
      order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
    )
    select q.review_id,q.source_listing_id,q.proposed_neighborhood_id,ll.property_id,mp.neighborhood_id canonical_neighborhood_id
    from public.get_ceo_market_neighborhood_queue_v1() q
    left join latest_listing ll using(source_listing_id)
    left join public.market_properties mp on mp.id=ll.property_id
    where (p_resolution_kind='all' or q.resolution_kind=p_resolution_kind)
      and q.can_decide
      and q.review_id is not null
      and q.proposed_neighborhood_id is not null
      and (ll.property_id is null or mp.neighborhood_id is null or mp.neighborhood_id=q.proposed_neighborhood_id)
    order by q.source_listing_id
  loop
    select id,classification,suggested_neighborhood_id,decision
    into v_item
    from public.market_neighborhood_review_items
    where id=v_row.review_id
    for update;

    if v_item.id is null or v_item.decision<>'pending' then
      continue;
    end if;

    if v_item.classification='clear' and v_item.suggested_neighborhood_id is not null then
      if v_item.suggested_neighborhood_id<>v_row.proposed_neighborhood_id then
        raise exception 'Batch evidence changed for review %',v_row.review_id;
      end if;
      update public.market_neighborhood_review_items
      set decision='accepted',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now()
      where id=v_row.review_id and decision='pending';
    else
      update public.market_neighborhood_review_items
      set classification='clear',suggested_neighborhood_id=v_row.proposed_neighborhood_id,
          decision='accepted',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now()
      where id=v_row.review_id and decision='pending';
    end if;

    if found then v_approved:=v_approved+1; end if;
  end loop;

  return jsonb_build_object('resolution_kind',p_resolution_kind,'approved_count',v_approved);
end;
$function$;

revoke all on function public.approve_ceo_market_neighborhood_batch_v1(text) from public,anon;
grant execute on function public.approve_ceo_market_neighborhood_batch_v1(text) to authenticated;

create or replace function public.correct_ceo_market_neighborhood_conflicts_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_row record;
  v_item record;
  v_property_id uuid;
  v_current_neighborhood uuid;
  v_corrected integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'AAL2 required for canonical neighborhood correction'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('ceo','admin')
  ) then raise exception 'CEO or admin role required'; end if;

  for v_row in
    select *
    from public.get_ceo_market_neighborhood_conflicts_v1() c
    where c.correction_ready
    order by c.source_listing_id
  loop
    select l.property_id into v_property_id
    from public.market_listings l
    join public.market_sources s on s.id=l.source_id and s.code='portal-inmobiliario-vitacura-portal-houses'
    where l.source_listing_id=v_row.source_listing_id
    order by l.observed_at desc nulls last,l.created_at desc
    limit 1;

    if v_property_id is null then
      raise exception 'Canonical property missing for correction %',v_row.source_listing_id;
    end if;

    select mp.neighborhood_id into v_current_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id
    for update;

    if v_current_neighborhood is null or v_current_neighborhood=v_row.proposed_neighborhood_id then
      continue;
    end if;
    if v_current_neighborhood<>v_row.canonical_neighborhood_id then
      raise exception 'Canonical neighborhood changed before correction %',v_row.source_listing_id;
    end if;

    update public.market_properties
    set neighborhood_id=v_row.proposed_neighborhood_id,updated_at=now()
    where id=v_property_id and neighborhood_id=v_current_neighborhood;

    select id,classification,suggested_neighborhood_id,decision
    into v_item
    from public.market_neighborhood_review_items
    where id=v_row.review_id
    for update;

    if v_item.id is null or v_item.decision<>'pending' then
      raise exception 'Neighborhood review changed before correction %',v_row.source_listing_id;
    end if;

    if v_item.classification='clear' and v_item.suggested_neighborhood_id is not null then
      if v_item.suggested_neighborhood_id<>v_row.proposed_neighborhood_id then
        raise exception 'Correction evidence changed for review %',v_row.review_id;
      end if;
      update public.market_neighborhood_review_items
      set decision='accepted',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now()
      where id=v_row.review_id and decision='pending';
    else
      update public.market_neighborhood_review_items
      set classification='clear',suggested_neighborhood_id=v_row.proposed_neighborhood_id,
          decision='accepted',reviewer_id=auth.uid(),reviewed_at=now(),updated_at=now()
      where id=v_row.review_id and decision='pending';
    end if;

    if not found then
      raise exception 'Correction review was not updated %',v_row.source_listing_id;
    end if;
    v_corrected:=v_corrected+1;
  end loop;

  return jsonb_build_object('corrected_count',v_corrected);
end;
$function$;

revoke all on function public.correct_ceo_market_neighborhood_conflicts_v1() from public,anon;
grant execute on function public.correct_ceo_market_neighborhood_conflicts_v1() to authenticated;
