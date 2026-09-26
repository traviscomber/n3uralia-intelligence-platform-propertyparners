create table if not exists public.property_territory_groups (
  id uuid primary key default gen_random_uuid(),
  group_key text not null unique,
  name text not null,
  source text not null,
  source_effective_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.property_territory_groups enable row level security;
revoke all on table public.property_territory_groups from public, anon;
revoke all on table public.property_territory_groups from authenticated;
grant all on table public.property_territory_groups to service_role;

create table if not exists public.property_territory_group_neighborhoods (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.property_territory_groups(id),
  neighborhood_id uuid not null references public.market_neighborhoods(id),
  valid_from date not null default current_date,
  valid_to date,
  active boolean not null default true,
  source text not null,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);

alter table public.property_territory_group_neighborhoods enable row level security;
revoke all on table public.property_territory_group_neighborhoods from public, anon;
revoke all on table public.property_territory_group_neighborhoods from authenticated;
grant all on table public.property_territory_group_neighborhoods to service_role;

create unique index if not exists property_territory_group_neighborhoods_one_current_group_idx
on public.property_territory_group_neighborhoods(neighborhood_id)
where active and valid_to is null;

create table if not exists public.property_territory_group_director_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.property_territory_groups(id),
  director_key text not null references public.property_director_directory(director_key),
  assignment_role text not null default 'primary',
  valid_from date not null default current_date,
  valid_to date,
  active boolean not null default true,
  source text not null,
  assignment_reason text,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assignment_role in ('primary','secondary')),
  check (valid_to is null or valid_to >= valid_from)
);

alter table public.property_territory_group_director_assignments enable row level security;
revoke all on table public.property_territory_group_director_assignments from public, anon;
revoke all on table public.property_territory_group_director_assignments from authenticated;
grant all on table public.property_territory_group_director_assignments to service_role;

create unique index if not exists property_territory_group_one_primary_director_idx
on public.property_territory_group_director_assignments(group_id)
where active and valid_to is null and assignment_role='primary';

create unique index if not exists property_territory_group_one_current_person_idx
on public.property_territory_group_director_assignments(group_id,director_key)
where active and valid_to is null;

insert into public.property_territory_groups(group_key,name,source,source_effective_date)
values
  ('santa-maria','Santa María','pedro-pablo-territory-report',date '2026-09-26'),
  ('lo-beltran','Lo Beltrán','pedro-pablo-territory-report',date '2026-09-26'),
  ('nueva-costanera','Nueva Costanera','pedro-pablo-territory-report',date '2026-09-26')
on conflict (group_key) do update
set name=excluded.name,
    source=excluded.source,
    source_effective_date=excluded.source_effective_date,
    active=true,
    updated_at=now();

with ranked_people as (
  select
    g.id as group_id,
    g.group_key,
    d.director_key,
    row_number() over (
      partition by g.id
      order by
        case when lower(coalesce(d.role,''))='director' then 0 else 1 end,
        d.full_name,
        d.director_key
    ) as routing_rank
  from public.property_territory_groups g
  join public.property_director_directory d
    on lower(extensions.unaccent(btrim(d.office_name)))=
       lower(extensions.unaccent(btrim(g.name)))
   and d.active
  where g.active
),
desired as (
  select
    group_id,
    director_key,
    case when routing_rank=1 then 'primary' else 'secondary' end as assignment_role
  from ranked_people
)
insert into public.property_territory_group_director_assignments(
  group_id,director_key,assignment_role,source,assignment_reason
)
select
  d.group_id,
  d.director_key,
  d.assignment_role,
  'canonical-property-director-directory',
  'Responsabilidad vigente derivada del grupo territorial; el barrio pertenece al grupo y la persona puede cambiar.'
from desired d
where not exists (
  select 1
  from public.property_territory_group_director_assignments a
  where a.group_id=d.group_id
    and a.director_key=d.director_key
    and a.active
    and a.valid_to is null
);

create or replace view public.property_territory_group_staff_v1
with (security_invoker=true)
as
select
  g.id as group_id,
  g.group_key,
  g.name as group_name,
  a.assignment_role,
  a.director_key,
  d.full_name,
  d.role as directory_role,
  d.office_name,
  a.valid_from,
  a.valid_to,
  a.active,
  a.source
from public.property_territory_groups g
join public.property_territory_group_director_assignments a
  on a.group_id=g.id
join public.property_director_directory d
  on d.director_key=a.director_key
where g.active;

revoke all on public.property_territory_group_staff_v1 from public,anon;
revoke all on public.property_territory_group_staff_v1 from authenticated;
grant select on public.property_territory_group_staff_v1 to service_role;

create or replace view public.management_source_records_territory_v1
with (security_invoker=true)
as
select
  r.*,
  g.id as territory_group_id,
  g.group_key as territory_group_key,
  g.name as territory_group_name
