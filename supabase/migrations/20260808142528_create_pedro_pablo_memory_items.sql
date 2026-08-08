create table if not exists public.pedro_pablo_memory_items (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('profile','office','global')),
  subject_profile_id uuid null references public.profiles(id) on delete cascade,
  office text null,
  memory_kind text not null check (memory_kind in ('preference','context','decision','outcome','fact_reference')),
  content text not null check (char_length(trim(content)) between 1 and 2000),
  source_kind text not null check (source_kind in ('user_confirmed','system_event','canonical_reference')),
  source_reference text null,
  status text not null default 'active' check (status in ('active','superseded','expired')),
  confidence text not null default 'confirmed' check (confidence in ('confirmed','bounded')),
  expires_at timestamptz null,
  supersedes_id uuid null references public.pedro_pablo_memory_items(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedro_pablo_memory_scope_shape check (
    (scope_type = 'profile' and subject_profile_id is not null)
    or (scope_type = 'office' and office is not null)
    or (scope_type = 'global' and subject_profile_id is null and office is null)
  )
);

alter table public.pedro_pablo_memory_items enable row level security;

revoke all on public.pedro_pablo_memory_items from anon, authenticated;
grant select, insert, update on public.pedro_pablo_memory_items to service_role;

create index if not exists pedro_pablo_memory_items_profile_idx
  on public.pedro_pablo_memory_items (subject_profile_id, status, created_at desc)
  where scope_type = 'profile';

create index if not exists pedro_pablo_memory_items_office_idx
  on public.pedro_pablo_memory_items (office, status, created_at desc)
  where scope_type = 'office';

create index if not exists pedro_pablo_memory_items_global_idx
  on public.pedro_pablo_memory_items (status, created_at desc)
  where scope_type = 'global';

comment on table public.pedro_pablo_memory_items is 'Server-only, provenance-bound memory for Pedro Pablo. Never canonical business truth.';
