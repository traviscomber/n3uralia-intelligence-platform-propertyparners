create table if not exists private.market_listing_identity_memory_v1 (
  source_id uuid not null references public.market_sources(id) on delete cascade,
  source_listing_id text not null,
  property_id uuid not null references public.market_properties(id) on delete restrict,
  resolution_kind text not null check (resolution_kind in ('match','external_identity','confirmed_component')),
  source_reference text not null,
  notes text,
  decided_by uuid not null references public.profiles(id) on delete restrict,
  decided_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (source_id, source_listing_id)
);

revoke all on private.market_listing_identity_memory_v1 from public, anon, authenticated;

create table if not exists private.market_live_identity_decisions_v1 (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete restrict,
  source_id uuid not null references public.market_sources(id) on delete restrict,
  source_listing_id text not null,
  property_id uuid references public.market_properties(id) on delete restrict,
  match_id uuid references public.market_property_matches(id) on delete restrict,
  resolution_kind text not null check (resolution_kind in ('match','external_identity','confirmed_component')),
  decision text not null check (decision in ('confirmed','rejected')),
  source_reference text not null,
  notes text,
  decided_by uuid not null references public.profiles(id) on delete restrict,
  decided_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb
);

revoke all on private.market_live_identity_decisions_v1 from public, anon, authenticated;

create or replace function private.apply_market_listing_identity_memory_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_property_id uuid;
begin
  if new.property_id is not null or nullif(btrim(new.source_listing_id), '') is null then
    return new;
  end if;

  select m.property_id
  into v_property_id
  from private.market_listing_identity_memory_v1 m
  where m.source_id = new.source_id
    and m.source_listing_id = new.source_listing_id
    and m.active = true;

  if v_property_id is not null then
    new.property_id := v_property_id;
  end if;

  return new;
end;
$function$;

revoke all on function private.apply_market_listing_identity_memory_v1() from public, anon, authenticated;

drop trigger if exists trg_apply_market_listing_identity_memory_v1 on public.market_listings;
create trigger trg_apply_market_listing_identity_memory_v1
before insert on public.market_listings
for each row execute function private.apply_market_listing_identity_memory_v1();

