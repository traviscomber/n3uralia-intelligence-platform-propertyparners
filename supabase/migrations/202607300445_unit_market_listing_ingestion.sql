drop index if exists public.market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  drop constraint if exists market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  add constraint market_raw_records_run_dataset_hash_key
  unique (ingestion_run_id, dataset_kind, record_hash);

create or replace function public.ingest_market_listings_unit(
  p_source_label text,
  p_source_file text,
  p_dataset_kind text,
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
  v_source_code text;
  v_received integer := coalesce(jsonb_array_length(p_rows), 0);
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_new integer := 0;
  v_changed integer := 0;
  v_unchanged integer := 0;
  v_row jsonb;
  v_index integer := 0;
  v_errors text[];
  v_hash text;
  v_source_listing_id text;
  v_property_type text;
  v_normalized_address text;
  v_raw_address text;
  v_operation text;
  v_status text;
  v_neighborhood_id uuid;
  v_canonical_key text;
  v_property_id uuid;
  v_previous market_listings%rowtype;
  v_existing_count integer;
begin
  if p_dataset_kind not in ('portal_apartments', 'portal_houses', 'portal_projects') then
    raise exception 'Unsupported unit listing dataset_kind: %', p_dataset_kind;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  v_source_code := left(
    regexp_replace(lower(coalesce(nullif(trim(p_source_label), ''), 'portal-unit-import')), '[^a-z0-9]+', '-', 'g'),
    120
  );

  insert into public.market_sources (
    code, name, source_type, file_name, period_start, period_end, row_count, status, metadata
  ) values (
    v_source_code,
    coalesce(nullif(trim(p_source_label), ''), 'Portal unit import'),
    'portal',
    p_source_file,
    p_observed_at::date,
    p_observed_at::date,
    v_received,
    'active',
    jsonb_build_object('pipeline', 'unit_market_listing_v1', 'dataset_kind', p_dataset_kind)
  )
  on conflict (code) do update set
    name = excluded.name,
    source_type = excluded.source_type,
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
    'portal_inmobiliario',
    p_dataset_kind,
    p_source_file,
    v_received,
    v_received,
    'running',
    jsonb_build_object(
      'pipeline', 'unit_market_listing_v1',
      'source_id', v_source_id,
      'observed_at', p_observed_at
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_errors := '{}'::text[];
    v_source_listing_id := nullif(trim(v_row->>'source_listing_id'), '');
    v_raw_address := nullif(trim(v_row->>'raw_address'), '');
    v_normalized_address := nullif(trim(v_row->>'normalized_address'), '');
    v_property_type := coalesce(nullif(trim(v_row->>'property_type'), ''),
      case p_dataset_kind
        when 'portal_apartments' then 'Departamento'
        when 'portal_houses' then 'Casa'
        when 'portal_projects' then 'Proyecto'
      end
    );
    v_operation := coalesce(nullif(trim(v_row->>'operation'), ''), 'Sin confirmar');
    v_status := coalesce(nullif(trim(v_row->>'status'), ''), 'active');

    if v_source_listing_id is null then
      v_errors := array_append(v_errors, 'missing_source_listing_id');
    end if;
    if v_property_type not in ('Casa', 'Departamento', 'Proyecto', 'Otro') then
      v_errors := array_append(v_errors, 'invalid_property_type');
    end if;
    if v_operation not in ('Venta', 'Arriendo', 'Sin confirmar') then
      v_errors := array_append(v_errors, 'invalid_operation');
    end if;
    if v_status not in ('observed', 'active', 'inactive', 'sold', 'removed', 'quarantined') then
      v_errors := array_append(v_errors, 'invalid_status');
    end if;
    if v_normalized_address is null and v_raw_address is null
       and (v_row->>'latitude') is null and (v_row->>'longitude') is null then
      v_errors := array_append(v_errors, 'missing_identity_evidence');
    end if;

    v_hash := md5(
      coalesce(v_source_listing_id, v_index::text) || ':' ||
      coalesce(p_observed_at::text, '') || ':' ||
      v_row::text
    );

    insert into public.market_raw_records (
      ingestion_run_id, source_system, dataset_kind, source_record_id, source_file,
      source_row_number, record_hash, payload, observed_at, validation_status, validation_errors
    ) values (
      v_run_id, 'portal_inmobiliario', p_dataset_kind, v_source_listing_id, p_source_file,
      v_index, v_hash, v_row, p_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end,
      v_errors
    )
    on conflict (ingestion_run_id, dataset_kind, record_hash) do nothing;

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    select id into v_neighborhood_id
    from public.market_neighborhoods
    where lower(trim(name)) = lower(trim(v_row->>'neighborhood'))
    order by created_at
    limit 1;

    v_canonical_key := md5(
      lower(coalesce(v_normalized_address, v_raw_address, '')) || '|' ||
      coalesce(v_row->>'latitude', '') || '|' ||
      coalesce(v_row->>'longitude', '') || '|' ||
      coalesce(v_property_type, '')
    );

    insert into public.market_properties (
      canonical_key, property_type, normalized_address, street_name, street_number, unit_number,
      rol, latitude, longitude, neighborhood_id, land_area_m2, built_area_m2, useful_area_m2,
      bedrooms, bathrooms, parking_spaces, construction_year, identity_status,
      identity_confidence, identity_evidence, first_seen_at, last_seen_at
    ) values (
      v_canonical_key,
      v_property_type,
      coalesce(v_normalized_address, v_raw_address),
      nullif(trim(v_row->>'street_name'), ''),
      nullif(trim(v_row->>'street_number'), ''),
      nullif(trim(v_row->>'unit_number'), ''),
      nullif(trim(v_row->>'rol'), ''),
      nullif(v_row->>'latitude', '')::numeric,
      nullif(v_row->>'longitude', '')::numeric,
      v_neighborhood_id,
      nullif(v_row->>'land_area_m2', '')::numeric,
      nullif(v_row->>'built_area_m2', '')::numeric,
      nullif(v_row->>'useful_area_m2', '')::numeric,
      nullif(v_row->>'bedrooms', '')::integer,
      nullif(v_row->>'bathrooms', '')::integer,
      nullif(v_row->>'parking_spaces', '')::integer,
      nullif(v_row->>'construction_year', '')::integer,
      'candidate',
      case when nullif(trim(v_row->>'rol'), '') is not null then 0.7 else 0.4 end,
      jsonb_build_array(jsonb_build_object(
        'source', 'portal_inmobiliario',
        'source_listing_id', v_source_listing_id,
        'observed_at', p_observed_at
      )),
      p_observed_at,
      p_observed_at
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
      neighborhood_id = coalesce(excluded.neighborhood_id, public.market_properties.neighborhood_id),
      land_area_m2 = coalesce(excluded.land_area_m2, public.market_properties.land_area_m2),
      built_area_m2 = coalesce(excluded.built_area_m2, public.market_properties.built_area_m2),
      useful_area_m2 = coalesce(excluded.useful_area_m2, public.market_properties.useful_area_m2),
      bedrooms = coalesce(excluded.bedrooms, public.market_properties.bedrooms),
      bathrooms = coalesce(excluded.bathrooms, public.market_properties.bathrooms),
      parking_spaces = coalesce(excluded.parking_spaces, public.market_properties.parking_spaces),
      construction_year = coalesce(excluded.construction_year, public.market_properties.construction_year),
      first_seen_at = least(coalesce(public.market_properties.first_seen_at, excluded.first_seen_at), excluded.first_seen_at),
      last_seen_at = greatest(coalesce(public.market_properties.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
      updated_at = now()
    returning id into v_property_id;

    select * into v_previous
    from public.market_listings
    where source_id = v_source_id and source_listing_id = v_source_listing_id
    order by observed_at desc
    limit 1;

    select count(*) into v_existing_count
    from public.market_listings
    where source_id = v_source_id and source_listing_id = v_source_listing_id;

    insert into public.market_listings (
      source_id, source_listing_id, property_id, operation, status, url, title,
      raw_address, normalized_address, latitude, longitude, price_clp, price_uf,
      price_uf_m2, published_at, observed_at, removed_at, raw_payload
    ) values (
      v_source_id,
      v_source_listing_id,
      v_property_id,
      v_operation,
      v_status,
      nullif(trim(v_row->>'url'), ''),
      nullif(trim(v_row->>'title'), ''),
      v_raw_address,
      coalesce(v_normalized_address, v_raw_address),
      nullif(v_row->>'latitude', '')::numeric,
      nullif(v_row->>'longitude', '')::numeric,
      nullif(v_row->>'price_clp', '')::numeric,
      nullif(v_row->>'price_uf', '')::numeric,
      nullif(v_row->>'price_uf_m2', '')::numeric,
      nullif(v_row->>'published_at', '')::timestamptz,
      p_observed_at,
      case when v_status = 'removed' then p_observed_at else null end,
      v_row
    )
    on conflict (source_id, source_listing_id, observed_at) do update set
      property_id = excluded.property_id,
      operation = excluded.operation,
      status = excluded.status,
      url = excluded.url,
      title = excluded.title,
      raw_address = excluded.raw_address,
      normalized_address = excluded.normalized_address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      price_clp = excluded.price_clp,
      price_uf = excluded.price_uf,
      price_uf_m2 = excluded.price_uf_m2,
      published_at = excluded.published_at,
      removed_at = excluded.removed_at,
      raw_payload = excluded.raw_payload;

    if v_existing_count = 0 then
      v_new := v_new + 1;
    elsif v_previous.status is distinct from v_status
       or v_previous.price_clp is distinct from nullif(v_row->>'price_clp', '')::numeric
       or v_previous.price_uf is distinct from nullif(v_row->>'price_uf', '')::numeric
       or v_previous.price_uf_m2 is distinct from nullif(v_row->>'price_uf_m2', '')::numeric
       or v_previous.property_id is distinct from v_property_id then
      v_changed := v_changed + 1;
    else
      v_unchanged := v_unchanged + 1;
    end if;

    v_accepted := v_accepted + 1;
  end loop;

  update public.market_ingestion_runs
  set accepted_rows = v_accepted,
      rejected_rows = v_rejected,
      status = case when v_accepted > 0 then 'completed' else 'rejected' end,
      completed_at = now(),
      metadata = metadata || jsonb_build_object(
        'new_listings', v_new,
        'changed_listings', v_changed,
        'unchanged_listings', v_unchanged,
        'source_id', v_source_id
      )
  where id = v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id,
    'source_id', v_source_id,
    'received', v_received,
    'accepted', v_accepted,
    'rejected', v_rejected,
    'new_listings', v_new,
    'changed_listings', v_changed,
    'unchanged_listings', v_unchanged
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

revoke all on function public.ingest_market_listings_unit(text, text, text, timestamptz, jsonb) from public;
grant execute on function public.ingest_market_listings_unit(text, text, text, timestamptz, jsonb) to service_role;
