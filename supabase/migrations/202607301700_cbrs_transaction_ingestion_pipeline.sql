create or replace function public.ingest_cbrs_transaction_snapshot(
  p_source_label text,
  p_source_file text,
  p_observed_at timestamptz,
  p_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_source_id uuid;
  v_source_code text;
  v_received integer;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_inserted integer := 0;
  v_existing integer := 0;
  v_index integer := 0;
  v_row jsonb;
  v_errors text[];
  v_event_key text;
  v_record_hash text;
  v_rol text;
  v_address text;
  v_normalized_address text;
  v_property_type text;
  v_property_key text;
  v_property_id uuid;
  v_transaction_date date;
  v_price_clp numeric;
  v_price_uf numeric;
  v_price_uf_m2 numeric;
  v_tomo text;
  v_foja text;
  v_numero text;
  v_description text;
  v_latitude numeric;
  v_longitude numeric;
  v_land_area numeric;
  v_built_area numeric;
  v_useful_area numeric;
  v_bedrooms integer;
  v_bathrooms integer;
  v_parking integer;
  v_insert_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;
  if p_observed_at is null then
    raise exception 'p_observed_at is required';
  end if;
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  v_received := jsonb_array_length(p_rows);
  v_source_code := left(trim(both '-' from regexp_replace(
    lower(coalesce(nullif(trim(p_source_label), ''), 'cbrs-import')),
    '[^a-z0-9]+', '-', 'g'
  )), 120);

  insert into public.market_sources (
    code, name, source_type, file_name, period_start, period_end, row_count, status, metadata
  ) values (
    v_source_code,
    coalesce(nullif(trim(p_source_label), ''), 'Conservador de Bienes Raíces'),
    'cbrs', p_source_file, p_observed_at::date, p_observed_at::date,
    v_received, 'active', jsonb_build_object('pipeline', 'cbrs_transaction_v1')
  ) on conflict (code) do update set
    name = excluded.name,
    file_name = excluded.file_name,
    period_start = least(coalesce(public.market_sources.period_start, excluded.period_start), excluded.period_start),
    period_end = greatest(coalesce(public.market_sources.period_end, excluded.period_end), excluded.period_end),
    row_count = excluded.row_count,
    imported_at = now(),
    status = 'active',
    metadata = public.market_sources.metadata || excluded.metadata
  returning id into v_source_id;

  insert into public.market_ingestion_runs (
    source_system, dataset_kind, source_file, expected_rows, received_rows, status, metadata
  ) values (
    'cbrs', 'registered_sales', p_source_file, v_received, v_received, 'running',
    jsonb_build_object('pipeline', 'cbrs_transaction_v1', 'source_id', v_source_id, 'observed_at', p_observed_at)
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;
    v_errors := '{}';
    v_rol := nullif(trim(coalesce(v_row->>'rol', v_row->>'property_rol')), '');
    v_address := nullif(trim(coalesce(v_row->>'address', v_row->>'direccion')), '');
    v_normalized_address := nullif(trim(coalesce(v_row->>'normalized_address', v_address)), '');
    v_tomo := nullif(trim(v_row->>'tomo'), '');
    v_foja := nullif(trim(v_row->>'foja'), '');
    v_numero := nullif(trim(coalesce(v_row->>'numero', v_row->>'inscription_number')), '');
    v_description := nullif(trim(coalesce(v_row->>'description', v_row->>'descripcion')), '');

    begin
      v_transaction_date := nullif(coalesce(v_row->>'transaction_date', v_row->>'fecha_compraventa', v_row->>'fecha'), '')::date;
      v_price_clp := nullif(v_row->>'price_clp', '')::numeric;
      v_price_uf := nullif(v_row->>'price_uf', '')::numeric;
      v_price_uf_m2 := nullif(v_row->>'price_uf_m2', '')::numeric;
      v_latitude := nullif(v_row->>'latitude', '')::numeric;
      v_longitude := nullif(v_row->>'longitude', '')::numeric;
      v_land_area := nullif(v_row->>'land_area_m2', '')::numeric;
      v_built_area := nullif(v_row->>'built_area_m2', '')::numeric;
      v_useful_area := nullif(v_row->>'useful_area_m2', '')::numeric;
      v_bedrooms := nullif(v_row->>'bedrooms', '')::integer;
      v_bathrooms := nullif(v_row->>'bathrooms', '')::integer;
      v_parking := nullif(v_row->>'parking_spaces', '')::integer;
    exception when others then
      v_errors := array_append(v_errors, 'invalid_typed_value');
      v_transaction_date := null;
      v_price_clp := null;
      v_price_uf := null;
      v_price_uf_m2 := null;
      v_latitude := null;
      v_longitude := null;
      v_land_area := null;
      v_built_area := null;
      v_useful_area := null;
      v_bedrooms := null;
      v_bathrooms := null;
      v_parking := null;
    end;

    if v_transaction_date is null then v_errors := array_append(v_errors, 'missing_transaction_date'); end if;
    if v_rol is null and v_address is null then v_errors := array_append(v_errors, 'missing_property_identity'); end if;
    if v_price_clp is null and v_price_uf is null then v_errors := array_append(v_errors, 'missing_price'); end if;
    if coalesce(v_price_clp, 0) < 0 or coalesce(v_price_uf, 0) < 0 or coalesce(v_price_uf_m2, 0) < 0 then
      v_errors := array_append(v_errors, 'invalid_price');
    end if;
    if v_latitude is not null and v_latitude not between -90 and 90 then v_errors := array_append(v_errors, 'invalid_latitude'); end if;
    if v_longitude is not null and v_longitude not between -180 and 180 then v_errors := array_append(v_errors, 'invalid_longitude'); end if;

    v_event_key := coalesce(
      nullif(trim(v_row->>'event_key'), ''),
      'cbrs:' || md5(concat_ws('|', v_source_code, coalesce(v_rol, ''), coalesce(v_address, ''),
        coalesce(v_transaction_date::text, ''), coalesce(v_tomo, ''), coalesce(v_foja, ''),
        coalesce(v_numero, ''), coalesce(v_price_clp::text, ''), coalesce(v_price_uf::text, '')))
    );
    v_record_hash := md5(v_event_key || ':' || v_row::text);

    insert into public.market_raw_records (
      ingestion_run_id, source_system, dataset_kind, source_record_id, source_file,
      source_row_number, record_hash, payload, observed_at, validation_status, validation_errors
    ) values (
      v_run_id, 'cbrs', 'registered_sales', v_event_key, p_source_file,
      v_index, v_record_hash, v_row, p_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end, v_errors
    );

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    v_property_type := case lower(trim(coalesce(v_row->>'property_type', v_row->>'tipo_propiedad', '')))
      when 'departamento' then 'Departamento'
      when 'apartment' then 'Departamento'
      when 'casa' then 'Casa'
      when 'house' then 'Casa'
      when 'proyecto' then 'Proyecto'
      when 'project' then 'Proyecto'
      else 'Otro'
    end;
    v_property_key := case
      when v_rol is not null then 'cbrs:rol:' || regexp_replace(lower(v_rol), '[^a-z0-9]+', '', 'g')
      else 'cbrs:address:' || md5(lower(coalesce(v_normalized_address, v_address)))
    end;

    insert into public.market_properties (
      canonical_key, property_type, normalized_address, rol, latitude, longitude,
      land_area_m2, built_area_m2, useful_area_m2, bedrooms, bathrooms, parking_spaces,
      identity_status, identity_confidence, identity_evidence, first_seen_at, last_seen_at
    ) values (
      v_property_key, v_property_type, v_normalized_address, v_rol, v_latitude, v_longitude,
      v_land_area, v_built_area, v_useful_area, v_bedrooms, v_bathrooms, v_parking,
      case when v_rol is not null then 'confirmed' else 'candidate' end,
      case when v_rol is not null then 1 else 0.6 end,
      jsonb_build_array(jsonb_build_object('source_id', v_source_id, 'event_key', v_event_key)),
      v_transaction_date::timestamptz, p_observed_at
    ) on conflict (canonical_key) do update set
      property_type = coalesce(nullif(excluded.property_type, 'Otro'), public.market_properties.property_type),
      normalized_address = coalesce(excluded.normalized_address, public.market_properties.normalized_address),
      rol = coalesce(excluded.rol, public.market_properties.rol),
      latitude = coalesce(excluded.latitude, public.market_properties.latitude),
      longitude = coalesce(excluded.longitude, public.market_properties.longitude),
      land_area_m2 = coalesce(excluded.land_area_m2, public.market_properties.land_area_m2),
      built_area_m2 = coalesce(excluded.built_area_m2, public.market_properties.built_area_m2),
      useful_area_m2 = coalesce(excluded.useful_area_m2, public.market_properties.useful_area_m2),
      bedrooms = coalesce(excluded.bedrooms, public.market_properties.bedrooms),
      bathrooms = coalesce(excluded.bathrooms, public.market_properties.bathrooms),
      parking_spaces = coalesce(excluded.parking_spaces, public.market_properties.parking_spaces),
      identity_status = case when excluded.rol is not null then 'confirmed' else public.market_properties.identity_status end,
      identity_confidence = greatest(coalesce(public.market_properties.identity_confidence, 0), coalesce(excluded.identity_confidence, 0)),
      last_seen_at = greatest(coalesce(public.market_properties.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
      updated_at = now()
    returning id into v_property_id;

    insert into public.market_transactions (
      source_id, event_key, asset_key, property_id, rol, transaction_date,
      price_clp, price_uf, price_uf_m2, description, tomo, foja, numero, raw_payload
    ) values (
      v_source_id, v_event_key, v_property_key, v_property_id, v_rol, v_transaction_date,
      v_price_clp, v_price_uf, v_price_uf_m2, v_description, v_tomo, v_foja, v_numero, v_row
    ) on conflict (event_key) do nothing;

    get diagnostics v_insert_count = row_count;
    if v_insert_count = 1 then v_inserted := v_inserted + 1; else v_existing := v_existing + 1; end if;
    v_accepted := v_accepted + 1;
  end loop;

  update public.market_ingestion_runs set
    accepted_rows = v_accepted,
    rejected_rows = v_rejected,
    status = case when v_accepted > 0 or v_received = 0 then 'completed' else 'rejected' end,
    completed_at = now(),
    metadata = metadata || jsonb_build_object('inserted_transactions', v_inserted, 'existing_transactions', v_existing)
  where id = v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id, 'source_id', v_source_id, 'received', v_received,
    'accepted', v_accepted, 'rejected', v_rejected,
    'inserted', v_inserted, 'existing', v_existing
  );
exception when others then
  if v_run_id is not null then
    update public.market_ingestion_runs set status = 'failed', completed_at = now(), error_message = sqlerrm where id = v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_cbrs_transaction_snapshot(text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_cbrs_transaction_snapshot(text, text, timestamptz, jsonb) to service_role;
