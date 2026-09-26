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
grant select on table public.property_territory_groups to authenticated;
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
grant select on table public.property_territory_group_neighborhoods to authenticated;
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
grant select on table public.property_territory_group_director_assignments to authenticated;
grant all on table public.property_territory_group_director_assignments to service_role;

create unique index if not exists property_territory_group_one_primary_director_idx
on public.property_territory_group_director_assignments(group_id)
where active and valid_to is null and assignment_role='primary';

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

with current_assignments(group_key,director_key) as (
  values
    ('santa-maria','maria-luz-barbosa'),
    ('lo-beltran','isabel-steverlynck'),
    ('nueva-costanera','claudia-stark')
),
resolved as (
  select g.id as group_id,c.director_key
  from current_assignments c
  join public.property_territory_groups g on g.group_key=c.group_key
  join public.property_director_directory d
    on d.director_key=c.director_key
   and d.active
)
insert into public.property_territory_group_director_assignments(
  group_id,director_key,assignment_role,source,assignment_reason
)
select
  r.group_id,
  r.director_key,
  'primary',
  'pedro-pablo-territory-report',
  'Responsable vigente del grupo territorial; la membresía de barrios permanece independiente de la persona.'
from resolved r
where not exists (
  select 1
  from public.property_territory_group_director_assignments a
  where a.group_id=r.group_id
    and a.director_key=r.director_key
    and a.assignment_role='primary'
    and a.active
    and a.valid_to is null
);

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
grant execute on function public.get_current_property_territory_assignment_v1(uuid) to authenticated,service_role;

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

  insert into public.property_territory_group_director_assignments(
    group_id,director_key,assignment_role,source,assignment_reason,assigned_by,created_at,updated_at
  ) values (
    v_group_id,p_director_key,'primary',
    nullif(btrim(coalesce(p_source,'')),''),
    nullif(btrim(coalesce(p_reason,'')),''),
    p_actor_id,v_now,v_now
  )
  returning id into v_assignment_id;

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
