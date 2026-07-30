alter table public.market_raw_records
  drop constraint if exists market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  add constraint market_raw_records_run_row_key
  unique (ingestion_run_id, source_row_number);

create index if not exists market_raw_records_dataset_hash_idx
  on public.market_raw_records (dataset_kind, record_hash);

create index if not exists market_listings_source_latest_idx
  on public.market_listings (source_id, source_listing_id, observed_at desc);

create or replace function public.ingest_portal_listings(
  p_source_label text,
  p_source_file text,
  p_observed_at timestamptz,
  p_dataset_kind text,
  p_full_snapshot boolean,
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
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_removed integer := 0;
  v_row jsonb;
  v_index integer := 0;
  v_errors text[];
  v_hash text;
  v_source_listing_id text;
  v_raw_address text;
  v_normalized_address text;
  v_property_type text;
  v_operation text;
  v_status text;
  v_latitude numeric;
  v_longitude numeric;
  v_price_clp numeric;
  v_price_uf numeric;
  v_price_uf_m2 numeric;
  v_published_at timestamptz;
  v_property_id uuid;
  v_previous public.market_listings%rowtype;
  v_seen_ids text[] := '{}'::text[];
begin
  if p_dataset_kind not in ('portal_apartments', 'portal_houses', 'portal_projects') then
    raise exception 'Unsupported portal dataset_kind: %', p_dataset_kind;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  v_source_code := left(
    regexp_replace(lower(coalesce(nullif(trim(p_source_label), ''), 'portal-inmobiliario')), '[^a-z0-9]+', '-', 'g'),
    120
  );

  insert into public.market_sources (
    code, name, source_type, file_name, period_start, period_end, row_count, status, metadata
  ) values (
    v_source_code,
    coalesce(nullif(trim(p_source_label), ''), 'Portal Inmobiliario'),
    'portal',
    p_source_file,
    p_observed_at::date,
    p_observed_at::date,
    v_received,
    'active',
    jsonb_build_object('pipeline', 'portal_listing_unit_v1', 'full_snapshot', p_full_snapshot)
  )
  on conflict (code) do update set
    name = excluded.name,
    source_type = excluded.source_type,
    file_name = excluded.file_name,
    period_end = greatest(public.market_sources.period_end, excluded.period_end),
    period_start = least(public.market_sources.period_start, excluded.period_start),
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
      'pipeline', 'portal_listing_unit_v1',
      'source_id', v_source_id,
      'observed_at', p_observed_at,
      'full_snapshot', p_full_snapshot
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_errors := '{}'::text[];
    v_source_listing_id := nullif(trim(v_row->>'source_listing_id'), '');
    v_raw_address := nullif(trim(v_row->>'raw_address'), '');
    v_normalized_address := nullif(lower(trim(regexp_replace(coalesce(v_row->>'normalized_address', v_raw_address, ''), '\s+', ' ', 'g'))), '');
    v_property_type := case lower(trim(coalesce(v_row->>'property_type', '')))
      when 'departamento' then 'Departamento'
      when 'apartment' then 'Departamento'
      when 'casa' then 'Casa'
      when 'house' then 'Casa'
      when 'proyecto' then 'Proyecto'
      when 'project' then 'Proyecto'
      else null
    end;
    v_operation := case lower(trim(coalesce(v_row->>'operation', '')))
      when 'venta' then 'Venta'
      when 'sale' then 'Venta'
      when 'arriendo' then 'Arriendo'
      when 'rent' then 'Arriendo'
      else 'Sin confirmar'
    end;
    v_status := case lower(trim(coalesce(v_row->>'status', 'active')))
      when 'active' then 'active'
      when 'observed' then 'observed'
      when 'inactive' then 'inactive'
      when 'removed' then 'removed'
      when 'sold' then 'sold'
      else 'quarantined'
    end;
    v_latitude := nullif(v_row->>'latitude', '')::numeric;
    v_longitude := nullif(v_row->>'longitude', '')::numeric;
    v_price_clp := nullif(v_row->>'price_clp', '')::numeric;
    v_price_uf := nullif(v_row->>'price_uf', '')::numeric;
    v_price_uf_m2 := nullif(v_row->>'price_uf_m2', '')::numeric;
    v_published_at := nullif(v_row->>'published_at', '')::timestamptz;

    if v_source_listing_id is null then v_errors := array_append(v_errors, 'missing_source_listing_id'); end if;
    if v_raw_address is null then v_errors := array_append(v_errors, 'missing_raw_address'); end if;
    if v_property_type is null then v_errors := array_append(v_errors, 'invalid_property_type'); end if;
    if v_latitude is not null and (v_latitude < -90 or v_latitude > 90) then v_errors := array_append(v_errors, 'invalid_latitude'); end if;
    if v_longitude is not null and (v_longitude < -180 or v_longitude > 180) then v_errors := array_append(v_errors, 'invalid_longitude'); end if;
    if v_price_clp is not null and v_price_clp < 0 then v_errors := array_append(v_errors, 'invalid_price_clp'); end if;
    if v_price_uf is not null and v_price_uf < 0 then v_errors := array_append(v_errors, 'invalid_price_uf'); end if;
    if v_price_uf_m2 is not null and v_price_uf_m2 < 0 then v_errors := array_append(v_errors, 'invalid_price_uf_m2'); end if;

    v_hash := md5(v_row::text);

    insert into public.market_raw_records (
      ingestion_run_id, source_system, dataset_kind, source_record_id, source_file,
      source_row_number, record_hash, payload, observed_at, validation_status, validation_errors
    ) values (
      v_run_id, 'portal_inmobiliario', p_dataset_kind, v_source_listing_id, p_source_file,
      v_index, v_hash, v_row, p_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end,
      v_errors
    );

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    insert into public.market_properties (
      canonical_key, property_type, normalized_address, latitude, longitude,
      identity_status, identity_confidence, identity_evidence, first_seen_at, last_seen_at
    ) values (
      'portal:' || v_source_id::text || ':' || v_source_listing_id,
      v_property_type,
      v_normalized_address,
      v_latitude,
      v_longitude,
      'candidate',
      0.5,
      jsonb_build_array(jsonb_build_object('source', 'portal', 'source_listing_id', v_source_listing_id)),
      p_observed_at,
      p_observed_at
    )
    on conflict (canonical_key) do update set
      property_type = coalesce(excluded.property_type, public.market_properties.property_type),
      normalized_address = coalesce(excluded.normalized_address, public.market_properties.normalized_address),
      latitude = coalesce(excluded.latitude, public.market_properties.latitude),
      longitude = coalesce(excluded.longitude, public.market_properties.longitude),
      last_seen_at = greatest(public.market_properties.last_seen_at, excluded.last_seen_at),
      updated_at = now()
    returning id into v_property_id;

    select * into v_previous
    from public.market_listings
    where source_id = v_source_id
      and source_listing_id = v_source_listing_id
    order by observed_at desc
    limit 1;

    if v_previous.id is null then
      v_new := v_new + 1;
    elsif coalesce(v_previous.status, '') = coalesce(v_status, '')
      and coalesce(v_previous.operation, '') = coalesce(v_operation, '')
      and coalesce(v_previous.raw_address, '') = coalesce(v_raw_address, '')
      and coalesce(v_previous.normalized_address, '') = coalesce(v_normalized_address, '')
      and coalesce(v_previous.price_clp, -1) = coalesce(v_price_clp, -1)
      and coalesce(v_previous.price_uf, -1) = coalesce(v_price_uf, -1)
      and coalesce(v_previous.price_uf_m2, -1) = coalesce(v_price_uf_m2, -1)
      and coalesce(v_previous.latitude, 999) = coalesce(v_latitude, 999)
      and coalesce(v_previous.longitude, 999) = coalesce(v_longitude, 999)
    then
      v_unchanged := v_unchanged + 1;
    else
      v_updated := v_updated + 1;
    end if;

    update public.market_listings
    set status = case when status in ('active', 'observed') then 'inactive' else status end
    where source_id = v_source_id
      and source_listing_id = v_source_listing_id
      and observed_at < p_observed_at
      and status in ('active', 'observed');

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
      v_normalized_address,
      v_latitude,
      v_longitude,
      v_price_clp,
      v_price_uf,
      v_price_uf_m2,
      v_published_at,
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

    v_seen_ids := array_append(v_seen_ids, v_source_listing_id);
    v_accepted := v_accepted + 1;
  end loop;

  if p_full_snapshot then
    update public.market_listings
    set status = 'removed', removed_at = p_observed_at
    where source_id = v_source_id
      and status in ('active', 'observed')
      and observed_at < p_observed_at
      and not (source_listing_id = any(v_seen_ids));
    get diagnostics v_removed = row_count;
  end if;

  update public.market_ingestion_runs
  set accepted_rows = v_accepted,
      rejected_rows = v_rejected,
      status = case when v_accepted > 0 then 'completed' else 'rejected' end,
      completed_at = now(),
      metadata = metadata || jsonb_build_object(
        'source_id', v_source_id,
        'new', v_new,
        'updated', v_updated,
        'unchanged', v_unchanged,
        'removed', v_removed
      )
  where id = v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id,
    'source_id', v_source_id,
    'received', v_received,
    'accepted', v_accepted,
    'rejected', v_rejected,
    'new', v_new,
    'updated', v_updated,
    'unchanged', v_unchanged,
    'removed', v_removed
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

revoke all on function public.ingest_portal_listings(text, text, timestamptz, text, boolean, jsonb) from public;
grant execute on function public.ingest_portal_listings(text, text, timestamptz, text, boolean, jsonb) to service_role;
