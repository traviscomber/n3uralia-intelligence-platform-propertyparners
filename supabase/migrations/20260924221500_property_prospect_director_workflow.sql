create extension if not exists pgcrypto;

create table if not exists public.property_director_directory (
  director_key text primary key,
  full_name text not null,
  role text not null check (role in ('director','subdirector')),
  office_name text not null check (office_name in ('Santa María','Nueva Costanera','Lo Beltrán')),
  profile_id uuid null references public.profiles(id) on delete set null,
  source text not null,
  source_effective_date date null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.property_director_directory
  (director_key, full_name, role, office_name, profile_id, source, source_effective_date, active)
values
  ('maria-luz-barbosa','María Luz Barbosa','director','Santa María',null,'canonical-user-role-directory','2026-08-13',true),
  ('claudia-stark','Claudia Stark','subdirector','Nueva Costanera',null,'canonical-user-role-directory','2026-08-13',true),
  ('daniela-nasi','Daniela Nasi','subdirector','Lo Beltrán',null,'canonical-user-role-directory','2026-08-13',true),
  ('isabel-steverlynck','Isabel Steverlynck','director','Lo Beltrán',
    (select id from public.profiles where lower(full_name)=lower('Isabel Steverlynck') limit 1),
    'canonical-auth-directory','2026-09-24',true)
on conflict (director_key) do update
set full_name=excluded.full_name,
    role=excluded.role,
    office_name=excluded.office_name,
    profile_id=coalesce(excluded.profile_id, public.property_director_directory.profile_id),
    source=excluded.source,
    source_effective_date=excluded.source_effective_date,
    active=excluded.active,
    updated_at=now();

create table if not exists public.market_neighborhood_director_assignments (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.market_neighborhoods(id) on delete cascade,
  director_key text not null references public.property_director_directory(director_key),
  valid_from date not null default current_date,
  valid_to date null,
  active boolean not null default true,
  assignment_reason text null,
  source text not null default 'property-partners-territory-assignment',
  assigned_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);

create unique index if not exists market_neighborhood_director_assignments_one_active_idx
  on public.market_neighborhood_director_assignments(neighborhood_id)
  where active and valid_to is null;

create index if not exists market_neighborhood_director_assignments_director_idx
  on public.market_neighborhood_director_assignments(director_key, active);

create table if not exists public.property_prospect_leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.market_properties(id) on delete restrict,
  neighborhood_id uuid not null references public.market_neighborhoods(id) on delete restrict,
  director_key text not null references public.property_director_directory(director_key),
  source_listing_id text null,
  source_url text null,
  lead_reason text null,
  status text not null default 'assigned'
    check (status in ('new','assigned','contacting','qualified','valuation','proposal','won','lost','archived')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  detected_at timestamptz not null default now(),
  assigned_at timestamptz not null default now(),
  first_contact_at timestamptz null,
  last_follow_up_at timestamptz null,
  next_follow_up_at timestamptz null,
  won_at timestamptz null,
  lost_at timestamptz null,
  lost_reason text null,
  latest_note text null,
  created_by uuid null references public.profiles(id) on delete set null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_prospect_leads_director_status_idx
  on public.property_prospect_leads(director_key,status,updated_at desc);

create index if not exists property_prospect_leads_neighborhood_idx
  on public.property_prospect_leads(neighborhood_id,status);

create index if not exists property_prospect_leads_follow_up_idx
  on public.property_prospect_leads(next_follow_up_at)
  where status not in ('won','lost','archived');

create table if not exists public.property_prospect_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.property_prospect_leads(id) on delete cascade,
  property_id uuid not null references public.market_properties(id) on delete restrict,
  event_type text not null check (event_type in (
    'lead_created','director_assigned','director_reassigned','status_changed',
    'follow_up','contacted','valuation_started','valuation_linked',
    'proposal','won','lost','note'
  )),
  actor_id uuid null references public.profiles(id) on delete set null,
  from_status text null,
  to_status text null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists property_prospect_events_lead_time_idx
  on public.property_prospect_events(lead_id,occurred_at desc);

create index if not exists property_prospect_events_property_time_idx
  on public.property_prospect_events(property_id,occurred_at desc);

create or replace function public.prevent_property_prospect_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'property_prospect_events is append-only';
end;
$$;

drop trigger if exists property_prospect_events_immutable on public.property_prospect_events;
create trigger property_prospect_events_immutable
before update or delete on public.property_prospect_events
for each row execute function public.prevent_property_prospect_event_mutation();

alter table public.property_director_directory enable row level security;
alter table public.market_neighborhood_director_assignments enable row level security;
alter table public.property_prospect_leads enable row level security;
alter table public.property_prospect_events enable row level security;

revoke all on public.property_director_directory from anon, authenticated;
revoke all on public.market_neighborhood_director_assignments from anon, authenticated;
revoke all on public.property_prospect_leads from anon, authenticated;
revoke all on public.property_prospect_events from anon, authenticated;
revoke all on sequence public.property_prospect_events_id_seq from anon, authenticated;
