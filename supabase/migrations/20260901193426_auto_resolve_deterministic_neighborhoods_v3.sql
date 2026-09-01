alter table public.market_neighborhood_review_items
  add column if not exists resolution_origin text not null default 'human',
  add column if not exists resolver_version text;

alter table public.market_neighborhood_review_items
  drop constraint if exists market_neighborhood_review_items_decision_check;
alter table public.market_neighborhood_review_items
  add constraint market_neighborhood_review_items_decision_check
  check (decision in ('pending','accepted','discarded','resolved_by_system'));

alter table public.market_neighborhood_review_items
  drop constraint if exists market_neighborhood_review_items_resolution_origin_check;
alter table public.market_neighborhood_review_items
  add constraint market_neighborhood_review_items_resolution_origin_check
  check (resolution_origin in ('human','system'));

create table if not exists private.market_neighborhood_resolution_audit_v3 (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  source_listing_id text not null,
  review_item_id uuid not null references public.market_neighborhood_review_items(id) on delete cascade,
  property_id uuid references public.market_properties(id) on delete set null,
  action text not null check (action in ('listing_territory_resolved','canonical_assigned','canonical_corrected','canonical_already_correct')),
  previous_neighborhood_id uuid references public.market_neighborhoods(id) on delete restrict,
  resolved_neighborhood_id uuid not null references public.market_neighborhoods(id) on delete restrict,
  resolution_kind text not null,
  resolver_version text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_neighborhood_resolution_audit_v3_source_idx
  on private.market_neighborhood_resolution_audit_v3(source_listing_id,created_at desc);

revoke all on private.market_neighborhood_resolution_audit_v3 from public,anon,authenticated;

create or replace function private.enforce_market_neighborhood_review_update()
returns trigger
language plpgsql
set search_path=''
as $function$
declare
  v_resolution_count integer := 0;
  v_resolution_id uuid;
  v_evidence_id uuid;
  v_allowed_human_resolution boolean := false;
  v_system_context boolean := false;
  v_signal record;
begin
  v_system_context := current_user='postgres'
    and current_setting('app.market_neighborhood_system_resolution',true)='v3';

  if new.listing_id is distinct from old.listing_id
     or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
     or new.evidence is distinct from old.evidence
     or new.classification is distinct from old.classification
     or new.suggested_neighborhood_id is distinct from old.suggested_neighborhood_id then

    if new.listing_id is distinct from old.listing_id
       or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
       or new.evidence is distinct from old.evidence then
      raise exception 'Neighborhood review evidence is immutable';
    end if;

    v_allowed_human_resolution :=
      old.decision='pending'
      and new.decision='accepted'
      and old.classification in ('ambiguous','no_match')
      and new.classification='clear'
      and new.suggested_neighborhood_id is not null;

    if v_allowed_human_resolution then
      if coalesce(auth.jwt()->>'aal','') <> 'aal2' or auth.uid() is null then
        raise exception 'AAL2 required for canonical neighborhood resolution';
      end if;
      if not exists (
        select 1 from public.profiles p
        where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','ceo')
      ) then
        raise exception 'Canonical neighborhood resolution requires CEO or admin role';
      end if;

      select count(*)::integer,(array_agg(mn.id order by mn.id::text))[1]
      into v_resolution_count,v_resolution_id
      from pg_catalog.jsonb_array_elements_text(old.candidate_neighborhoods) candidate(name)
      join public.market_neighborhoods mn on lower(mn.name)=lower(candidate.name)
      join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12';

      select e.neighborhood_id into v_evidence_id
      from private.market_neighborhood_resolution_evidence_v1 e
      join public.market_listings l on l.source_listing_id=e.source_listing_id
      where l.id=old.listing_id
      limit 1;

      if not ((v_resolution_count=1 and v_resolution_id is not distinct from new.suggested_neighborhood_id)
              or (v_evidence_id is not null and v_evidence_id is not distinct from new.suggested_neighborhood_id)) then
        raise exception 'Canonical neighborhood resolution is not supported by deterministic evidence';
      end if;
    elsif v_system_context
      and old.decision='pending'
      and new.decision='resolved_by_system'
      and new.classification='clear'
      and new.suggested_neighborhood_id is not null
      and new.resolution_origin='system'
      and new.resolver_version='v3' then
      select * into v_signal
      from private.resolve_market_neighborhood_signal_v2(old.listing_id)
      limit 1;
      if v_signal.neighborhood_id is null
         or v_signal.neighborhood_id is distinct from new.suggested_neighborhood_id then
        raise exception 'System neighborhood resolution no longer matches deterministic evidence';
      end if;
    else
      raise exception 'Neighborhood review evidence is immutable';
    end if;
  end if;

  if new.decision is distinct from old.decision then
    if old.decision <> 'pending' then
      raise exception 'Neighborhood review decision transition is invalid';
    end if;

    if new.decision in ('accepted','discarded') then
      if coalesce(auth.jwt()->>'aal','') <> 'aal2' or auth.uid() is null then
        raise exception 'AAL2 required for neighborhood review decision';
      end if;
      if not exists (
        select 1 from public.profiles p
        where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','ceo')
      ) then
        raise exception 'Neighborhood review decision requires CEO or admin role';
      end if;
      new.resolution_origin:='human';
      new.resolver_version:=null;
      new.reviewer_id:=auth.uid();
      new.reviewed_at:=now();
      new.updated_at:=now();
    elsif new.decision='resolved_by_system' then
      if not v_system_context then
        raise exception 'System neighborhood resolution requires internal resolver context';
      end if;
      if new.classification<>'clear' or new.suggested_neighborhood_id is null then
        raise exception 'System neighborhood resolution requires a clear canonical suggestion';
      end if;
      new.resolution_origin:='system';
      new.resolver_version:='v3';
      new.reviewer_id:=null;
      new.reviewed_at:=now();
      new.updated_at:=now();
    else
      raise exception 'Neighborhood review decision transition is invalid';
    end if;
  elsif new.reviewer_id is distinct from old.reviewer_id
     or new.reviewed_at is distinct from old.reviewed_at
     or new.resolution_origin is distinct from old.resolution_origin
     or new.resolver_version is distinct from old.resolver_version then
    raise exception 'Neighborhood review audit fields are immutable';
  end if;

  return new;
end;
$function$;

create or replace function private.audit_market_neighborhood_review_decision()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if new.decision is not distinct from old.decision then return new; end if;

  if new.decision='resolved_by_system' then
    if current_user<>'postgres'
       or current_setting('app.market_neighborhood_system_resolution',true)<>'v3'
       or new.resolution_origin<>'system'
       or new.reviewer_id is not null
       or new.reviewed_at is null then
      raise exception 'Invalid system neighborhood resolution audit context';
    end if;
    return new;
  end if;

  if old.decision <> 'pending' or new.decision not in ('accepted','discarded') then
    raise exception 'Invalid neighborhood review decision transition';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception 'AAL2 required for neighborhood review audit';
  end if;
  if auth.uid() is null or new.reviewer_id is distinct from auth.uid() or new.reviewed_at is null then
    raise exception 'Neighborhood review decision requires authenticated reviewer and timestamp';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','ceo')
  ) then
    raise exception 'Neighborhood review decision requires leader role';
  end if;

  insert into public.market_neighborhood_review_events(
    review_item_id,previous_decision,decision,reviewer_id,created_at
  ) values (
    new.id,old.decision,new.decision,new.reviewer_id,new.reviewed_at
  );
  return new;