create or replace function public.get_market_live_identity_queue_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  with recursive
  source as (
    select id
    from public.market_sources
    where code = 'portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ),
  live as (
    select ml.id, ml.source_id, ml.source_listing_id, ml.title, ml.normalized_address, ml.url, ml.price_uf, ml.observed_at, ml.raw_payload
    from public.market_current_listings ml
    where ml.source_id = (select id from source)
      and ml.status in ('active','observed')
      and lower(btrim(coalesce(ml.operation,''))) in ('sale','venta')
      and ml.property_id is null
      and nullif(btrim(ml.source_listing_id),'') is not null
  ),
  nodes as (
    select id from public.market_properties where property_type = 'Casa'
  ),
  edges as (
    select m.left_entity_id as a, m.right_entity_id as b
    from public.market_property_matches m
    where m.status = 'confirmed' and m.left_entity_type = 'property' and m.right_entity_type = 'property'
    union all
    select m.right_entity_id, m.left_entity_id
    from public.market_property_matches m
    where m.status = 'confirmed' and m.left_entity_type = 'property' and m.right_entity_type = 'property'
  ),
  reach(start_id, member_id) as (
    select id, id from nodes
    union
    select r.start_id, e.b from reach r join edges e on e.a = r.member_id
  ),
  components as (
    select member_id, min(start_id::text)::uuid as component_id
    from reach group by member_id
  ),
  external_candidates as (
    select l.id as listing_id, p.id as property_id, p.normalized_address, p.identity_status, p.identity_confidence, c.component_id
    from live l
    join public.market_properties p
      on p.property_type = 'Casa'
     and coalesce(p.identity_evidence::text,'') ilike '%' || l.source_listing_id || '%'
    join components c on c.member_id = p.id
  ),
  external_rollup as (
    select listing_id,
      count(*)::bigint as candidate_count,
      count(distinct component_id)::bigint as component_count,
      min(property_id::text)::uuid as sole_property_id,
      min(component_id::text)::uuid as component_id,
      jsonb_agg(jsonb_build_object(
        'propertyId', property_id,
        'address', normalized_address,
        'identityStatus', identity_status,
        'identityConfidence', identity_confidence,
        'componentId', component_id
      ) order by property_id) as candidates
    from external_candidates
    group by listing_id
  ),
  ranked_matches as (
    select l.id as listing_id, m.id as match_id, m.status as match_status, m.score,
      m.right_entity_id as property_id, p.normalized_address as property_address,
      p.identity_status, p.identity_confidence, m.evidence, m.contradictions,
      row_number() over (
        partition by l.id
        order by case m.status when 'candidate_high' then 0 else 1 end, m.score desc, m.created_at desc
      ) as rn
    from live l
    join public.market_property_matches m
      on m.left_entity_type = 'listing'
     and m.left_entity_id = l.id
     and m.right_entity_type = 'property'
     and m.status in ('candidate_high','candidate_medium')
    join public.market_properties p on p.id = m.right_entity_id
  ),
  top_match as (
    select * from ranked_matches where rn = 1
  ),
  classified as (
    select l.id as listing_id, l.source_listing_id, l.title, l.normalized_address, l.url, l.price_uf, l.observed_at,
      case
        when coalesce(er.candidate_count,0) > 1 and er.component_count = 1 then 'confirmed_component'
        when coalesce(er.candidate_count,0) > 1 then 'external_collision'
        when er.candidate_count = 1 then 'external_identity_candidate'
        when tm.match_id is not null then tm.match_status
        else 'evidence_gap'
      end as issue_kind,
      case
        when coalesce(er.candidate_count,0) > 1 and er.component_count = 1 then er.component_id
        when er.candidate_count = 1 then er.sole_property_id
        when tm.match_id is not null then tm.property_id
        else null
      end as candidate_property_id,
      case
        when coalesce(er.candidate_count,0) > 1 and er.component_count = 1 then cp.normalized_address
        when er.candidate_count = 1 then ep.normalized_address
        when tm.match_id is not null then tm.property_address
        else null
      end as candidate_property_address,
      tm.match_id, tm.match_status, tm.score as match_score, tm.evidence as match_evidence,
      tm.contradictions as match_contradictions,
      coalesce(er.candidates,'[]'::jsonb) as external_candidates,
      coalesce(er.candidate_count,0) as external_candidate_count,
      coalesce(er.component_count,0) as external_component_count
    from live l
    left join external_rollup er on er.listing_id = l.id
    left join top_match tm on tm.listing_id = l.id
    left join public.market_properties cp on cp.id = er.component_id
    left join public.market_properties ep on ep.id = er.sole_property_id
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'unlinked', count(*),
      'confirmedComponents', count(*) filter (where issue_kind = 'confirmed_component'),
      'externalCollisions', count(*) filter (where issue_kind = 'external_collision'),
      'strongCandidates', count(*) filter (where issue_kind = 'candidate_high'),
      'mediumCandidates', count(*) filter (where issue_kind = 'candidate_medium'),
      'externalIdentityCandidates', count(*) filter (where issue_kind = 'external_identity_candidate'),
      'evidenceGaps', count(*) filter (where issue_kind = 'evidence_gap')
    ),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'listingId', listing_id,
      'sourceListingId', source_listing_id,
      'title', title,
      'address', normalized_address,
      'url', url,
      'priceUf', price_uf,
      'observedAt', observed_at,
      'issueKind', issue_kind,
      'candidatePropertyId', candidate_property_id,
      'candidatePropertyAddress', candidate_property_address,
      'matchId', match_id,
      'matchStatus', match_status,
      'matchScore', match_score,
      'matchEvidence', match_evidence,
      'matchContradictions', match_contradictions,
      'externalCandidates', external_candidates,
      'externalCandidateCount', external_candidate_count,
      'externalComponentCount', external_component_count
    ) order by
      case issue_kind when 'external_collision' then 0 when 'confirmed_component' then 1 when 'candidate_high' then 2 when 'external_identity_candidate' then 3 when 'candidate_medium' then 4 else 5 end,
      observed_at desc), '[]'::jsonb)
  ) into v_result
  from classified;

  return coalesce(v_result, jsonb_build_object(
    'summary', jsonb_build_object('unlinked',0,'confirmedComponents',0,'externalCollisions',0,'strongCandidates',0,'mediumCandidates',0,'externalIdentityCandidates',0,'evidenceGaps',0),
    'rows','[]'::jsonb
  ));
