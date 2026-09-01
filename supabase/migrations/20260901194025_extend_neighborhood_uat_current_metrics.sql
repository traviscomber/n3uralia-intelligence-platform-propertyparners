create or replace function public.market_neighborhood_uat_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare v_role text; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select lower(coalesce(p.role,'')) into v_role from public.profiles p where p.id=auth.uid();
  if v_role not in ('admin','ceo') then raise exception 'Insufficient permissions'; end if;

  with source as (
    select id from public.market_sources where code='portal-inmobiliario-vitacura-portal-houses' limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id) l.id,l.source_listing_id,l.status
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.id,r.classification,r.decision
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source)
    order by l.source_listing_id,r.created_at desc,r.id desc
  ), current_state as (
    select ll.source_listing_id,lr.id,lr.classification,lr.decision
    from latest_listing ll
    left join latest_review lr using(source_listing_id)
    where ll.status='active'
  )
  select jsonb_build_object(
    'current_houses',(select count(*) from current_state),
    'clear',(select count(*) from current_state where classification='clear'),
    'pending',(select count(*) from current_state where decision='pending'),
    'accepted',(select count(*) from current_state where decision='accepted'),
    'discarded',(select count(*) from current_state where decision='discarded'),
    'resolved_by_system',(select count(*) from current_state where decision='resolved_by_system'),
    'reviewed',(select count(*) from current_state where decision is not null and decision<>'pending'),
    'known_addresses',(select count(*) from private.market_address_resolution_memory),
    'learned_from_reviews',(select count(*) from private.market_address_resolution_memory where source_kind='human_review'),
    'learned_from_system',(select count(*) from private.market_address_resolution_memory where source_kind='system_resolver'),
    'reuse_hits',(select coalesce(sum(hit_count),0) from private.market_address_resolution_memory),
    'clear_pending',(select count(*) from current_state where classification='clear' and decision='pending'),
    'approve_recommended',(select count(*) from current_state cs join public.market_neighborhood_review_assessments a on a.review_item_id=cs.id where cs.decision='pending' and a.review_priority='approve_recommended'),
    'quick_review',(select count(*) from current_state cs join public.market_neighborhood_review_assessments a on a.review_item_id=cs.id where cs.decision='pending' and a.review_priority='quick_review'),
    'mandatory_review',(select count(*) from current_state cs join public.market_neighborhood_review_assessments a on a.review_item_id=cs.id where cs.decision='pending' and a.review_priority='mandatory_review'),
    'ambiguous',(select count(*) from current_state where classification='ambiguous' and decision='pending'),
    'no_match',(select count(*) from current_state where classification='no_match' and decision='pending'),
    'historical_review_rows',(select count(*) from public.market_neighborhood_review_items)
  ) into v_result;
  return v_result;
end;
$function$;
