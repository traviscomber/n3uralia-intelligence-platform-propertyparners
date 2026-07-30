do $$
declare
  apartment_run_id uuid;
  house_run_id uuid;
begin
  select id into apartment_run_id
  from public.market_ingestion_runs
  where metadata ->> 'bridge' = 'legacy_properties_v1'
    and dataset_kind = 'portal_apartments'
  order by created_at
  limit 1;

  if apartment_run_id is null then
    insert into public.market_ingestion_runs (
      source_system, dataset_kind, source_file, source_sha256,
      expected_rows, received_rows, accepted_rows, rejected_rows,
      status, completed_at, metadata
    )
    select
      'manual_import', 'portal_apartments', 'legacy_properties_bridge',
      md5(string_agg(id::text, ',' order by id::text)),
      count(*)::integer, count(*)::integer, count(*)::integer, 0,
      'completed', now(),
      jsonb_build_object('bridge', 'legacy_properties_v1', 'historical_backfill', true)
    from public.properties
    where lower(coalesce(property_type, '')) = 'departamento'
    returning id into apartment_run_id;
  end if;

  insert into public.market_raw_records (
    ingestion_run_id, source_system, dataset_kind, source_record_id,
    source_file, source_row_number, record_hash, payload,
    observed_at, validation_status, validation_errors
  )
  select
    apartment_run_id,
    'manual_import',
    'portal_apartments',
    p.id::text,
    'legacy_properties_bridge',
    row_number() over (order by p.created_at, p.id)::integer,
    md5('legacy-properties-v1:departamento:' || p.id::text),
    to_jsonb(p),
    p.created_at,
    'accepted',
    '{}'::text[]
  from public.properties p
  where lower(coalesce(p.property_type, '')) = 'departamento'
  on conflict (dataset_kind, record_hash) do nothing;

  select id into house_run_id
  from public.market_ingestion_runs
  where metadata ->> 'bridge' = 'legacy_properties_v1'
    and dataset_kind = 'portal_houses'
  order by created_at
  limit 1;

  if house_run_id is null then
    insert into public.market_ingestion_runs (
      source_system, dataset_kind, source_file, source_sha256,
      expected_rows, received_rows, accepted_rows, rejected_rows,
      status, completed_at, metadata
    )
    select
      'manual_import', 'portal_houses', 'legacy_properties_bridge',
      md5(string_agg(id::text, ',' order by id::text)),
      count(*)::integer, count(*)::integer, count(*)::integer, 0,
      'completed', now(),
      jsonb_build_object('bridge', 'legacy_properties_v1', 'historical_backfill', true)
    from public.properties
    where lower(coalesce(property_type, '')) = 'casa'
    returning id into house_run_id;
  end if;

  insert into public.market_raw_records (
    ingestion_run_id, source_system, dataset_kind, source_record_id,
    source_file, source_row_number, record_hash, payload,
    observed_at, validation_status, validation_errors
  )
  select
    house_run_id,
    'manual_import',
    'portal_houses',
    p.id::text,
    'legacy_properties_bridge',
    row_number() over (order by p.created_at, p.id)::integer,
    md5('legacy-properties-v1:casa:' || p.id::text),
    to_jsonb(p),
    p.created_at,
    'accepted',
    '{}'::text[]
  from public.properties p
  where lower(coalesce(p.property_type, '')) = 'casa'
  on conflict (dataset_kind, record_hash) do nothing;
end $$;