from public.management_source_records r
join public.property_territory_groups g
  on lower(extensions.unaccent(btrim(r.office_name)))=
     lower(extensions.unaccent(btrim(g.name)))
 and g.active;

revoke all on public.management_source_records_territory_v1 from public,anon;
revoke all on public.management_source_records_territory_v1 from authenticated;
grant select on public.management_source_records_territory_v1 to service_role;

create or replace function public.get_current_property_territory_assignment_v1(p_neighborhood_id uuid)
returns table (
  group_id uuid,
  group_key text,
  group_name text,
  director_key text,
  director_name text
)
language sql
security invoker
set search_path=''
as $function$
  select
    g.id,
    g.group_key,
    g.name,
    da.director_key,
    d.full_name
  from public.property_territory_group_neighborhoods gn
  join public.property_territory_groups g
    on g.id=gn.group_id
   and g.active
  join public.property_territory_group_director_assignments da
    on da.group_id=g.id
   and da.active
   and da.valid_to is null
   and da.assignment_role='primary'
  join public.property_director_directory d
    on d.director_key=da.director_key
   and d.active
  where gn.neighborhood_id=p_neighborhood_id
    and gn.active
    and gn.valid_to is null
  limit 1;
$function$;

revoke all on function public.get_current_property_territory_assignment_v1(uuid) from public,anon;
revoke all on function public.get_current_property_territory_assignment_v1(uuid) from authenticated;
grant execute on function public.get_current_property_territory_assignment_v1(uuid) to service_role;

create or replace function public.assign_property_territory_group_director_v1(
  p_group_key text,
  p_director_key text,
  p_actor_id uuid,
  p_reason text default null,
  p_source text default 'territory-group-assignment'
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_group_id uuid;
  v_now timestamptz := clock_timestamp();
  v_previous_director text;
  v_assignment_id uuid;
  v_reassigned integer := 0;
begin
  select g.id into v_group_id
  from public.property_territory_groups g
  where g.group_key=p_group_key and g.active
  for update;

  if v_group_id is null then
    raise exception 'TERRITORY_GROUP_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.property_director_directory d
    where d.director_key=p_director_key and d.active
  ) then
    raise exception 'DIRECTOR_NOT_AVAILABLE';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_group_id::text,0));

  select a.director_key into v_previous_director
  from public.property_territory_group_director_assignments a
  where a.group_id=v_group_id
    and a.assignment_role='primary'
    and a.active
    and a.valid_to is null
  limit 1
  for update;

  if v_previous_director=p_director_key then
    return jsonb_build_object(
      'changed',false,
      'groupKey',p_group_key,
      'directorKey',p_director_key,
      'reassignedLeads',0
    );
  end if;

  update public.property_territory_group_director_assignments
  set active=false,valid_to=current_date,updated_at=v_now
  where group_id=v_group_id
    and assignment_role='primary'
    and active
    and valid_to is null;

  update public.property_territory_group_director_assignments
  set assignment_role='primary',updated_at=v_now,assigned_by=p_actor_id,
      assignment_reason=nullif(btrim(coalesce(p_reason,'')),''),
      source=nullif(btrim(coalesce(p_source,'')),'')
  where group_id=v_group_id
    and director_key=p_director_key
    and active
    and valid_to is null
  returning id into v_assignment_id;

  if v_assignment_id is null then
    insert into public.property_territory_group_director_assignments(
      group_id,director_key,assignment_role,source,assignment_reason,assigned_by,created_at,updated_at
    ) values (
      v_group_id,p_director_key,'primary',
      nullif(btrim(coalesce(p_source,'')),''),
      nullif(btrim(coalesce(p_reason,'')),''),
      p_actor_id,v_now,v_now
    )
    returning id into v_assignment_id;
  end if;

  with neighborhood_scope as (
    select gn.neighborhood_id
    from public.property_territory_group_neighborhoods gn
    where gn.group_id=v_group_id
      and gn.active
      and gn.valid_to is null
  ),
  affected as (
    select l.id,l.property_id,l.director_key as previous_director_key
    from public.property_prospect_leads l
    join neighborhood_scope n on n.neighborhood_id=l.neighborhood_id
    where l.status in ('new','assigned','contacting','qualified','valuation','proposal')
      and l.director_key is distinct from p_director_key
    for update
  ),
  updated as (
    update public.property_prospect_leads l
    set director_key=p_director_key,
        assigned_at=v_now,
        updated_by=p_actor_id,
        updated_at=v_now
    from affected a
    where l.id=a.id
    returning l.id,l.property_id,a.previous_director_key
  )
  insert into public.property_prospect_events(
    lead_id,property_id,event_type,actor_id,note,metadata,occurred_at
  )
  select
    u.id,u.property_id,'director_reassigned',p_actor_id,
    nullif(btrim(coalesce(p_reason,'')),''),
    jsonb_build_object(
      'fromDirectorKey',u.previous_director_key,
      'toDirectorKey',p_director_key,
      'territoryGroupKey',p_group_key,
      'territoryGroupAssignmentId',v_assignment_id
    ),
    v_now
  from updated u;

  get diagnostics v_reassigned = row_count;

  return jsonb_build_object(
    'changed',true,
    'groupKey',p_group_key,
    'previousDirectorKey',v_previous_director,
    'directorKey',p_director_key,
    'assignmentId',v_assignment_id,
    'reassignedLeads',v_reassigned
  );
