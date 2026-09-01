create or replace function private.promote_accepted_neighborhood_review_to_canonical()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.market_listings%rowtype;
  v_address_key text;
  v_property_id uuid;
  v_property_type text;
  v_source_code text;
  v_existing_neighborhood uuid;
begin
  if new.decision is not distinct from old.decision or new.decision <> 'accepted' then
    return new;
  end if;

  if old.decision <> 'pending' or new.suggested_neighborhood_id is null then
    raise exception 'Accepted neighborhood review is not eligible for canonical promotion';
  end if;

  if not exists (
    select 1
    from public.market_neighborhoods mn
    join public.market_sources ms on ms.id = mn.geometry_source_id
    where mn.id = new.suggested_neighborhood_id
      and ms.code = 'kml_vitacura_barrios_2026_08_12'
  ) then
    raise exception 'Accepted neighborhood must belong to the canonical Vitacura KML';
  end if;

  select * into v_listing
  from public.market_listings
  where id = new.listing_id
  for update;

  if v_listing.id is null then
    raise exception 'Neighborhood review listing no longer exists';
  end if;

  v_address_key := private.normalize_market_address(coalesce(v_listing.normalized_address, v_listing.raw_address));
  if v_address_key is null then
    raise exception 'Accepted neighborhood review requires an address';
  end if;

  v_property_id := v_listing.property_id;

  if v_property_id is not null then
    select mp.property_type, mp.neighborhood_id
      into v_property_type, v_existing_neighborhood
    from public.market_properties mp
    where mp.id = v_property_id
    for update;

    if v_existing_neighborhood is null then
      update public.market_properties
      set neighborhood_id = new.suggested_neighborhood_id,
          updated_at = now()
      where id = v_property_id;
    elsif v_existing_neighborhood is distinct from new.suggested_neighborhood_id then
      raise exception 'Canonical property already has a different neighborhood';
    end if;
  end if;

  if v_property_id is null then
    select m.canonical_property_id into v_property_id
    from private.market_address_resolution_memory m
    where m.address_key = v_address_key
      and m.neighborhood_id = new.suggested_neighborhood_id
      and m.canonical_property_id is not null
    limit 1;
  end if;

  if v_property_id is null then
    select ms.code into v_source_code
    from public.market_sources ms
    where ms.id = v_listing.source_id;

    v_property_type := case
      when v_source_code like '%portal-houses' then 'Casa'
      when v_source_code like '%portal-apartments' then 'Departamento'
      when v_source_code like '%portal-projects' then 'Proyecto'
      else 'Otro'
    end;

    insert into public.market_properties (
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
      'reviewed-address:' || md5(v_address_key),
      v_property_type,
      coalesce(v_listing.normalized_address, v_listing.raw_address),
      v_listing.latitude,
      v_listing.longitude,
      new.suggested_neighborhood_id,
      'candidate',
      0.95,
      jsonb_build_array(jsonb_build_object(
        'method','human_neighborhood_review_v1',
        'review_item_id',new.id,
        'source_listing_id',v_listing.source_listing_id,
        'reviewer_id',new.reviewer_id,
        'reviewed_at',new.reviewed_at
      )),
      coalesce(v_listing.observed_at, now()),
      coalesce(v_listing.observed_at, now())
    )
    on conflict (canonical_key) do update set
      neighborhood_id = excluded.neighborhood_id,
      latitude = coalesce(public.market_properties.latitude, excluded.latitude),
      longitude = coalesce(public.market_properties.longitude, excluded.longitude),
      last_seen_at = greatest(coalesce(public.market_properties.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
      identity_confidence = greatest(coalesce(public.market_properties.identity_confidence, 0), excluded.identity_confidence),
      identity_evidence = coalesce(public.market_properties.identity_evidence, '[]'::jsonb) || excluded.identity_evidence,
      updated_at = now()
    returning id into v_property_id;
  end if;

  update public.market_listings
  set property_id = v_property_id
  where id = v_listing.id
    and property_id is null;

  insert into private.market_address_resolution_memory (
    address_key,
    display_address,
    neighborhood_id,
    canonical_property_id,
    source_kind,
    confidence,
    evidence,
    first_seen_at,
    last_seen_at,
    updated_at
  ) values (
    v_address_key,
    coalesce(v_listing.normalized_address, v_listing.raw_address),
    new.suggested_neighborhood_id,
    v_property_id,
    'human_review',
    1,
    jsonb_build_object(
      'method','accepted_neighborhood_review_v1',
      'review_item_id',new.id,
      'source_listing_id',v_listing.source_listing_id,
      'reviewer_id',new.reviewer_id
    ),
    coalesce(v_listing.observed_at, now()),
    now(),
    now()
  )
  on conflict (address_key) do update set
    display_address = excluded.display_address,
    neighborhood_id = excluded.neighborhood_id,
    canonical_property_id = excluded.canonical_property_id,
    source_kind = 'human_review',
    confidence = 1,
    evidence = private.market_address_resolution_memory.evidence || excluded.evidence,
    last_seen_at = now(),
    updated_at = now();

  return new;
end;
$$;

with kml_source as (
  select ms.id
  from public.market_sources ms
  where ms.code = 'kml_vitacura_barrios_2026_08_12'
  order by ms.imported_at desc nulls last
  limit 1
), kml_neighborhoods as (
  select mn.id, mn.name
  from public.market_neighborhoods mn
  where mn.geometry_source_id = (select id from kml_source)
), candidate_matches as (
  select p.id as property_id,
         p.normalized_address,
         n.id as neighborhood_id,
         n.name as neighborhood_name
  from public.market_properties p
  join kml_neighborhoods n
    on lower(p.normalized_address) like '%' || lower(n.name) || '%'
  where p.property_type = 'Casa'
    and p.neighborhood_id is null
    and lower(p.normalized_address) like '%vitacura%'
    and not (lower(p.normalized_address) like any(array[
      '%colina%', '%chicureo%', '%pucón%', '%pucon%', '%lo barnechea%', '%las condes%'
    ]))
), unique_candidates as (
  select property_id,
         max(normalized_address) as normalized_address,
         (array_agg(neighborhood_id))[1] as neighborhood_id,
         (array_agg(neighborhood_name))[1] as neighborhood_name
  from candidate_matches
  group by property_id
  having count(distinct neighborhood_id) = 1
), latest_listing as (
  select distinct on (ml.property_id)
         ml.id as listing_id,
         ml.property_id,
         ml.source_listing_id,
         ml.observed_at
  from public.market_listings ml
  join unique_candidates uc on uc.property_id = ml.property_id
  where ml.status in ('active','observed')
    and lower(btrim(ml.operation)) in ('sale','venta')
  order by ml.property_id, ml.observed_at desc nulls last, ml.created_at desc
), inserted as (
  insert into public.market_neighborhood_review_items (
    listing_id,
    classification,
    suggested_neighborhood_id,
    candidate_neighborhoods,
    evidence,
    decision
  )
  select ll.listing_id,
         'clear',
         uc.neighborhood_id,
         jsonb_build_array(uc.neighborhood_name),
         jsonb_build_object(
           'method','linked_property_unique_kml_name_v1',
           'reason','La dirección canónica identifica un único barrio del KML Property Partners y la propiedad todavía no tiene barrio publicado.',
           'property_id',uc.property_id,
           'source_listing_id',ll.source_listing_id,
           'source_cut',ll.observed_at,
           'canonical_write',false,
           'scope','Vitacura · Casa · Venta'
         ),
         'pending'
  from unique_candidates uc
  join latest_listing ll on ll.property_id = uc.property_id
  on conflict (listing_id) do nothing
  returning id
)
insert into public.market_neighborhood_review_assessments (
  review_item_id,
  confidence_score,
  review_priority,
  geometry_status,
  rationale,
  methodology_version
)
select i.id,
       97,
       'approve_recommended',
       'name_evidence_only',
       'Coincidencia nominal única con barrio KML sobre una casa de venta en Vitacura ya vinculada a propiedad canónica. Requiere decisión CEO AAL2 antes de publicar.',
       'pp-ceo-neighborhood-v1'
from inserted i
on conflict (review_item_id) do nothing;
