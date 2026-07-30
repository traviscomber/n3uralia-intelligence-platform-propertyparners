alter table public.market_raw_records
  drop constraint if exists market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  add constraint market_raw_records_run_dataset_hash_key
  unique (ingestion_run_id, dataset_kind, record_hash);

alter table public.market_listings
  add column if not exists is_current boolean not null default true;

create unique index if not exists market_listings_one_current_per_source
  on public.market_listings (source_id, source_listing_id)
  where is_current;

create index if not exists market_listings_current_status_idx
  on public.market_listings (status, observed_at desc)
  where is_current;

create or replace function public.ingest_portal_listings(
  p_source_label text,
  p_source_file text,
  p_observed_at timestamptz,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_source_id uuid;
  v_received integer := coalesce(jsonb_array_length(p_rows), 0);
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_row jsonb;
  v_index integer := 0;
  v_errors text[];
  v_source_code text;
  v_source_listing_id text;
  v_property_type text;
  v_operation text;
  v_status text;
  v_observed_at timestamptz;
  v_normalized_address text;
  v_canonical_key text;
  v_record_hash text;
  v_property_id uuid;
  v_existing_current public.market_listings%rowtype;
  v_new_signature text;
  v_old_signature text;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  v_source_code := left(
    trim(both '-' from regexp_replace(lower(coalesce(nullif(p_source_label, ''), 'portal-import')), '[^a-z0-9]+', '-', 'g')),
    120
  );

  insert into public.market_sources (
    code, name, source_type, file_name, period_start, period_end, row_count, status, metadata
  ) values (
    v_source_code,
    coalesce(nullif(p_source_label, ''), 'Portal import'),
    'portal',
    p_source_file,
    p_observed_at::date,
    p_observed_at::date,
    v_received,
    'active',
    jsonb_build_object('pipeline', 'unit_portal_listing_v1')
  )
  on conflict (code) do update set
    name = excluded.name,
    source_type = excluded.source_type,
    file_name = excluded.file_name,
    period_start = least(coalesce(public.market_sources.period_start, excluded.period_start), excluded.period_start),
    period_end = greatest(coalesce(public.market_sources.period_end, excluded.period_end), excluded.period_end),
    row_count = excluded.row_count,
    imported_at = now(),
    metadata = public.market_sources.metadata || excluded.metadata
  returning id into v_source_id;

  insert into public.market_ingestion_runs (
    source_system, dataset_kind, source_file, expected_rows, received_rows, status, metadata
  ) values (
    'portal_inmobiliario',
    'portal_apartments',
    p_source_file,
    v_received,
    v_received,
    'running',
    jsonb_build_object(
      'pipeline', 'unit_portal_listing_v1',
      'source_id', v_source_id,
      'observed_at', p_observed_at
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_errors := '{}'::text[];
    v_source_listing_id := nullif(trim(v_row->>'source_listing_id'), '');
    v_property_type := initcap(lower(coalesce(nullif(trim(v_row->>'property_type'), ''), 'Otro')));
    v_operation := case lower(trim(coalesce(v_row->>'operation', '')))
      when 'venta' then 'Venta'
      when 'arriendo' then 'Arriendo'
      else 'Sin confirmar'
    end;
    v_status := case lower(trim(coalesce(v_row->>'status', 'active')))
      when 'active' then 'active'
      when 'observed' then 'observed'
      when 'inactive' then 'inactive'
      when 'removed' then 'removed'
      when 'sold' then 'sold'
      when 'quarantined' then 'quarantined'
      else 'active'
    end;
    v_observed_at := coalesce(nullif(v_row->>'observed_at', '')::timestamptz, p_observed_at);
    v_normalized_address := nullif(lower(regexp_replace(trim(coalesce(v_row->>'normalized_address', v_row->>'raw_address', '')), '\s+', ' ', 'g')), '');

    if v_source_listing_id is null then
      v_errors := array_append(v_errors, 'missing_source_listing_id');
    end if;
    if v_property_type not in ('Casa', 'Departamento', 'Proyecto', 'Otro') then
      v_errors := array_append(v_errors, 'invalid_property_type');
    end if;
    if nullif(v_row->>'latitude', '') is not null and (v_row->>'latitude')::numeric not between -90 and 90 then
      v_errors := array_append(v_errors, 'invalid_latitude');
    end if;
    if nullif(v_row->>'longitude', '') is not null and (v_row->>'longitude')::numeric not between -180 and 180 then
      v_errors := array_append(v_errors, 'invalid_longitude');
    end if;
    if nullif(v_row->>'price_uf', '') is not null and (v_row->>'price_uf')::numeric < 0 then
      v_errors := array_append(v_errors, 'invalid_price_uf');
    end if;
    if v_normalized_address is null and nullif(v_row->>'latitude', '') is null then
      v_errors := array_append(v_errors, 'missing_location_evidence');
    end if;

    v_record_hash := md5(
      coalesce(v_source_listing_id, v_index::text) || ':' ||
      coalesce(v_observed_at::text, '') || ':' ||
      v_row::text
    );

    insert into public.market_raw_records (
      ingestion_run_id, source_system, dataset_kind, source_record_id, source_file,
      source_row_number, record_hash, payload, observed_at, validation_status, validation_errors
    ) values (
      v_run_id, 'portal_inmobiliario', 'portal_apartments', v_source_listing_id, p_source_file,
      v_index, v_record_hash, v_row, v_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end,
      v_errors
    )
    on conflict (ingestion_run_id, dataset_kind, record_hash) do nothing;

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    v_canonical_key := 'portal:' || v_source_code || ':' || v_source_listing_id;

    insert into public.market_properties (
      canonical_key, property_type, normalized_address, street_name, street_number, unit_number,
      rol, latitude, longitude, land_area_m2, built_area_m2, useful_area_m2,
      bedrooms, bathrooms, parking_spaces, construction_year,
      identity_status, identity_confidence, identity_evidence, first_seen_at, last_seen_at
    ) values (
      v_canonical_key,
      v_property_type,
      v_normalized_address,
      nullif(trim(v_row->>'street_name'), ''),
      nullif(trim(v_row->>'street_number'), ''),
      nullif(trim(v_row->>'unit_number'), ''),
      nullif(trim(v_row->>'rol'), ''),
      nullif(v_row->>'latitude', '')::numeric,
      nullif(v_row->>'longitude', '')::numeric,
      nullif(v_row->>'land_area_m2', '')::numeric,
      nullif(v_row->>'built_area_m2', '')::numeric,
      nullif(v_row->>'useful_area_m2', '')::numeric,
      nullif(v_row->>'bedrooms', '')::integer,
      nullif(v_row->>'bathrooms', '')::integer,
      nullif(v_row->>'parking_spaces', '')::integer,
      nullif(v_row->>'construction_year', '')::integer,
      'candidate',
      0.5,
      jsonb_build_array(jsonb_build_object('source', v_source_code, 'source_listing_id', v_source_listing_id)),
      v_observed_at,
      v_observed_at
    )
    on conflict (canonical_key) do update set
      property_type = coalesce(excluded.property_type, public.market_properties.property_type),
      normalized_address = coalesce(excluded.normalized_address, public.market_properties.normalized_address),
      street_name = coalesce(excluded.street_name, public.market_properties.street_name),
      street_number = coalesce(excluded.street_number, public.market_properties.street_number),
      unit_number = coalesce(excluded.unit_number, public.market_properties.unit_number),
      rol = coalesce(excluded.rol, public.market_properties.rol),
      latitude = coalesce(excluded.latitude, public.market_properties.latitude),
      longitude = coalesce(excluded.longitude, public.market_properties.longitude),
      land_area_m2 = coalesce(excluded.land_area_m2, public.market_properties.land_area_m2),
      built_area_m2 = coalesce(excluded.built_area_m2, public.market_properties.built_area_m2),
      useful_area_m2 = coalesce(excluded.useful_area_m2, public.market_properties.useful_area_m2),
      bedrooms = coalesce(excluded.bedrooms, public.market_properties.bedrooms),
      bathrooms = coalesce(excluded.bathrooms, public.market_properties.bathrooms),
      parking_spaces = coalesce(excluded.parking_spaces, public.market_properties.parking_spaces),
      construction_year = coalesce(excluded.construction_year, public.market_properties.construction_year),
      last_seen_at = greatest(coalesce(public.market_properties.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
      updated_at = now()
    returning id into v_property_id;

    select * into v_existing_current
    from public.market_listings
    where source_id = v_source_id
      and source_listing_id = v_source_listing_id
      and is_current
    limit 1;

    v_new_signature := md5(concat_ws('|',
      v_status,
      v_operation,
      coalesce(v_row->>'url', ''),
      coalesce(v_row->>'title', ''),
      coalesce(v_row->>'raw_address', ''),
      coalesce(v_normalized_address, ''),
      coalesce(v_row->>'latitude', ''),
      coalesce(v_row->>'longitude', ''),
      coalesce(v_row->>'price_clp', ''),
      coalesce(v_row->>'price_uf', ''),
      coalesce(v_row->>'price_uf_m2', '')
    ));

    if v_existing_current.id is not null then
      v_old_signature := md5(concat_ws('|',
        v_existing_current.status,
        v_existing_current.operation,
        coalesce(v_existing_current.url, ''),
        coalesce(v_existing_current.title, ''),
        coalesce(v_existing_current.raw_address, ''),
        coalesce(v_existing_current.normalized_address, ''),
        coalesce(v_existing_current.latitude::text, ''),
        coalesce(v_existing_current.longitude::text, ''),
        coalesce(v_existing_current.price_clp::text, ''),
        coalesce(v_existing_current.price_uf::text, ''),
        coalesce(v_existing_current.price_uf_m2::text, '')
      ));

      if v_old_signature = v_new_signature then
        update public.market_listings
        set observed_at = greatest(observed_at, v_observed_at),
            raw_payload = v_row
        where id = v_existing_current.id;
        v_unchanged := v_unchanged + 1;
        v_accepted := v_accepted + 1;
        continue;
      end if;

      update public.market_listings
      set is_current = false
      where id = v_existing_current.id;
      v_updated := v_updated + 1;
    else
      v_inserted := v_inserted + 1;
    end if;

    insert into public.market_listings (
      source_id, source_listing_id, property_id, operation, status, url, title,
      raw_address, normalized_address, latitude, longitude,
      price_clp, price_uf, price_uf_m2, published_at, observed_at, removed_at,
      raw_payload, is_current
    ) values (
      v_source_id,
      v_source_listing_id,
      v_property_id,
      v_operation,
      v_status,
      nullif(trim(v_row->>'url'), ''),
      nullif(trim(v_row->>'title'), ''),
      nullif(trim(v_row->>'raw_address'), ''),
      v_normalized_address,
      nullif(v_row->>'latitude', '')::numeric,
      nullif(v_row->>'longitude', '')::numeric,
      nullif(v_row->>'price_clp', '')::numeric,
      nullif(v_row->>'price_uf', '')::numeric,
      nullif(v_row->>'price_uf_m2', '')::numeric,
      nullif(v_row->>'published_at', '')::timestamptz,
      v_observed_at,
      case when v_status = 'removed' then v_observed_at else null end,
      v_row,
      true
    );

    v_accepted := v_accepted + 1;
  end loop;

  update public.market_ingestion_runs
  set accepted_rows = v_accepted,
      rejected_rows = v_rejected,
      status = case when v_accepted > 0 then 'completed' else 'rejected' end,
      completed_at = now(),
      metadata = metadata || jsonb_build_object(
        'inserted', v_inserted,
        'updated', v_updated,
        'unchanged', v_unchanged
      )
  where id = v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id,
    'source_id', v_source_id,
    'received', v_received,
    'accepted', v_accepted,
    'rejected', v_rejected,
    'inserted', v_inserted,
    'updated', v_updated,
    'unchanged', v_unchanged
  );
exception when others then
  if v_run_id is not null then
    update public.market_ingestion_runs
    set status = 'failed', completed_at = now(), error_message = sqlerrm
    where id = v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_portal_listings(text, text, timestamptz, jsonb) from public;
grant execute on function public.ingest_portal_listings(text, text, timestamptz, jsonb) to service_role;
