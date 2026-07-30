create table if not exists public.market_listing_observations (
  id bigint generated always as identity primary key,
  ingestion_run_id uuid not null references public.market_ingestion_runs(id) on delete cascade,
  source_id uuid references public.market_sources(id),
  source_listing_id text not null,
  observed_at timestamptz not null,
  status text not null,
  operation text,
  price_clp numeric,
  price_uf numeric,
  price_uf_m2 numeric,
  record_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (ingestion_run_id, source_listing_id, record_hash)
);

create index if not exists market_listing_observations_source_history_idx
  on public.market_listing_observations (source_id, source_listing_id, observed_at desc);

alter table public.market_listing_observations enable row level security;

create policy market_listing_observations_read_authenticated
  on public.market_listing_observations
  for select
  to authenticated
  using (true);

create or replace function public.capture_market_listing_observation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_id uuid;
  v_status text;
  v_operation text;
begin
  if new.validation_status <> 'accepted'
     or new.source_system <> 'portal_inmobiliario'
     or new.dataset_kind not in ('portal_apartments', 'portal_houses', 'portal_projects') then
    return new;
  end if;

  select nullif(metadata->>'source_id', '')::uuid
  into v_source_id
  from public.market_ingestion_runs
  where id = new.ingestion_run_id;

  v_status := case lower(trim(coalesce(new.payload->>'status', 'active')))
    when 'active' then 'active'
    when 'observed' then 'observed'
    when 'inactive' then 'inactive'
    when 'removed' then 'removed'
    when 'sold' then 'sold'
    when 'quarantined' then 'quarantined'
    else 'active'
  end;

  v_operation := case lower(trim(coalesce(new.payload->>'operation', '')))
    when 'venta' then 'Venta'
    when 'arriendo' then 'Arriendo'
    else 'Sin confirmar'
  end;

  insert into public.market_listing_observations (
    ingestion_run_id,
    source_id,
    source_listing_id,
    observed_at,
    status,
    operation,
    price_clp,
    price_uf,
    price_uf_m2,
    record_hash,
    payload
  ) values (
    new.ingestion_run_id,
    v_source_id,
    coalesce(new.source_record_id, new.source_row_number::text),
    coalesce(new.observed_at, new.ingested_at),
    v_status,
    v_operation,
    nullif(new.payload->>'price_clp', '')::numeric,
    nullif(new.payload->>'price_uf', '')::numeric,
    nullif(new.payload->>'price_uf_m2', '')::numeric,
    new.record_hash,
    new.payload
  )
  on conflict (ingestion_run_id, source_listing_id, record_hash) do nothing;

  return new;
end;
$$;

drop trigger if exists capture_market_listing_observation_trigger on public.market_raw_records;
create trigger capture_market_listing_observation_trigger
after insert on public.market_raw_records
for each row execute function public.capture_market_listing_observation();

revoke all on function public.capture_market_listing_observation() from public;