end;
$function$;

create or replace function private.promote_accepted_neighborhood_review_to_canonical()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_listing public.market_listings%rowtype;
  v_address_key text;
  v_property_id uuid;
  v_existing_neighborhood uuid;
  v_system boolean;
  v_correction_ready boolean:=false;
  v_source_kind text;
begin
  if new.decision is not distinct from old.decision
     or new.decision not in ('accepted','resolved_by_system') then
    return new;
  end if;

  if old.decision <> 'pending' or new.suggested_neighborhood_id is null then
    raise exception 'Resolved neighborhood review is not eligible for canonical promotion';
  end if;

  if not exists (
    select 1
    from public.market_neighborhoods mn
    join public.market_sources ms on ms.id=mn.geometry_source_id
    where mn.id=new.suggested_neighborhood_id
      and ms.code='kml_vitacura_barrios_2026_08_12'
  ) then
    raise exception 'Resolved neighborhood must belong to the canonical Vitacura KML';
  end if;

  v_system := new.decision='resolved_by_system' and new.resolution_origin='system';

  select * into v_listing
  from public.market_listings
  where id=new.listing_id
  for update;
  if v_listing.id is null then raise exception 'Neighborhood review listing no longer exists'; end if;

  v_address_key:=private.normalize_market_address(coalesce(v_listing.normalized_address,v_listing.raw_address));
  if v_address_key is null then raise exception 'Resolved neighborhood review requires an address'; end if;

  v_property_id:=v_listing.property_id;
  if v_property_id is not null then
    select mp.neighborhood_id into v_existing_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id
    for update;

    if v_existing_neighborhood is null then
      update public.market_properties
      set neighborhood_id=new.suggested_neighborhood_id,updated_at=now()
      where id=v_property_id;
    elsif v_existing_neighborhood is distinct from new.suggested_neighborhood_id then
      if not v_system then
        raise exception 'Canonical property already has a different neighborhood';
      end if;
      select exists(
        select 1
        from private.market_neighborhood_resolution_evidence_v1 e
        where e.source_listing_id=v_listing.source_listing_id
          and e.neighborhood_id=new.suggested_neighborhood_id
          and lower(coalesce(e.evidence->>'correction_ready','false'))='true'
      ) into v_correction_ready;
      if not v_correction_ready then
        raise exception 'Canonical conflict is not eligible for automatic correction';
      end if;
      update public.market_properties
      set neighborhood_id=new.suggested_neighborhood_id,updated_at=now()
      where id=v_property_id and neighborhood_id=v_existing_neighborhood;
    end if;
  end if;

  v_source_kind:=case when v_system then 'system_resolver' else 'human_review' end;

  insert into private.market_address_resolution_memory(
    address_key,display_address,neighborhood_id,canonical_property_id,source_kind,confidence,evidence,
    first_seen_at,last_seen_at,updated_at
  ) values (
    v_address_key,
    coalesce(v_listing.normalized_address,v_listing.raw_address),
    new.suggested_neighborhood_id,
    v_property_id,
    v_source_kind,
    1,
    jsonb_build_object(
      'method',case when v_system then 'system_neighborhood_resolution_v3' else 'accepted_neighborhood_review_v1' end,
      'review_item_id',new.id,
      'source_listing_id',v_listing.source_listing_id,
      'resolution_origin',new.resolution_origin,
      'resolver_version',new.resolver_version,
      'reviewer_id',new.reviewer_id
    ),
    coalesce(v_listing.observed_at,now()),now(),now()
  )
  on conflict (address_key) do update set
    display_address=excluded.display_address,
    neighborhood_id=excluded.neighborhood_id,
    canonical_property_id=coalesce(excluded.canonical_property_id,private.market_address_resolution_memory.canonical_property_id),
    source_kind=excluded.source_kind,
    confidence=greatest(private.market_address_resolution_memory.confidence,excluded.confidence),
    evidence=private.market_address_resolution_memory.evidence || excluded.evidence,
    last_seen_at=now(),
    updated_at=now();

  return new;
