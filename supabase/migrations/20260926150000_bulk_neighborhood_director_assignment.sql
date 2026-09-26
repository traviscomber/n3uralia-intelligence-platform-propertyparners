create or replace function public.assign_property_neighborhood_directors_bulk_v1(
  p_assignments jsonb,
  p_actor_id uuid,
  p_reason text default null,
  p_source text default 'prospect-territory-bulk'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_neighborhood_id uuid;
  v_director_key text;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_created integer := 0;
  v_reassigned integer := 0;
  v_changed integer := 0;
  v_seen uuid[] := '{}';
begin
  if p_assignments is null
     or jsonb_typeof(p_assignments) <> 'array'
     or jsonb_array_length(p_assignments) = 0
     or jsonb_array_length(p_assignments) > 100 then
    raise exception 'INVALID_ASSIGNMENT_BATCH';
  end if;

  for v_item in select value from jsonb_array_elements(p_assignments)
  loop
    begin
      v_neighborhood_id := nullif(v_item->>'neighborhoodId','')::uuid;
    exception when others then
      raise exception 'INVALID_NEIGHBORHOOD_ID';
    end;
    v_director_key := nullif(btrim(v_item->>'directorKey'),'');

    if v_neighborhood_id is null or v_director_key is null then
      raise exception 'INVALID_ASSIGNMENT';
    end if;

    if v_neighborhood_id = any(v_seen) then
      raise exception 'DUPLICATE_NEIGHBORHOOD_ASSIGNMENT';
    end if;
    v_seen := array_append(v_seen, v_neighborhood_id);

    v_result := public.assign_property_neighborhood_director_v1(
      v_neighborhood_id,
      v_director_key,
      p_actor_id,
      p_reason,
      p_source
    );

    v_created := v_created + coalesce((v_result->>'createdLeads')::integer,0);
    v_reassigned := v_reassigned + coalesce((v_result->>'reassignedLeads')::integer,0);
    if coalesce((v_result->>'changed')::boolean,false) then
      v_changed := v_changed + 1;
    end if;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'neighborhoodId', v_neighborhood_id,
        'directorKey', v_director_key,
        'result', v_result
      )
    );
  end loop;

  return jsonb_build_object(
    'processed', jsonb_array_length(p_assignments),
    'changed', v_changed,
    'createdLeads', v_created,
    'reassignedLeads', v_reassigned,
    'results', v_results
  );
end;
$$;

revoke all on function public.assign_property_neighborhood_directors_bulk_v1(jsonb,uuid,text,text) from public;
revoke all on function public.assign_property_neighborhood_directors_bulk_v1(jsonb,uuid,text,text) from anon;
revoke all on function public.assign_property_neighborhood_directors_bulk_v1(jsonb,uuid,text,text) from authenticated;
grant execute on function public.assign_property_neighborhood_directors_bulk_v1(jsonb,uuid,text,text) to service_role;
