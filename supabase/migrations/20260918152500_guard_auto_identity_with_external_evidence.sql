begin;

create or replace function private.auto_resolve_high_confidence_live_identity_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_source_id uuid;
  v_source_listing_id text;
  v_reviewable_count integer := 0;
  v_updated integer := 0;
  v_now timestamptz := now();
  v_evidence jsonb;
begin
  if new.left_entity_type <> 'listing'
    or new.right_entity_type <> 'property'
    or new.status <> 'candidate_high'
    or coalesce(new.score,0) < 0.94
  then
    return new;
  end if;

  if coalesce(new.contradictions,'{}'::jsonb) not in ('{}'::jsonb,'[]'::jsonb) then
    return new;
  end if;

  if not jsonb_path_exists(
    coalesce(new.evidence,'[]'::jsonb),
    '$[*] ? (@.signal == "method" && @.value == "live_unique_title_attributes_v1")'
  ) then
    return new;
  end if;

  select count(*)
  into v_reviewable_count
  from public.market_property_matches m
  where m.left_entity_type='listing'
    and m.left_entity_id=new.left_entity_id
    and m.right_entity_type='property'
    and m.status in ('candidate_high','candidate_medium');

  if v_reviewable_count <> 1 then
    return new;
  end if;

  select ml.source_id, ml.source_listing_id
  into v_source_id, v_source_listing_id
  from public.market_current_listings ml
  join public.market_sources ms on ms.id=ml.source_id
  where ml.id=new.left_entity_id
    and coalesce(nullif(ms.metadata->>'dataset_kind',''),'unknown')='portal_houses'
    and ml.status in ('active','observed')
    and lower(btrim(coalesce(ml.operation,''))) in ('sale','venta')
    and ml.property_id is null
  limit 1;

  if v_source_id is null or nullif(btrim(coalesce(v_source_listing_id,'')),'') is null then
    return new;
  end if;

  if exists (
    select 1
    from public.market_listings ml
    where ml.source_id=v_source_id
      and ml.source_listing_id=v_source_listing_id
      and ml.property_id is not null
      and ml.property_id<>new.right_entity_id
  ) then
    return new;
  end if;

  -- External identity evidence has precedence over an automatic match.
  -- Auto-confirm only when external evidence is absent or points uniquely
  -- to the same canonical property.
  if exists (
    select 1
    from public.market_properties p
    where p.property_type='Casa'
      and coalesce(p.identity_evidence::text,'') ilike '%' || v_source_listing_id || '%'
      and p.id<>new.right_entity_id
  ) then
    return new;
  end if;

  if (
    select count(*)
    from public.market_properties p
    where p.property_type='Casa'
      and coalesce(p.identity_evidence::text,'') ilike '%' || v_source_listing_id || '%'
  ) > 1 then
    return new;
  end if;

  v_evidence := coalesce(new.evidence,'[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'signal','system_auto_confirmation',
      'policy','high_confidence_unique_v1',
      'threshold',0.94,
      'score',new.score,
      'confirmedAt',v_now,
      'humanValidationRequired',false
    )
  );

  update public.market_property_matches
  set status='confirmed',
      evidence=v_evidence,
      reviewed_by=null,
      reviewed_at=v_now
  where id=new.id
    and status='candidate_high';

  insert into private.market_listing_identity_memory_v1(
    source_id,
    source_listing_id,
    property_id,
    resolution_kind,
    source_reference,
    notes,
    decided_by,
    decided_at,
    active,
    decision_origin
  ) values (
    v_source_id,
    v_source_listing_id,
    new.right_entity_id,
    'match',
    'system:auto-match:' || new.id::text,
    'Confirmación automática: candidato único de alta coincidencia, sin contradicciones.',
    null,
    v_now,
    true,
    'system_high_confidence'
  )
  on conflict (source_id,source_listing_id) do update set
    property_id=excluded.property_id,
    resolution_kind=excluded.resolution_kind,
    source_reference=excluded.source_reference,
    notes=excluded.notes,
    decided_by=null,
    decided_at=excluded.decided_at,
    active=true,
    decision_origin='system_high_confidence';

  update public.market_listings ml
  set property_id=new.right_entity_id
  where ml.source_id=v_source_id
    and ml.source_listing_id=v_source_listing_id
    and ml.property_id is null;
  get diagnostics v_updated = row_count;

  insert into private.market_live_identity_decisions_v1(
    listing_id,
    source_id,
    source_listing_id,
    property_id,
    match_id,
    resolution_kind,
    decision,
    source_reference,
    notes,
    decided_by,
    decided_at,
    evidence,
    decision_origin
  ) values (
    new.left_entity_id,
    v_source_id,
    v_source_listing_id,
    new.right_entity_id,
    new.id,
    'match',
    'confirmed',
    'system:auto-match:' || new.id::text,
    'Confirmación automática por coincidencia alta y única.',
    null,
    v_now,
    jsonb_build_object(
      'policy','high_confidence_unique_v1',
      'threshold',0.94,
      'score',new.score,
      'updatedListingRows',v_updated,
      'humanValidationRequired',false
    ),
    'system_high_confidence'
  );

  return new;
end;
$function$;

revoke all on function private.auto_resolve_high_confidence_live_identity_v1() from public, anon, authenticated;

commit;
