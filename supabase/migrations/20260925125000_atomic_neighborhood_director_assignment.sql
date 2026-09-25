create or replace function public.assign_property_neighborhood_director_v1(
  p_neighborhood_id uuid,
  p_director_key text,
  p_actor_id uuid,
  p_reason text default null,
  p_source text default 'property-360'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_previous_id uuid;
  v_previous_director text;
  v_assignment_id uuid;
  v_reassigned_leads integer := 0;
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
    return jsonb_build_object(
      'changed', false,
      'assignmentId', v_previous_id,
      'directorKey', p_director_key,
      'reassignedLeads', 0
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
      and l.director_key <> p_director_key
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

  return jsonb_build_object(
    'changed', true,
    'assignmentId', v_assignment_id,
    'previousDirectorKey', v_previous_director,
    'directorKey', p_director_key,
    'reassignedLeads', v_reassigned_leads
  );
end;
$$;

revoke execute on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from public;
revoke execute on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from anon;
revoke execute on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) from authenticated;
grant execute on function public.assign_property_neighborhood_director_v1(uuid,text,uuid,text,text) to service_role;