end;
$function$;

revoke all on function public.assign_property_territory_group_director_v1(text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.assign_property_territory_group_director_v1(text,text,uuid,text,text) to service_role;


create or replace function public.refresh_property_prospect_leads_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_eligible integer := 0;
  v_inserted integer := 0;
begin
  with latest_listing as materialized (
    select distinct on (l.property_id)
      l.property_id,
      p.neighborhood_id,
      g.group_key,
      ga.director_key,
      l.source_listing_id,
      l.url,
      l.observed_at
    from public.market_current_listings l
    join public.market_sources s
      on s.id=l.source_id
     and s.code='portal-inmobiliario-vitacura-portal-houses'
    join public.market_properties p
      on p.id=l.property_id
    join public.property_territory_group_neighborhoods gn
      on gn.neighborhood_id=p.neighborhood_id
     and gn.active
     and gn.valid_to is null
    join public.property_territory_groups g
      on g.id=gn.group_id
     and g.active
    join public.property_territory_group_director_assignments ga
      on ga.group_id=g.id
     and ga.assignment_role='primary'
     and ga.active
     and ga.valid_to is null
    join public.property_director_directory d
      on d.director_key=ga.director_key
     and d.active
    where l.property_id is not null
      and p.neighborhood_id is not null
      and l.status in ('active','observed')
      and lower(btrim(coalesce(l.operation,''))) in ('sale','venta','sell')
    order by l.property_id,l.observed_at desc nulls last,l.created_at desc
  ), eligible as (
    select ll.*
    from latest_listing ll
    where not exists (
      select 1
      from public.property_prospect_leads lead
      where lead.property_id=ll.property_id
    )
  ), counted as (
    select count(*)::integer as n from eligible
  ), inserted as (
    insert into public.property_prospect_leads(
      property_id,neighborhood_id,director_key,source_listing_id,source_url,
      lead_reason,status,priority,detected_at,assigned_at,created_at,updated_at
    )
    select
      e.property_id,
      e.neighborhood_id,
      e.director_key,
      e.source_listing_id,
      e.url,
      'Publicación vigente vinculada a propiedad canónica con barrio confirmado y grupo territorial vigente (' || e.group_key || ').',
      'assigned',
      'normal',
      now(),now(),now(),now()
    from eligible e
    on conflict (property_id) do nothing
    returning id,property_id,neighborhood_id,director_key,source_listing_id,source_url
  ), lead_events as (
    insert into public.property_prospect_events(
      lead_id,property_id,event_type,actor_id,to_status,note,metadata,occurred_at
    )
    select
      i.id,
      i.property_id,
      'lead_created',
      null::uuid,
      'assigned',
      'Lead creado automáticamente desde publicación vigente + identidad canónica + grupo territorial confirmado.',
      jsonb_build_object(
        'sourceListingId',i.source_listing_id,
        'sourceUrl',i.source_url,
        'neighborhoodId',i.neighborhood_id,
        'directorKey',i.director_key,
        'pipeline','property_prospect_group_territory_v2'
      ),
      now()
    from inserted i
    union all
    select
      i.id,
      i.property_id,
      'director_assigned',
      null::uuid,
      'assigned',
      'Responsable heredado del grupo territorial vigente del barrio.',
      jsonb_build_object(
        'neighborhoodId',i.neighborhood_id,
        'directorKey',i.director_key,
        'pipeline','property_prospect_group_territory_v2'
      ),
      now()
    from inserted i
    returning id
  )
  select
    coalesce((select n from counted),0),
    coalesce((select count(*) from inserted),0)
  into v_eligible,v_inserted;

  return jsonb_build_object(
    'eligible',v_eligible,
    'inserted',v_inserted,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.refresh_property_prospect_leads_v1() from public,anon,authenticated;
grant execute on function public.refresh_property_prospect_leads_v1() to service_role;

create or replace function public.assign_property_neighborhood_groups_bulk_v1(
  p_assignments jsonb,
  p_actor_id uuid,
  p_reason text default null,
  p_source text default 'prospect-territory-groups'
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_item jsonb;
  v_neighborhood_id uuid;
  v_group_key text;
  v_group_id uuid;
  v_previous_group_id uuid;
  v_primary_director text;
  v_changed integer := 0;
  v_reassigned integer := 0;
  v_created integer := 0;
  v_step_reassigned integer := 0;
  v_seen uuid[] := '{}';
  v_now timestamptz := clock_timestamp();
  v_refresh jsonb := '{}'::jsonb;
begin
  if p_assignments is null
     or jsonb_typeof(p_assignments)<>'array'
     or jsonb_array_length(p_assignments)=0
     or jsonb_array_length(p_assignments)>100 then
    raise exception 'INVALID_ASSIGNMENT_BATCH';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_assignments)
  loop
    begin
      v_neighborhood_id:=nullif(v_item->>'neighborhoodId','')::uuid;
    exception when others then
      raise exception 'INVALID_NEIGHBORHOOD_ID';
    end;

    v_group_key:=nullif(btrim(v_item->>'groupKey'),'');

    if v_neighborhood_id is null or v_group_key is null then
      raise exception 'INVALID_ASSIGNMENT';
    end if;

    if v_neighborhood_id=any(v_seen) then
      raise exception 'DUPLICATE_NEIGHBORHOOD_ASSIGNMENT';
    end if;
    v_seen:=array_append(v_seen,v_neighborhood_id);

    select g.id into v_group_id
    from public.property_territory_groups g
    where g.group_key=v_group_key
      and g.active;

    if v_group_id is null then
      raise exception 'TERRITORY_GROUP_NOT_FOUND';
    end if;

    if not exists (
      select 1 from public.market_neighborhoods n where n.id=v_neighborhood_id
    ) then
      raise exception 'NEIGHBORHOOD_NOT_FOUND';
    end if;

    select a.director_key into v_primary_director
    from public.property_territory_group_director_assignments a
    join public.property_director_directory d
      on d.director_key=a.director_key
     and d.active
    where a.group_id=v_group_id
      and a.assignment_role='primary'
      and a.active
      and a.valid_to is null
    limit 1;

    if v_primary_director is null then
      raise exception 'TERRITORY_GROUP_PRIMARY_DIRECTOR_MISSING';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_neighborhood_id::text,0));

    select gn.group_id into v_previous_group_id
    from public.property_territory_group_neighborhoods gn
    where gn.neighborhood_id=v_neighborhood_id
      and gn.active
      and gn.valid_to is null
    limit 1
    for update;

    if v_previous_group_id is distinct from v_group_id then
      update public.property_territory_group_neighborhoods
      set active=false,valid_to=current_date,updated_at=v_now
      where neighborhood_id=v_neighborhood_id
        and active
        and valid_to is null;

      insert into public.property_territory_group_neighborhoods(
        group_id,neighborhood_id,source,assigned_by,created_at,updated_at
      ) values (
        v_group_id,
        v_neighborhood_id,
        nullif(btrim(coalesce(p_source,'')),''),
        p_actor_id,
        v_now,
        v_now
      );

      v_changed:=v_changed+1;
    end if;

    with affected as (
      select l.id,l.property_id,l.director_key as previous_director_key
      from public.property_prospect_leads l
      where l.neighborhood_id=v_neighborhood_id
        and l.status in ('new','assigned','contacting','qualified','valuation','proposal')
        and l.director_key is distinct from v_primary_director
      for update
    ), updated as (
      update public.property_prospect_leads l
      set director_key=v_primary_director,
          assigned_at=v_now,
          updated_by=p_actor_id,
          updated_at=v_now
      from affected a
      where l.id=a.id
      returning l.id,l.property_id,a.previous_director_key
    )
    insert into public.property_prospect_events(
      lead_id,property_id,event_type,actor_id,note,metadata,occurred_at
    )
    select
      u.id,u.property_id,'director_reassigned',p_actor_id,
      nullif(btrim(coalesce(p_reason,'')),''),
      jsonb_build_object(
        'fromDirectorKey',u.previous_director_key,
        'toDirectorKey',v_primary_director,
        'neighborhoodId',v_neighborhood_id,
        'territoryGroupKey',v_group_key,
        'pipeline','property_prospect_group_territory_v2'
      ),
      v_now
    from updated u;

    get diagnostics v_step_reassigned = row_count;
    v_reassigned:=v_reassigned+v_step_reassigned;
  end loop;

  v_refresh:=public.refresh_property_prospect_leads_v1();
  v_created:=coalesce((v_refresh->>'inserted')::integer,0);

  return jsonb_build_object(
    'processed',jsonb_array_length(p_assignments),
    'changed',v_changed,
    'createdLeads',v_created,
    'reassignedLeads',v_reassigned,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.assign_property_neighborhood_groups_bulk_v1(jsonb,uuid,text,text) from public,anon,authenticated;
grant execute on function public.assign_property_neighborhood_groups_bulk_v1(jsonb,uuid,text,text) to service_role;
