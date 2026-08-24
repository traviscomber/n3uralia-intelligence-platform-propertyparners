-- Reuse exact, already-known addresses before asking for human review.
-- Conservative by design: exact normalized keys only. No fuzzy address matching.

create table if not exists private.market_address_resolution_memory (
  address_key text primary key,
  display_address text not null,
  neighborhood_id uuid not null references public.market_neighborhoods(id),
  canonical_property_id uuid references public.market_properties(id),
  source_kind text not null check (source_kind in ('canonical_unique','human_review')),
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '{}'::jsonb,
  hit_count integer not null default 0 check (hit_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.market_address_resolution_memory enable row level security;
revoke all on private.market_address_resolution_memory from public, anon, authenticated;

create or replace function private.normalize_market_address(p_address text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    trim(regexp_replace(lower(extensions.unaccent(coalesce(p_address, ''))), '[^a-z0-9]+', ' ', 'g')),
    ''
  );
$$;

revoke all on function private.normalize_market_address(text) from public, anon, authenticated;

-- Seed only canonical addresses that identify exactly one property and already have a barrio.
-- Duplicate or conflicting canonical addresses deliberately remain outside automatic reuse.
with unique_canonical as (
  select
    private.normalize_market_address(mp.normalized_address) as address_key,
    min(mp.id::text)::uuid as property_id,
    min(mp.neighborhood_id::text)::uuid as neighborhood_id,
    min(mp.normalized_address) as display_address,
    count(*) as property_count
  from public.market_properties mp
  where mp.neighborhood_id is not null
    and private.normalize_market_address(mp.normalized_address) is not null
  group by private.normalize_market_address(mp.normalized_address)
  having count(*) = 1
)
insert into private.market_address_resolution_memory (
  address_key,
  display_address,
  neighborhood_id,
  canonical_property_id,
  source_kind,
  confidence,
  evidence
)
select
  uc.address_key,
  uc.display_address,
  uc.neighborhood_id,
  uc.property_id,
  'canonical_unique',
  1,
  jsonb_build_object('method','exact_unique_canonical_address_v1','canonical_property_id',uc.property_id)
from unique_canonical uc
on conflict (address_key) do nothing;

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
begin
  if new.decision is not distinct from old.decision or new.decision <> 'accepted' then
    return new;
  end if;

  if old.decision <> 'pending' or new.suggested_neighborhood_id is null then
    raise exception 'Accepted neighborhood review is not eligible for canonical promotion';
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

  -- Reuse an exact unique canonical property if one already exists for this address and barrio.
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

revoke all on function private.promote_accepted_neighborhood_review_to_canonical() from public, anon, authenticated;

drop trigger if exists trg_promote_accepted_neighborhood_review_to_canonical on public.market_neighborhood_review_items;
create trigger trg_promote_accepted_neighborhood_review_to_canonical
after update of decision on public.market_neighborhood_review_items
for each row
execute function private.promote_accepted_neighborhood_review_to_canonical();

create or replace function private.enqueue_market_neighborhood_review_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_code text;
  matched_ids uuid[];
  matched_names text[];
  match_count integer;
  combined_text text;
  address_key text;
  remembered_property_id uuid;
begin
  if new.property_id is not null then
    return new;
  end if;

  select ms.code into source_code
  from public.market_sources ms
  where ms.id = new.source_id;

  if source_code not in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
    'portal-inmobiliario-vitacura-portal-projects'
  ) then
    return new;
  end if;

  address_key := private.normalize_market_address(coalesce(new.normalized_address, new.raw_address));

  if address_key is not null then
    select m.canonical_property_id into remembered_property_id
    from private.market_address_resolution_memory m
    join public.market_properties mp on mp.id = m.canonical_property_id
    where m.address_key = address_key
      and m.confidence >= 0.95
      and m.canonical_property_id is not null
      and mp.neighborhood_id = m.neighborhood_id
    limit 1;

    if remembered_property_id is not null then
      update public.market_listings
      set property_id = remembered_property_id
      where id = new.id
        and property_id is null;

      update private.market_address_resolution_memory
      set hit_count = hit_count + 1,
          last_seen_at = now(),
          updated_at = now()
      where address_key = address_key;

      return new;
    end if;
  end if;

  combined_text := lower(extensions.unaccent(coalesce(new.raw_address, '') || ' ' || coalesce(new.title, '')));

  select
    coalesce(array_agg(mn.id order by length(mn.name) desc), array[]::uuid[]),
    coalesce(array_agg(mn.name order by length(mn.name) desc), array[]::text[]),
    count(*)::integer
  into matched_ids, matched_names, match_count
  from public.market_neighborhoods mn
  where combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%';

  insert into public.market_neighborhood_review_items (
    listing_id,
    classification,
    suggested_neighborhood_id,
    candidate_neighborhoods,
    evidence
  ) values (
    new.id,
    case when match_count = 1 then 'clear' when match_count > 1 then 'ambiguous' else 'no_match' end,
    case when match_count = 1 then matched_ids[1] else null end,
    to_jsonb(matched_names),
    jsonb_build_object(
      'source_listing_id', new.source_listing_id,
      'method', 'auto_exact_name_v1',
      'canonical_write', false,
      'source_code', source_code,
      'address_memory_checked', address_key is not null,
      'generated_at', now()
    )
  )
  on conflict (listing_id) do nothing;

  return new;
end;
$$;

revoke all on function private.enqueue_market_neighborhood_review_item() from public, anon, authenticated;
