drop index if exists public.market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  drop constraint if exists market_raw_records_dataset_kind_record_hash_key;

alter table public.market_raw_records
  add constraint market_raw_records_run_row_key
  unique (ingestion_run_id, source_row_number);

create index if not exists market_raw_records_dataset_hash_idx
  on public.market_raw_records (dataset_kind, record_hash);

create or replace function public.ingest_portal_listing_snapshot(
  p_source_label text,
  p_source_file text,
  p_dataset_kind text,
  p_observed_at timestamptz,
  p_rows jsonb,
  p_full_snapshot boolean default false
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
  v_index integer := 0;
  v_row jsonb;
  v_errors text[];
  v_record_hash text;
  v_listing_id text;
  v_property_id uuid;
  v_property_key text;
  v_property_type text;
  v_operation text;
  v_status text;
  v_row_observed_at timestamptz;
  v_previous public.market_listings%rowtype;
  v_changed boolean;
  v_seen_ids text[] := '{}';
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Authentication required';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and lower(coalesce(role, '')) in ('admin', 'ceo', 'director', 'subdirector')
    ) then
      raise exception 'Insufficient permissions';
    end if;
  end if;

  if p_dataset_kind not in ('portal_apartments', 'portal_houses', 'portal_projects') then
    raise exception 'Unsupported dataset_kind: %', p_dataset_kind;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  if p_observed_at is null then
    raise exception 'p_observed_at is required';
  end if;

  v_source_code := left(
    trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(p_source_label), ''), 'portal-import')), '[^a-z0-9]+', '-', 'g')),
    120
  );

  insert into public.market_sources (
    code,
    name,
    source_type,
    file_name,
    period_start,
    period_end,
    row_count,
    status,
    metadata
  ) values (
    v_source_code,
    coalesce(nullif(trim(p_source_label), ''), 'Portal Inmobiliario'),
    'portal',
    p_source_file,
    p_observed_at::date,
    p_observed_at::date,
    v_received,
    'active',
    jsonb_build_object(
      'pipeline', 'unit_portal_listing_v1',
      'dataset_kind', p_dataset_kind,
      'full_snapshot', p_full_snapshot
    )
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
    source_system,
    dataset_kind,
    source_file,
    expected_rows,
    received_rows,
    status,
    metadata
  ) values (
    'portal_inmobiliario',
    p_dataset_kind,
    p_source_file,
    v_received,
    v_received,
    'running',
    jsonb_build_object(
      'pipeline', 'unit_portal_listing_v1',
      'source_id', v_source_id,
      'observed_at', p_observed_at,
      'full_snapshot', p_full_snapshot
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_errors := '{}';
    v_listing_id := nullif(trim(coalesce(v_row->>'source_listing_id', v_row->>'mlc_id', v_row->>'id')), '');
    v_row_observed_at := coalesce(nullif(v_row->>'observed_at', '')::timestamptz, p_observed_at);

    v_property_type := case
      when p_dataset_kind = 'portal_apartments' then 'Departamento'
      when p_dataset_kind = 'portal_houses' then 'Casa'
      when p_dataset_kind = 'portal_projects' then 'Proyecto'
      else 'Otro'
    end;

    if nullif(trim(v_row->>'property_type'), '') is not null then
      v_property_type := case lower(trim(v_row->>'property_type'))
        when 'departamento' then 'Departamento'
        when 'casa' then 'Casa'
        when 'proyecto' then 'Proyecto'
        else 'Otro'
      end;
    end if;

    v_operation := case lower(trim(coalesce(v_row->>'operation', v_row->>'operacion', '')))
      when 'venta' then 'Venta'
      when 'sale' then 'Venta'
      when 'arriendo' then 'Arriendo'
      when 'rent' then 'Arriendo'
      else 'Sin confirmar'
    end;

    v_status := case lower(trim(coalesce(v_row->>'status', 'active')))
      when 'active' then 'active'
      when 'activa' then 'active'
      when 'observed' then 'observed'
      when 'inactive' then 'inactive'
      when 'inactiva' then 'inactive'
      when 'sold' then 'sold'
      when 'vendida' then 'sold'
      when 'removed' then 'removed'
      when 'retirada' then 'removed'
      else 'quarantined'
    end;

    if v_listing_id is null then
      v_errors := array_append(v_errors, 'missing_source_listing_id');
    end if;

    if nullif(v_row->>'latitude', '') is not null
       and (v_row->>'latitude')::numeric not between -90 and 90 then
      v_errors := array_append(v_errors, 'invalid_latitude');
    end if;

    if nullif(v_row->>'longitude', '') is not null
       and (v_row->>'longitude')::numeric not between -180 and 180 then
      v_errors := array_append(v_errors, 'invalid_longitude');
    end if;

    if nullif(v_row->>'price_uf', '') is not null
       and (v_row->>'price_uf')::numeric < 0 then
      v_errors := array_append(v_errors, 'invalid_price_uf');
    end if;

    if nullif(v_row->>'price_clp', '') is not null
       and (v_row->>'price_clp')::numeric < 0 then
      v_errors := array_append(v_errors, 'invalid_price_clp');
    end if;

    v_record_hash := md5(
      p_dataset_kind || ':' ||
      coalesce(v_listing_id, 'row-' || v_index::text) || ':' ||
      v_row::text
    );

    insert into public.market_raw_records (
      ingestion_run_id,
      source_system,
      dataset_kind,
      source_record_id,
      source_file,
      source_row_number,
      record_hash,
      payload,
      observed_at,
      validation_status,
      validation_errors
    ) values (
      v_run_id,
      'portal_inmobiliario',
      p_dataset_kind,
      v_listing_id,
      p_source_file,
      v_index,
      v_record_hash,
      v_row,
      v_row_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end,
      v_errors
    );

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    v_seen_ids := array_append(v_seen_ids, v_listing_id);
    v_property_key := 'portal:' || v_source_code || ':' || v_listing_id;

    insert into public.market_properties (
      canonical_key,
      property_type,
      normalized_address,
      latitude,
      longitude,
      land_area_m2,
      built_area_m2,
      useful_area_m2,
      bedrooms,
      bathrooms,
      parking_spaces,
      construction_year,
      identity_status,
      identity_evidence,
      first_seen_at,
      last_seen_at
    ) values (
      v_property_key,
      v_property_type,
      nullif(trim(coalesce(v_row->>'normalized_address', v_row->>'address', v_row->>'direccion')), ''),
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
      jsonb_build_array(jsonb_build_object('source_id', v_source_id, 'source_listing_id', v_listing_id)),
      v_row_observed_at,
      v_row_observed_at
    )
    on conflict (canonical_key) do update set
      property_type = coalesce(excluded.property_type, public.market_properties.property_type),
      normalized_address = coalesce(excluded.normalized_address, public.market_properties.normalized_address),
      latitude = coalesce(excluded.latitude, public.market_properties.latitude),
      longitude = coalesce(excluded.longitude, public.market_properties.longitude),
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
    where source_id = v_source_id
      and source_listing_id = v_listing_id
      and observed_at < v_row_observed_at
    order by observed_at desc
    limit 1;

    v_changed := v_previous.id is not null and (
      v_previous.operation is distinct from v_operation
      or v_previous.status is distinct from v_status
      or v_previous.url is distinct from nullif(trim(v_row->>'url'), '')
      or v_previous.title is distinct from nullif(trim(v_row->>'title'), '')
      or v_previous.raw_address is distinct from nullif(trim(coalesce(v_row->>'address', v_row->>'direccion')), '')
      or v_previous.latitude is distinct from nullif(v_row->>'latitude', '')::numeric
      or v_previous.longitude is distinct from nullif(v_row->>'longitude', '')::numeric
      or v_previous.price_clp is distinct from nullif(v_row->>'price_clp', '')::numeric
      or v_previous.price_uf is distinct from nullif(v_row->>'price_uf', '')::numeric
      or v_previous.price_uf_m2 is distinct from nullif(v_row->>'price_uf_m2', '')::numeric
    );

    insert into public.market_listings (
      source_id,
      source_listing_id,
      property_id,
      operation,
      status,
      url,
      title,
      raw_address,
      normalized_address,
      latitude,
      longitude,
      price_clp,
      price_uf,
      price_uf_m2,
      published_at,
      observed_at,
      removed_at,
      raw_payload
    ) values (
      v_source_id,
      v_listing_id,
      v_property_id,
      v_operation,
      v_status,
      nullif(trim(v_row->>'url'), ''),
      nullif(trim(v_row->>'title'), ''),
      nullif(trim(coalesce(v_row->>'address', v_row->>'direccion')), ''),
      nullif(trim(coalesce(v_row->>'normalized_address', v_row->>'address', v_row->>'direccion')), ''),
      nullif(v_row->>'latitude', '')::numeric,
      nullif(v_row->>'longitude', '')::numeric,
      nullif(v_row->>'price_clp', '')::numeric,
      nullif(v_row->>'price_uf', '')::numeric,
      nullif(v_row->>'price_uf_m2', '')::numeric,
      nullif(v_row->>'published_at', '')::timestamptz,
      v_row_observed_at,
      case when v_status = 'removed' then v_row_observed_at else null end,
      v_row
    )
    on conflict (source_id, source_listing_id, observed_at) do nothing;

    if v_previous.id is null then
      v_new := v_new + 1;
    elsif v_changed then
      v_updated := v_updated + 1;
    else
      v_unchanged := v_unchanged + 1;
    end if;

    v_accepted := v_accepted + 1;
  end loop;

  if p_full_snapshot then
    with latest as (
      select distinct on (source_listing_id) *
      from public.market_listings
      where source_id = v_source_id
        and observed_at < p_observed_at
      order by source_listing_id, observed_at desc
    ), inserted as (
      insert into public.market_listings (
        source_id,
        source_listing_id,
        property_id,
        operation,
        status,
        url,
        title,
        raw_address,
        normalized_address,
        latitude,
        longitude,
        price_clp,
        price_uf,
        price_uf_m2,
        published_at,
        observed_at,
        removed_at,
        raw_payload
      )
      select
        source_id,
        source_listing_id,
        property_id,
        operation,
        'removed',
        url,
        title,
        raw_address,
        normalized_address,
        latitude,
        longitude,
        price_clp,
        price_uf,
        price_uf_m2,
        published_at,
        p_observed_at,
        p_observed_at,
        raw_payload || jsonb_build_object('removal_reason', 'missing_from_full_snapshot')
      from latest
      where status in ('active', 'observed')
        and not (source_listing_id = any(v_seen_ids))
      on conflict (source_id, source_listing_id, observed_at) do nothing
      returning 1
    )
    select count(*) into v_removed from inserted;
  end if;

  update public.market_ingestion_runs
  set accepted_rows = v_accepted,
      rejected_rows = v_rejected,
      status = case when v_accepted > 0 or v_received = 0 then 'completed' else 'rejected' end,
      completed_at = now(),
      metadata = metadata || jsonb_build_object(
        'new_listings', v_new,
        'updated_listings', v_updated,
        'unchanged_listings', v_unchanged,
        'removed_listings', v_removed
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
    set status = 'failed',
        completed_at = now(),
        error_message = sqlerrm
    where id = v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_portal_listing_snapshot(text, text, text, timestamptz, jsonb, boolean) from public;
grant execute on function public.ingest_portal_listing_snapshot(text, text, text, timestamptz, jsonb, boolean) to authenticated;