end;
$function$;

create or replace function private.auto_resolve_market_neighborhood_review_v3(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_review record;
  v_listing record;
  v_signal record;
  v_property_id uuid;
  v_previous_neighborhood uuid;
  v_after_neighborhood uuid;
  v_correction_ready boolean:=false;
  v_action text;
begin
  perform pg_catalog.set_config('app.market_neighborhood_system_resolution','v3',true);

  select r.id,r.listing_id,r.decision
  into v_review
  from public.market_neighborhood_review_items r
  where r.id=p_review_id
  for update;
  if v_review.id is null or v_review.decision<>'pending' then return false; end if;

  select l.id,l.source_listing_id,l.property_id
  into v_listing
  from public.market_listings l
  where l.id=v_review.listing_id;
  if v_listing.id is null then return false; end if;

  select * into v_signal
  from private.resolve_market_neighborhood_signal_v2(v_listing.id)
  limit 1;
  if v_signal.neighborhood_id is null then return false; end if;

  v_property_id:=v_listing.property_id;
  if v_property_id is not null then
    select mp.neighborhood_id into v_previous_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id;

    if v_previous_neighborhood is not null
       and v_previous_neighborhood is distinct from v_signal.neighborhood_id then
      select exists(
        select 1
        from private.market_neighborhood_resolution_evidence_v1 e
        where e.source_listing_id=v_listing.source_listing_id
          and e.neighborhood_id=v_signal.neighborhood_id
          and lower(coalesce(e.evidence->>'correction_ready','false'))='true'
      ) into v_correction_ready;
      if not v_correction_ready then return false; end if;
    end if;
  end if;

  update public.market_neighborhood_review_items
  set classification='clear',
      suggested_neighborhood_id=v_signal.neighborhood_id,
      decision='resolved_by_system',
      resolution_origin='system',
      resolver_version='v3',
      reviewer_id=null,
      reviewed_at=now(),
      updated_at=now()
  where id=p_review_id and decision='pending';
  if not found then return false; end if;

  if v_property_id is null then
    v_action:='listing_territory_resolved';
  else
    select mp.neighborhood_id into v_after_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id;
    if v_previous_neighborhood is null and v_after_neighborhood=v_signal.neighborhood_id then
      v_action:='canonical_assigned';
    elsif v_previous_neighborhood is distinct from v_signal.neighborhood_id and v_after_neighborhood=v_signal.neighborhood_id then
      v_action:='canonical_corrected';
    else
      v_action:='canonical_already_correct';
    end if;
  end if;

  insert into private.market_neighborhood_resolution_audit_v3(
    listing_id,source_listing_id,review_item_id,property_id,action,
    previous_neighborhood_id,resolved_neighborhood_id,resolution_kind,resolver_version,evidence
  ) values (
    v_listing.id,v_listing.source_listing_id,p_review_id,v_property_id,v_action,
    v_previous_neighborhood,v_signal.neighborhood_id,v_signal.resolution_kind,'v3',
    coalesce(v_signal.evidence,'{}'::jsonb) || jsonb_build_object('reason',v_signal.reason)
  );

  return true;
end;
$function$;

revoke all on function private.auto_resolve_market_neighborhood_review_v3(uuid) from public,anon,authenticated;

create or replace function private.enqueue_market_neighborhood_review_item()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  source_code text;
  matched_ids uuid[];
  matched_names text[];
  match_count integer;
  combined_text text;
  v_canonical_neighborhood_id uuid;
  v_signal record;
  v_review_id uuid;
begin
  select ms.code into source_code from public.market_sources ms where ms.id=new.source_id;
  if source_code not in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
    'portal-inmobiliario-vitacura-portal-projects'
  ) then return new; end if;

  if new.property_id is not null then
    select mp.neighborhood_id into v_canonical_neighborhood_id
    from public.market_properties mp where mp.id=new.property_id;
  end if;

  select * into v_signal from private.resolve_market_neighborhood_signal_v2(new.id) limit 1;

  if v_canonical_neighborhood_id is not null
     and (v_signal.neighborhood_id is null or v_signal.neighborhood_id=v_canonical_neighborhood_id) then
    return new;
  end if;

  if v_signal.neighborhood_id is not null then
    insert into public.market_neighborhood_review_items(
      listing_id,classification,suggested_neighborhood_id,candidate_neighborhoods,evidence
    ) values (
      new.id,'clear',v_signal.neighborhood_id,jsonb_build_array(v_signal.neighborhood_name),
      coalesce(v_signal.evidence,'{}'::jsonb) || jsonb_build_object(
        'source_listing_id',new.source_listing_id,
        'method',v_signal.resolution_kind,
        'reason',v_signal.reason,
        'canonical_write',false,
        'source_code',source_code,
        'canonical_conflict',v_canonical_neighborhood_id is not null and v_canonical_neighborhood_id<>v_signal.neighborhood_id,
        'generated_at',now()
      )
    ) on conflict (listing_id) do update
      set updated_at=public.market_neighborhood_review_items.updated_at
    returning id into v_review_id;

    perform private.auto_resolve_market_neighborhood_review_v3(v_review_id);
    return new;
  end if;

  combined_text:=lower(extensions.unaccent(coalesce(new.raw_address,'') || ' ' || coalesce(new.title,'')));
  select coalesce(array_agg(mn.id order by length(mn.name) desc) filter (where mn.id is not null),array[]::uuid[]),
         coalesce(array_agg(mn.name order by length(mn.name) desc) filter (where mn.id is not null),array[]::text[]),
         count(mn.id)::integer
  into matched_ids,matched_names,match_count
  from public.market_neighborhoods mn
  join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
  where combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%';

  insert into public.market_neighborhood_review_items(
    listing_id,classification,suggested_neighborhood_id,candidate_neighborhoods,evidence
  ) values (
    new.id,
    case when match_count=1 then 'clear' when match_count>1 then 'ambiguous' else 'no_match' end,
    case when match_count=1 then matched_ids[1] else null end,
    to_jsonb(matched_names),
    jsonb_build_object(
      'source_listing_id',new.source_listing_id,'method','canonical_kml_only_v3','canonical_write',false,
      'source_code',source_code,'generated_at',now()
    )
  ) on conflict (listing_id) do nothing;
  return new;
