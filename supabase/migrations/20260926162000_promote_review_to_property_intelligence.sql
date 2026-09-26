create or replace function public.promote_property_review_to_intelligence_v1(
  p_review_id uuid,
  p_neighborhood_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_review public.market_neighborhood_review_items%rowtype;
  v_listing public.market_listings%rowtype;
  v_signal record;
  v_property_id uuid;
  v_created boolean := false;
  v_refresh jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then raise exception 'AAL2 required'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  ) then
    raise exception 'Operational leader role required';
  end if;

  select * into v_review
  from public.market_neighborhood_review_items
  where id=p_review_id
  for update;

  if v_review.id is null or v_review.decision <> 'pending' then
    raise exception 'Review is no longer pending';
  end if;

  select * into v_listing
  from public.market_listings
  where id=v_review.listing_id
  for update;

  if v_listing.id is null or v_listing.status not in ('active','observed') then
    raise exception 'Listing is no longer actionable';
  end if;

  select * into v_signal
  from private.resolve_market_neighborhood_signal_v2(v_listing.id)
  limit 1;

  if v_signal.neighborhood_id is null
     or v_signal.neighborhood_id is distinct from p_neighborhood_id then
    raise exception 'Deterministic territory evidence changed';
  end if;

  v_property_id := v_listing.property_id;

  if v_property_id is not null then
    if exists (
      select 1 from public.market_properties p
      where p.id=v_property_id
        and p.neighborhood_id is not null
        and p.neighborhood_id is distinct from p_neighborhood_id
    ) then
      raise exception 'Canonical property already has a different neighborhood';
    end if;

    update public.market_properties
    set neighborhood_id=coalesce(neighborhood_id,p_neighborhood_id),
        last_seen_at=greatest(coalesce(last_seen_at,v_listing.observed_at),v_listing.observed_at),
        updated_at=now()
    where id=v_property_id;
  else
    insert into public.market_properties(
      canonical_key,
      property_type,
      normalized_address,
      latitude,
      longitude,
      neighborhood_id,
      identity_status,
      identity_confidence,
      identity_evidence,
      first_seen_at,
      last_seen_at
    ) values (
      'reviewed-listing:' || v_listing.source_listing_id,
      'Casa',
      coalesce(v_listing.normalized_address,v_listing.raw_address,v_listing.title),
      v_listing.latitude,
      v_listing.longitude,
      p_neighborhood_id,
      'candidate',
      0.90,
      jsonb_build_array(jsonb_build_object(
        'method','director_review_promote_to_intelligence_v1',
        'review_item_id',v_review.id,
        'source_listing_id',v_listing.source_listing_id,
        'reviewer_id',auth.uid(),
        'reviewed_at',now(),
        'identity_note','Human action promoted the live listing into canonical intelligence as a candidate identity; identity is not auto-confirmed.'
      )),
      coalesce(v_listing.observed_at,now()),
      coalesce(v_listing.observed_at,now())
    )
    on conflict (canonical_key) do update set
      neighborhood_id=coalesce(public.market_properties.neighborhood_id,excluded.neighborhood_id),
      latitude=coalesce(public.market_properties.latitude,excluded.latitude),
      longitude=coalesce(public.market_properties.longitude,excluded.longitude),
      last_seen_at=greatest(coalesce(public.market_properties.last_seen_at,excluded.last_seen_at),excluded.last_seen_at),
      identity_confidence=greatest(coalesce(public.market_properties.identity_confidence,0),excluded.identity_confidence),
      identity_evidence=coalesce(public.market_properties.identity_evidence,'[]'::jsonb)||excluded.identity_evidence,
      updated_at=now()
    returning id,(xmax=0) into v_property_id,v_created;

    update public.market_listings
    set property_id=v_property_id
    where source_id=v_listing.source_id
      and source_listing_id=v_listing.source_listing_id
      and property_id is null;
  end if;

  update public.market_neighborhood_review_items
  set classification='clear',
      suggested_neighborhood_id=p_neighborhood_id,
      decision='accepted'
  where id=v_review.id
    and decision='pending';

  if not found then raise exception 'Review changed before promotion'; end if;

  begin
    v_refresh := public.refresh_property_prospect_leads_v1();
  exception when insufficient_privilege then
    v_refresh := jsonb_build_object('inserted',0,'skipped','insufficient_privilege');
  end;

  return jsonb_build_object(
    'propertyId',v_property_id,
    'propertyCreated',v_created,
    'reviewId',v_review.id,
    'neighborhoodId',p_neighborhood_id,
    'prospects',v_refresh
  );
end;
$function$;

revoke all on function public.promote_property_review_to_intelligence_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.promote_property_review_to_intelligence_v1(uuid,uuid) to authenticated;
