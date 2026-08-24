create schema if not exists private;

create table if not exists private.market_listing_territory_reviews (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.market_sources(id),
  source_listing_id text not null,
  neighborhood_id uuid references public.market_neighborhoods(id),
  decision text not null check (decision in ('accepted', 'rejected')),
  evidence_type text not null check (evidence_type in ('explicit_kml_name')),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  unique (source_id, source_listing_id)
);

alter table private.market_listing_territory_reviews enable row level security;
revoke all on table private.market_listing_territory_reviews from public, anon, authenticated;

create index if not exists market_listing_territory_reviews_decision_idx
  on private.market_listing_territory_reviews (decision, reviewed_at desc);

create or replace function public.get_market_house_territory_progress_v1()
returns table (
  portal_current_houses bigint,
  exact_kml_houses bigint,
  pending_unique_suggestions bigint,
  ambiguous_suggestions bigint,
  unmatched_houses bigint,
  accepted_reviews bigint,
  rejected_reviews bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector', 'seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with kml_source as (
    select ms.id from public.market_sources ms
    where ms.code = 'kml_vitacura_barrios_2026_08_12'
    order by ms.imported_at desc nulls last limit 1
  ),
  kml_neighborhoods as (
    select mn.id,
      lower(regexp_replace(translate(coalesce(mn.micro_neighborhood, mn.name, ''),
        'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) as name_key
    from public.market_neighborhoods mn
    where mn.geometry_source_id = (select ks.id from kml_source ks)
  ),
  portal_houses as (
    select ml.source_id, ml.source_listing_id,
      lower(regexp_replace(translate(coalesce(ml.normalized_address, ml.raw_address, ''),
        'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) as address_key,
      property_neighborhood.geometry_source_id as property_geometry_source_id,
      review_neighborhood.geometry_source_id as review_geometry_source_id,
      review.decision as review_decision
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    left join public.market_properties mp on mp.id = ml.property_id
    left join public.market_neighborhoods property_neighborhood on property_neighborhood.id = mp.neighborhood_id
    left join private.market_listing_territory_reviews review
      on review.source_id = ml.source_id and review.source_listing_id = ml.source_listing_id
    left join public.market_neighborhoods review_neighborhood on review_neighborhood.id = review.neighborhood_id
    where ms.source_type = 'portal'
      and coalesce(nullif(ms.metadata ->> 'dataset_kind', ''),
        case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end) = 'portal_houses'
      and lower(btrim(ml.operation)) in ('sale', 'venta')
      and ml.status in ('active', 'observed')
      and nullif(btrim(ml.source_listing_id), '') is not null
  ),
  candidate_counts as (
    select ph.source_id, ph.source_listing_id, count(kn.id)::bigint as candidates
    from portal_houses ph
    left join kml_neighborhoods kn on kn.name_key <> '' and ph.address_key like '%' || kn.name_key || '%'
    group by ph.source_id, ph.source_listing_id
  )
  select count(*)::bigint,
    count(*) filter (
      where ph.property_geometry_source_id = (select ks.id from kml_source ks)
        or (ph.review_decision = 'accepted'
          and ph.review_geometry_source_id = (select ks.id from kml_source ks))
    )::bigint,
    count(*) filter (
      where coalesce(cc.candidates, 0) = 1
        and ph.property_geometry_source_id is distinct from (select ks.id from kml_source ks)
        and ph.review_decision is null
    )::bigint,
    count(*) filter (
      where coalesce(cc.candidates, 0) > 1
        and ph.property_geometry_source_id is distinct from (select ks.id from kml_source ks)
        and ph.review_decision is null
    )::bigint,
    count(*) filter (
      where coalesce(cc.candidates, 0) = 0
        and ph.property_geometry_source_id is distinct from (select ks.id from kml_source ks)
        and ph.review_decision is null
    )::bigint,
    count(*) filter (where ph.review_decision = 'accepted')::bigint,
    count(*) filter (where ph.review_decision = 'rejected')::bigint
  from portal_houses ph
  left join candidate_counts cc on cc.source_id = ph.source_id and cc.source_listing_id = ph.source_listing_id;
end;
$$;

revoke all on function public.get_market_house_territory_progress_v1() from public, anon, authenticated;
grant execute on function public.get_market_house_territory_progress_v1() to authenticated;

create or replace function public.get_market_house_territory_queue_v1()
returns table (
  source_id uuid,
  source_listing_id text,
  listing_url text,
  listing_address text,
  suggested_neighborhood_id uuid,
  suggested_neighborhood_name text,
  candidate_count bigint,
  review_status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  with kml_source as (
    select ms.id from public.market_sources ms
    where ms.code = 'kml_vitacura_barrios_2026_08_12'
    order by ms.imported_at desc nulls last limit 1
  ),
  kml_neighborhoods as (
    select mn.id, coalesce(mn.micro_neighborhood, mn.name) as display_name,
      lower(regexp_replace(translate(coalesce(mn.micro_neighborhood, mn.name, ''),
        'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) as name_key
    from public.market_neighborhoods mn
    where mn.geometry_source_id = (select ks.id from kml_source ks)
  ),
  portal_houses as (
    select ml.source_id, ml.source_listing_id, ml.url,
      coalesce(ml.raw_address, ml.normalized_address) as address,
      lower(regexp_replace(translate(coalesce(ml.normalized_address, ml.raw_address, ''),
        'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) as address_key,
      property_neighborhood.geometry_source_id as property_geometry_source_id,
      review.decision as review_decision
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    left join public.market_properties mp on mp.id = ml.property_id
    left join public.market_neighborhoods property_neighborhood on property_neighborhood.id = mp.neighborhood_id
    left join private.market_listing_territory_reviews review
      on review.source_id = ml.source_id and review.source_listing_id = ml.source_listing_id
    where ms.source_type = 'portal'
      and coalesce(nullif(ms.metadata ->> 'dataset_kind', ''),
        case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end) = 'portal_houses'
      and lower(btrim(ml.operation)) in ('sale', 'venta')
      and ml.status in ('active', 'observed')
      and nullif(btrim(ml.source_listing_id), '') is not null
  ),
  candidates as (
    select ph.source_id, ph.source_listing_id, ph.url, ph.address,
      count(kn.id)::bigint as candidate_count,
      case when count(kn.id) = 1 then min(kn.id::text)::uuid end as suggested_id,
      case when count(kn.id) = 1 then min(kn.display_name) end as suggested_name
    from portal_houses ph
    left join kml_neighborhoods kn on kn.name_key <> '' and ph.address_key like '%' || kn.name_key || '%'
    where ph.property_geometry_source_id is distinct from (select ks.id from kml_source ks)
      and ph.review_decision is null
    group by ph.source_id, ph.source_listing_id, ph.url, ph.address
  )
  select c.source_id, c.source_listing_id, c.url, c.address,
    c.suggested_id, c.suggested_name, c.candidate_count,
    case when c.candidate_count = 1 then 'suggested'
      when c.candidate_count > 1 then 'ambiguous' else 'unmatched' end
  from candidates c
  order by case when c.candidate_count = 1 then 0 when c.candidate_count > 1 then 1 else 2 end,
    c.address nulls last, c.source_listing_id;
end;
$$;

revoke all on function public.get_market_house_territory_queue_v1() from public, anon, authenticated;
grant execute on function public.get_market_house_territory_queue_v1() to authenticated;

create or replace function public.review_market_house_territory_v1(
  p_source_id uuid,
  p_source_listing_id text,
  p_neighborhood_id uuid,
  p_decision text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile_id uuid := (select auth.uid());
  v_address text;
  v_address_key text;
  v_candidate_count bigint;
  v_candidate_id uuid;
begin
  if v_profile_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_profile_id
      and lower(coalesce(p.role, '')) in ('admin', 'ceo', 'director', 'subdirector')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'MFA required' using errcode = '42501';
  end if;

  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;

  select coalesce(ml.raw_address, ml.normalized_address),
    lower(regexp_replace(translate(coalesce(ml.normalized_address, ml.raw_address, ''),
      'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g'))
  into v_address, v_address_key
  from public.market_current_listings ml
  join public.market_sources ms on ms.id = ml.source_id
  left join public.market_properties mp on mp.id = ml.property_id
  where ml.source_id = p_source_id
    and ml.source_listing_id = p_source_listing_id
    and ms.source_type = 'portal'
    and coalesce(nullif(ms.metadata ->> 'dataset_kind', ''),
      case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end) = 'portal_houses'
    and lower(btrim(ml.operation)) in ('sale', 'venta')
    and ml.status in ('active', 'observed')
  order by ml.observed_at desc nulls last limit 1;

  if v_address is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  select count(*)::bigint, min(mn.id::text)::uuid
  into v_candidate_count, v_candidate_id
  from public.market_neighborhoods mn
  join public.market_sources ms on ms.id = mn.geometry_source_id
  where ms.code = 'kml_vitacura_barrios_2026_08_12'
    and lower(regexp_replace(translate(coalesce(mn.micro_neighborhood, mn.name, ''),
      'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) <> ''
    and v_address_key like '%' || lower(regexp_replace(
      translate(coalesce(mn.micro_neighborhood, mn.name, ''),
        'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^a-zA-Z0-9]+', '', 'g')) || '%';

  if v_candidate_count <> 1 or v_candidate_id is distinct from p_neighborhood_id then
    raise exception 'Candidate is not uniquely supported by the Portal address' using errcode = '22023';
  end if;

  insert into private.market_listing_territory_reviews (
    source_id, source_listing_id, neighborhood_id, decision,
    evidence_type, evidence, reviewed_by, reviewed_at
  ) values (
    p_source_id, p_source_listing_id, p_neighborhood_id, p_decision,
    'explicit_kml_name',
    jsonb_build_object('portal_address', v_address,
      'kml_neighborhood_id', p_neighborhood_id, 'candidate_count', v_candidate_count),
    v_profile_id, now()
  )
  on conflict (source_id, source_listing_id) do update
    set neighborhood_id = excluded.neighborhood_id,
        decision = excluded.decision,
        evidence_type = excluded.evidence_type,
        evidence = excluded.evidence,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at;

  return true;
end;
$$;

revoke all on function public.review_market_house_territory_v1(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.review_market_house_territory_v1(uuid, text, uuid, text) to authenticated;

comment on table private.market_listing_territory_reviews
is 'Human-reviewed territorial assignments for current Portal house listings. Review evidence remains separate from canonical property identity.';
comment on function public.get_market_house_territory_progress_v1()
is 'Territorial coverage and review progress for current houses offered for sale in Vitacura.';
comment on function public.get_market_house_territory_queue_v1()
is 'Review queue generated only from explicit canonical KML neighborhood names present in Portal addresses.';
comment on function public.review_market_house_territory_v1(uuid, text, uuid, text)
is 'Records an AAL2 human decision for one uniquely supported Portal-to-KML neighborhood suggestion.';