end;
$function$;

create or replace function public.get_market_house_territory_progress_v1()
returns table(
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
set search_path=''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then raise exception 'Insufficient permissions' using errcode='42501'; end if;

  return query
  with source as (
    select id from public.market_sources where code='portal-inmobiliario-vitacura-portal-houses' limit 1
  ), kml_source as (
    select id from public.market_sources where code='kml_vitacura_barrios_2026_08_12' limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.property_id,l.status
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.id,r.classification,r.suggested_neighborhood_id,r.decision
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source)
    order by l.source_listing_id,r.created_at desc,r.id desc
  ), state as (
    select ll.*,
      mp.neighborhood_id as property_neighborhood_id,
      pn.geometry_source_id as property_geometry_source_id,
      lr.classification,lr.suggested_neighborhood_id,lr.decision,
      rn.geometry_source_id as review_geometry_source_id,
      sig.neighborhood_id as pending_signal_id
    from latest_listing ll
    left join public.market_properties mp on mp.id=ll.property_id
    left join public.market_neighborhoods pn on pn.id=mp.neighborhood_id
    left join latest_review lr using(source_listing_id)
    left join public.market_neighborhoods rn on rn.id=lr.suggested_neighborhood_id
    left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig
      on lr.decision='pending'
    where ll.status='active'
  )
  select
    count(*)::bigint,
    count(*) filter (
      where s.property_geometry_source_id=(select id from kml_source)
         or (s.decision in ('accepted','resolved_by_system') and s.review_geometry_source_id=(select id from kml_source))
    )::bigint,
    count(*) filter (where s.decision='pending' and s.pending_signal_id is not null)::bigint,
    count(*) filter (where s.decision='pending' and s.pending_signal_id is null and s.classification='ambiguous')::bigint,
    count(*) filter (where s.decision='pending' and s.pending_signal_id is null and coalesce(s.classification,'no_match')<>'ambiguous')::bigint,
    count(*) filter (where s.decision='accepted')::bigint,
    count(*) filter (where s.decision='discarded')::bigint
  from state s;
end;
$function$;

with current_houses as (
  select distinct on (l.source_listing_id) l.source_listing_id
  from public.market_listings l
  join public.market_sources s on s.id=l.source_id and s.code='portal-inmobiliario-vitacura-portal-houses'
  where l.status='active'
  order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
), latest_pending as (
  select distinct on (l.source_listing_id)
    l.source_listing_id,r.id
  from public.market_neighborhood_review_items r
  join public.market_listings l on l.id=r.listing_id
  join current_houses ch on ch.source_listing_id=l.source_listing_id
  where r.decision='pending'
  order by l.source_listing_id,r.created_at desc,r.id desc
)
select private.auto_resolve_market_neighborhood_review_v3(lp.id)
from latest_pending lp;
