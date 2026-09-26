create or replace function public.refresh_property_prospect_leads_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_eligible integer := 0;
  v_inserted integer := 0;
begin
  with latest_listing as materialized (
    select distinct on (l.property_id)
      l.property_id,
      p.neighborhood_id,
      t.director_key,
      l.source_listing_id,
      l.url,
      l.observed_at
    from public.market_current_listings l
    join public.market_properties p
      on p.id = l.property_id
    join public.market_neighborhood_director_assignments t
      on t.neighborhood_id = p.neighborhood_id
     and t.active
     and t.valid_to is null
    join public.property_director_directory d
      on d.director_key = t.director_key
     and d.active
    where l.property_id is not null
      and p.neighborhood_id is not null
      and l.status in ('active','observed')
      and lower(btrim(coalesce(l.operation,''))) in ('sale','venta','sell')
    order by l.property_id, l.observed_at desc nulls last, l.created_at desc
  ), eligible as (
    select ll.*
    from latest_listing ll
    where not exists (
      select 1
      from public.property_prospect_leads lead
      where lead.property_id = ll.property_id
    )
  ), counted as (
    select count(*)::integer as n from eligible
  ), inserted as (
    insert into public.property_prospect_leads (
      property_id,
      neighborhood_id,
      director_key,
      source_listing_id,
      source_url,
      lead_reason,
      status,
      priority,
      detected_at,
      assigned_at,
      created_at,
      updated_at
    )
    select
      e.property_id,
      e.neighborhood_id,
      e.director_key,
      e.source_listing_id,
      e.url,
      'Publicación vigente vinculada a propiedad canónica con territorio de dirección confirmado.',
      'assigned',
      'normal',
      now(),
      now(),
      now(),
      now()
    from eligible e
    on conflict (property_id) do nothing
    returning id, property_id, neighborhood_id, director_key, source_listing_id, source_url
  ), lead_events as (
    insert into public.property_prospect_events (
      lead_id,
      property_id,
      event_type,
      actor_id,
      to_status,
      note,
      metadata,
      occurred_at
    )
    select
      i.id,
      i.property_id,
      'lead_created',
      null,
      'assigned',
      'Lead creado automáticamente desde publicación vigente + identidad canónica + territorio confirmado.',
      jsonb_build_object(
        'sourceListingId', i.source_listing_id,
        'sourceUrl', i.source_url,
        'neighborhoodId', i.neighborhood_id,
        'directorKey', i.director_key,
        'pipeline', 'property_prospect_auto_v1'
      ),
      now()
    from inserted i
    union all
    select
      i.id,
      i.property_id,
      'director_assigned',
      null,
      'assigned',
      'Dirección responsable heredada del territorio confirmado del barrio.',
      jsonb_build_object(
        'neighborhoodId', i.neighborhood_id,
        'directorKey', i.director_key,
        'pipeline', 'property_prospect_auto_v1'
      ),
      now()
    from inserted i
    returning id
  )
  select
    coalesce((select n from counted), 0),
    coalesce((select count(*) from inserted), 0)
  into v_eligible, v_inserted;

  return jsonb_build_object(
    'eligible', v_eligible,
    'inserted', v_inserted,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.refresh_property_prospect_leads_v1() from public;
revoke all on function public.refresh_property_prospect_leads_v1() from anon;
revoke all on function public.refresh_property_prospect_leads_v1() from authenticated;
grant execute on function public.refresh_property_prospect_leads_v1() to service_role;


create or replace function public.assign_property_neighborhood_director_v1(
  p_neighborhood_id uuid,
  p_director_key text,
  p_actor_id uuid,
  p_reason text default null,
  p_source text default 'property-360'
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_previous_id uuid;
  v_previous_director text;
  v_assignment_id uuid;
  v_reassigned_leads integer := 0;
  v_refresh jsonb := '{}'::jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_neighborhood_id::text, 0));

  if not exists (
    select 1
    from public.market_neighborhoods n
    where n.id = p_neighborhood_id
  ) then
    raise exception 'NEIGHBORHOOD_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.property_director_directory d
    where d.director_key = p_director_key
      and d.active
  ) then
    raise exception 'DIRECTOR_NOT_AVAILABLE';
  end if;

  select a.id, a.director_key
    into v_previous_id, v_previous_director
  from public.market_neighborhood_director_assignments a
  where a.neighborhood_id = p_neighborhood_id
    and a.active
    and a.valid_to is null
  for update;

  if v_previous_id is not null and v_previous_director = p_director_key then
    v_refresh := public.refresh_property_prospect_leads_v1();
    return jsonb_build_object(
      'changed', false,
      'assignmentId', v_previous_id,
      'directorKey', p_director_key,
      'reassignedLeads', 0,
      'createdLeads', coalesce((v_refresh->>'inserted')::integer, 0)
    );
  end if;

  if v_previous_id is not null then
    update public.market_neighborhood_director_assignments
    set active = false,
        valid_to = current_date,
        updated_at = v_now
    where id = v_previous_id;
  end if;

  insert into public.market_neighborhood_director_assignments (
    neighborhood_id,
    director_key,
    assignment_reason,
    source,
    assigned_by,
    created_at,
    updated_at
  )
  values (
    p_neighborhood_id,
    p_director_key,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_source, '')), ''),
    p_actor_id,
    v_now,
    v_now
  )
  returning id into v_assignment_id;

  with affected as materialized (
    select
      l.id,
      l.property_id,
      l.director_key as previous_director_key
    from public.property_prospect_leads l
    where l.neighborhood_id = p_neighborhood_id
      and l.status in ('new','assigned','contacting','qualified','valuation','proposal')
      and l.director_key is distinct from p_director_key
    for update
  ),
  updated as (
    update public.property_prospect_leads l
    set director_key = p_director_key,
        assigned_at = v_now,
        updated_by = p_actor_id,
        updated_at = v_now
    from affected a
    where l.id = a.id
    returning l.id, l.property_id, a.previous_director_key
  )
  insert into public.property_prospect_events (
    lead_id,
    property_id,
    event_type,
    actor_id,
    note,
    metadata,
    occurred_at
  )
  select
    u.id,
    u.property_id,
    'director_reassigned',
    p_actor_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    jsonb_build_object(
      'fromDirectorKey', u.previous_director_key,
      'toDirectorKey', p_director_key,
      'neighborhoodId', p_neighborhood_id,
      'territoryAssignmentId', v_assignment_id
    ),
    v_now
  from updated u;

  get diagnostics v_reassigned_leads = row_count;

  v_refresh := public.refresh_property_prospect_leads_v1();

  return jsonb_build_object(
    'changed', true,
    'assignmentId', v_assignment_id,
    'previousDirectorKey', v_previous_director,
    'directorKey', p_director_key,
    'reassignedLeads', v_reassigned_leads,
    'createdLeads', coalesce((v_refresh->>'inserted')::integer, 0)
  );
end;
$$;

revoke all on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from public;
revoke all on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from anon;
revoke all on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from authenticated;
grant execute on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) to service_role;