end;
$function$;

revoke all on function public.get_market_live_identity_queue_v1() from public, anon;
grant execute on function public.get_market_live_identity_queue_v1() to authenticated;

create or replace function public.review_market_live_identity_v1(
  p_listing_id uuid,
  p_resolution_kind text,
  p_decision text,
  p_candidate_property_id uuid,
  p_match_id uuid,
  p_source_reference text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_source_id uuid;
  v_source_listing_id text;
  v_current_property_id uuid;
  v_target_property_id uuid := p_candidate_property_id;
  v_match public.market_property_matches%rowtype;
  v_external_count bigint := 0;
  v_component_count bigint := 0;
  v_component_id uuid;
  v_updated integer := 0;
  v_now timestamptz := now();
  v_review_entry jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception 'MFA_REQUIRED' using errcode = '42501';
  end if;

  if p_resolution_kind not in ('match','external_identity','confirmed_component') then
    raise exception 'Invalid resolution kind' using errcode = '22023';
  end if;
  if p_decision not in ('confirmed','rejected') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  if p_resolution_kind <> 'match' and p_decision <> 'confirmed' then
    raise exception 'Only match candidates can be rejected' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_source_reference,'')),'') is null or length(p_source_reference) > 500 then
    raise exception 'Evidence reference is required' using errcode = '22023';
  end if;
  if length(coalesce(p_notes,'')) > 1000 then
    raise exception 'Notes exceed maximum length' using errcode = '22023';
  end if;

  select ml.source_id, ml.source_listing_id, ml.property_id
  into v_source_id, v_source_listing_id, v_current_property_id
  from public.market_listings ml
  where ml.id = p_listing_id
  for update;

  if v_source_id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.market_current_listings current_listing
    join public.market_sources ms on ms.id = current_listing.source_id
    where current_listing.id = p_listing_id
      and coalesce(nullif(ms.metadata->>'dataset_kind',''),'unknown') = 'portal_houses'
      and current_listing.status in ('active','observed')
      and lower(btrim(coalesce(current_listing.operation,''))) in ('sale','venta')
      and current_listing.property_id is null
  ) then
    raise exception 'Listing is not a current unlinked live house' using errcode = '23514';
  end if;

  if p_resolution_kind = 'match' then
    if p_match_id is null or p_candidate_property_id is null then
      raise exception 'Match and candidate property are required' using errcode = '22023';
    end if;

    select * into v_match from public.market_property_matches m where m.id = p_match_id for update;

    if v_match.id is null
      or v_match.left_entity_type <> 'listing'
      or v_match.left_entity_id <> p_listing_id
      or v_match.right_entity_type <> 'property'
      or v_match.right_entity_id <> p_candidate_property_id
      or v_match.status not in ('candidate_high','candidate_medium') then
      raise exception 'Match is not reviewable for this listing' using errcode = '23514';
    end if;

    v_review_entry := jsonb_build_object(
      'signal','human_review','decision',p_decision,'sourceReference',p_source_reference,
      'notes',nullif(btrim(coalesce(p_notes,'')),''),'reviewedBy',v_user_id,
      'reviewedAt',v_now,'previousStatus',v_match.status
    );

    update public.market_property_matches
    set status = p_decision,
        evidence = coalesce(v_match.evidence,'[]'::jsonb) || jsonb_build_array(v_review_entry),
        reviewed_by = v_user_id,
        reviewed_at = v_now
    where id = p_match_id;

    if p_decision = 'rejected' then
      insert into private.market_live_identity_decisions_v1(
        listing_id,source_id,source_listing_id,property_id,match_id,resolution_kind,decision,source_reference,notes,decided_by,decided_at,evidence
      ) values (
        p_listing_id,v_source_id,v_source_listing_id,p_candidate_property_id,p_match_id,'match','rejected',p_source_reference,
        nullif(btrim(coalesce(p_notes,'')),''),v_user_id,v_now,
        jsonb_build_object('matchScore',v_match.score,'previousMatchStatus',v_match.status)
      );
      return jsonb_build_object('updated',true,'decision','rejected','listingId',p_listing_id,'matchId',p_match_id);
    end if;
  elsif p_resolution_kind in ('external_identity','confirmed_component') then
    if p_candidate_property_id is null then
      raise exception 'Candidate property is required' using errcode = '22023';
    end if;

    with recursive
    nodes as (select id from public.market_properties where property_type = 'Casa'),
    edges as (
      select m.left_entity_id as a, m.right_entity_id as b
      from public.market_property_matches m
      where m.status = 'confirmed' and m.left_entity_type = 'property' and m.right_entity_type = 'property'
      union all
      select m.right_entity_id, m.left_entity_id
      from public.market_property_matches m
      where m.status = 'confirmed' and m.left_entity_type = 'property' and m.right_entity_type = 'property'
    ),
    reach(start_id,member_id) as (
      select id,id from nodes
      union
      select r.start_id,e.b from reach r join edges e on e.a=r.member_id
    ),
    components as (
      select member_id,min(start_id::text)::uuid as component_id from reach group by member_id
    ),
    candidates as (
      select p.id,c.component_id
      from public.market_properties p
      join components c on c.member_id=p.id
      where p.property_type='Casa'
        and coalesce(p.identity_evidence::text,'') ilike '%' || v_source_listing_id || '%'
    )
    select count(*)::bigint, count(distinct component_id)::bigint, min(component_id::text)::uuid
    into v_external_count,v_component_count,v_component_id
    from candidates;

    if p_resolution_kind = 'external_identity' then
      if v_external_count <> 1 or not exists (
        select 1 from public.market_properties p
        where p.id = p_candidate_property_id and p.property_type='Casa'
          and coalesce(p.identity_evidence::text,'') ilike '%' || v_source_listing_id || '%'
      ) then
        raise exception 'External identity is not unique' using errcode = '23514';
      end if;
    else
      if v_external_count < 2 or v_component_count <> 1 or v_component_id is distinct from p_candidate_property_id then
        raise exception 'Candidates do not form one confirmed duplicate component' using errcode = '23514';
      end if;
    end if;
  end if;

  if not exists (select 1 from public.market_properties p where p.id = v_target_property_id) then
    raise exception 'Candidate property not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.market_listings ml
    where ml.source_id = v_source_id and ml.source_listing_id = v_source_listing_id
      and ml.property_id is not null and ml.property_id <> v_target_property_id
  ) then
    raise exception 'Historical listing observations contain a conflicting property link' using errcode = '23514';
  end if;

  insert into private.market_listing_identity_memory_v1(
    source_id,source_listing_id,property_id,resolution_kind,source_reference,notes,decided_by,decided_at,active
  ) values (
    v_source_id,v_source_listing_id,v_target_property_id,p_resolution_kind,p_source_reference,
    nullif(btrim(coalesce(p_notes,'')),''),v_user_id,v_now,true
  )
  on conflict (source_id,source_listing_id) do update set
    property_id = excluded.property_id,
    resolution_kind = excluded.resolution_kind,
    source_reference = excluded.source_reference,
    notes = excluded.notes,
    decided_by = excluded.decided_by,
    decided_at = excluded.decided_at,
    active = true;

  update public.market_listings ml
  set property_id = v_target_property_id
  where ml.source_id = v_source_id and ml.source_listing_id = v_source_listing_id and ml.property_id is null;
  get diagnostics v_updated = row_count;

  insert into private.market_live_identity_decisions_v1(
    listing_id,source_id,source_listing_id,property_id,match_id,resolution_kind,decision,source_reference,notes,decided_by,decided_at,evidence
  ) values (
    p_listing_id,v_source_id,v_source_listing_id,v_target_property_id,p_match_id,p_resolution_kind,'confirmed',p_source_reference,
    nullif(btrim(coalesce(p_notes,'')),''),v_user_id,v_now,
    jsonb_build_object('updatedListingRows',v_updated,'externalCandidateCount',v_external_count,'componentCount',v_component_count)
  );

  return jsonb_build_object(
    'updated',true,'decision','confirmed','listingId',p_listing_id,'sourceListingId',v_source_listing_id,
    'propertyId',v_target_property_id,'resolutionKind',p_resolution_kind,
    'updatedListingRows',v_updated,'memorySaved',true
  );
end;
$function$;

revoke all on function public.review_market_live_identity_v1(uuid,text,text,uuid,uuid,text,text) from public, anon;
grant execute on function public.review_market_live_identity_v1(uuid,text,text,uuid,uuid,text,text) to authenticated;