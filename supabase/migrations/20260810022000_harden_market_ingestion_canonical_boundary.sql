-- Market ingestion canonical boundary v2
-- Preserve Portal observations as source evidence and only link to an existing
-- canonical property when external identity resolves uniquely.

alter table private.market_provenance_recoveries enable row level security;
revoke all on table private.market_provenance_recoveries from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on table private.market_provenance_recoveries to service_role;

create or replace function private.normalize_market_external_id(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  with normalized as (
    select regexp_replace(lower(trim(p_value)), '[^a-z0-9]+', '', 'g') as value
  )
  select case
    when value ~ '^mlc[0-9]+$' then regexp_replace(value, '^mlc', '')
    else value
  end
  from normalized;
$$;

revoke all on function private.normalize_market_external_id(text) from public, anon, authenticated;
grant execute on function private.normalize_market_external_id(text) to service_role;

create or replace view private.market_unique_verified_external_identity_v1
with (security_invoker = true)
as
with candidates as (
  select
    private.normalize_market_external_id(q.effective_external_listing_id) as normalized_external_listing_id,
    q.property_id
  from private.market_identity_quality_effective_v1 q
  where q.effective_external_listing_id is not null
    and q.provenance_origin <> 'unresolved'
    and q.identity_signal_class <> 'conflicting_external_identity'
), grouped as (
  select
    normalized_external_listing_id,
    min(property_id::text)::uuid as property_id,
    count(distinct property_id) as property_count
  from candidates
  where normalized_external_listing_id is not null
    and normalized_external_listing_id <> ''
  group by normalized_external_listing_id
)
select normalized_external_listing_id, property_id
from grouped
where property_count = 1;

revoke all on private.market_unique_verified_external_identity_v1 from public, anon, authenticated;
grant select on private.market_unique_verified_external_identity_v1 to service_role;

create or replace function public.ingest_portal_listing_snapshot_v2(
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
set search_path = pg_catalog, public, private
as $$
declare
  v_run_id uuid;
  v_source_id uuid;
  v_source_code text;
  v_received integer;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_new integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_removed integer := 0;
  v_linked integer := 0;
  v_unlinked integer := 0;
  v_index integer := 0;
  v_row jsonb;
  v_evidence_payload jsonb;
  v_errors text[];
  v_listing_id text;
  v_normalized_listing_id text;
  v_record_hash text;
  v_property_id uuid;
  v_operation text;
  v_status text;
  v_address text;
  v_normalized_address text;
  v_url text;
  v_latitude numeric;
  v_longitude numeric;
  v_price_clp numeric;
  v_price_uf numeric;
  v_price_uf_m2 numeric;
  v_published_at timestamptz;
  v_previous public.market_listings%rowtype;
  v_changed boolean;
  v_seen_ids text[] := '{}';
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;
  if p_observed_at is null then
    raise exception 'p_observed_at is required';
  end if;
  if p_dataset_kind not in ('portal_apartments', 'portal_houses', 'portal_projects') then
    raise exception 'Unsupported dataset_kind: %', p_dataset_kind;
  end if;

  if not pg_try_advisory_xact_lock(hashtext('market_portal_ingestion_v2:' || p_dataset_kind)) then
    return jsonb_build_object(
      'skipped', true,
      'reason', 'dataset_ingestion_locked',
      'dataset_kind', p_dataset_kind
    );
  end if;

  v_received := jsonb_array_length(p_rows);
  v_source_code := left(trim(both '-' from regexp_replace(
    lower(coalesce(nullif(trim(p_source_label), ''), 'portal-import') || '-' || p_dataset_kind),
    '[^a-z0-9]+', '-', 'g'
  )), 120);

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
    jsonb_build_object(
      'pipeline', 'unit_portal_listing_v2',
      'dataset_kind', p_dataset_kind,
      'full_snapshot', p_full_snapshot,
      'canonical_creation', false
    )
  )
  on conflict (code) do update set
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
    'portal_inmobiliario',
    p_dataset_kind,
    p_source_file,
    v_received,
    v_received,
    'running',
    jsonb_build_object(
      'pipeline', 'unit_portal_listing_v2',
      'source_id', v_source_id,
      'observed_at', p_observed_at,
      'full_snapshot', p_full_snapshot,
      'canonical_creation', false
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;
    v_errors := '{}';
    v_property_id := null;

    v_listing_id := nullif(trim(coalesce(v_row->>'source_listing_id', v_row->>'mlc_id', v_row->>'id')), '');
    v_url := nullif(trim(coalesce(v_row->>'source_url', v_row->>'url')), '');
    v_address := nullif(trim(coalesce(v_row->>'address', v_row->>'direccion')), '');
    v_normalized_address := nullif(trim(coalesce(v_row->>'normalized_address', v_address)), '');

    if v_listing_id is null then
      v_errors := array_append(v_errors, 'missing_source_listing_id');
    elsif v_listing_id = any(v_seen_ids) then
      v_errors := array_append(v_errors, 'duplicate_source_listing_id_in_run');
    end if;
    if v_url is null then
      v_errors := array_append(v_errors, 'missing_source_url');
    end if;

    begin
      v_latitude := nullif(v_row->>'latitude', '')::numeric;
      v_longitude := nullif(v_row->>'longitude', '')::numeric;
      v_price_clp := nullif(v_row->>'price_clp', '')::numeric;
      v_price_uf := nullif(v_row->>'price_uf', '')::numeric;
      v_price_uf_m2 := nullif(v_row->>'price_uf_m2', '')::numeric;
      v_published_at := nullif(v_row->>'published_at', '')::timestamptz;
    exception when others then
      v_errors := array_append(v_errors, 'invalid_typed_value');
      v_latitude := null;
      v_longitude := null;
      v_price_clp := null;
      v_price_uf := null;
      v_price_uf_m2 := null;
      v_published_at := null;
    end;

    if v_latitude is not null and v_latitude not between -90 and 90 then
      v_errors := array_append(v_errors, 'invalid_latitude');
    end if;
    if v_longitude is not null and v_longitude not between -180 and 180 then
      v_errors := array_append(v_errors, 'invalid_longitude');
    end if;
    if coalesce(v_price_clp, 0) < 0 or coalesce(v_price_uf, 0) < 0 or coalesce(v_price_uf_m2, 0) < 0 then
      v_errors := array_append(v_errors, 'invalid_price');
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

    v_evidence_payload := coalesce(v_row, '{}'::jsonb) || jsonb_build_object(
      'source', 'portal_inmobiliario',
      'source_listing_id', v_listing_id,
      'source_url', v_url
    );
    v_record_hash := md5(p_dataset_kind || ':' || coalesce(v_listing_id, 'row-' || v_index::text) || ':' || v_evidence_payload::text);

    insert into public.market_raw_records (
      ingestion_run_id, source_system, dataset_kind, source_record_id, source_file, source_row_number,
      record_hash, payload, observed_at, validation_status, validation_errors
    ) values (
      v_run_id,
      'portal_inmobiliario',
      p_dataset_kind,
      v_listing_id,
      p_source_file,
      v_index,
      v_record_hash,
      v_evidence_payload,
      p_observed_at,
      case when cardinality(v_errors) = 0 then 'accepted' else 'rejected' end,
      v_errors
    );

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    v_seen_ids := array_append(v_seen_ids, v_listing_id);
    v_normalized_listing_id := private.normalize_market_external_id(v_listing_id);

    select u.property_id
      into v_property_id
    from private.market_unique_verified_external_identity_v1 u
    where u.normalized_external_listing_id = v_normalized_listing_id
    limit 1;

    select *
      into v_previous
    from public.market_listings
    where source_id = v_source_id
      and source_listing_id = v_listing_id
      and observed_at < p_observed_at
    order by observed_at desc, created_at desc
    limit 1;

    if v_property_id is null and v_previous.id is not null then
      v_property_id := v_previous.property_id;
    end if;

    v_changed := v_previous.id is not null and (
      v_previous.property_id is distinct from v_property_id
      or v_previous.operation is distinct from v_operation
      or v_previous.status is distinct from v_status
      or v_previous.url is distinct from v_url
      or v_previous.title is distinct from nullif(trim(v_row->>'title'), '')
      or v_previous.raw_address is distinct from v_address
      or v_previous.normalized_address is distinct from v_normalized_address
      or v_previous.latitude is distinct from v_latitude
      or v_previous.longitude is distinct from v_longitude
      or v_previous.price_clp is distinct from v_price_clp
      or v_previous.price_uf is distinct from v_price_uf
      or v_previous.price_uf_m2 is distinct from v_price_uf_m2
    );

    insert into public.market_listings (
      source_id, source_listing_id, property_id, operation, status, url, title, raw_address,
      normalized_address, latitude, longitude, price_clp, price_uf, price_uf_m2,
      published_at, observed_at, removed_at, raw_payload
    ) values (
      v_source_id,
      v_listing_id,
      v_property_id,
      v_operation,
      v_status,
      v_url,
      nullif(trim(v_row->>'title'), ''),
      v_address,
      v_normalized_address,
      v_latitude,
      v_longitude,
      v_price_clp,
      v_price_uf,
      v_price_uf_m2,
      v_published_at,
      p_observed_at,
      case when v_status = 'removed' then p_observed_at else null end,
      v_evidence_payload
    )
    on conflict (source_id, source_listing_id, observed_at) do update set
      property_id = coalesce(excluded.property_id, public.market_listings.property_id),
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

    if v_property_id is null then
      v_unlinked := v_unlinked + 1;
    else
      v_linked := v_linked + 1;
    end if;

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
      select *
      from public.market_current_listings
      where source_id = v_source_id
        and observed_at < p_observed_at
        and status in ('active', 'observed')
    ), inserted as (
      insert into public.market_listings (
        source_id, source_listing_id, property_id, operation, status, url, title, raw_address,
        normalized_address, latitude, longitude, price_clp, price_uf, price_uf_m2,
        published_at, observed_at, removed_at, raw_payload
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
      where not (source_listing_id = any(v_seen_ids))
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
        'removed_listings', v_removed,
        'linked_listings', v_linked,
        'unlinked_listings', v_unlinked
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
    'removed', v_removed,
    'linked', v_linked,
    'unlinked', v_unlinked
  );
exception when others then
  if v_run_id is not null then
    update public.market_ingestion_runs
    set status = 'failed', completed_at = now(), error_message = left(sqlerrm, 1000)
    where id = v_run_id;
  else
    insert into public.market_ingestion_runs (
      source_system, dataset_kind, source_file, expected_rows, received_rows,
      accepted_rows, rejected_rows, status, completed_at, error_message, metadata
    ) values (
      'portal_inmobiliario',
      coalesce(p_dataset_kind, 'portal_apartments'),
      p_source_file,
      case when jsonb_typeof(p_rows) = 'array' then jsonb_array_length(p_rows) else 0 end,
      case when jsonb_typeof(p_rows) = 'array' then jsonb_array_length(p_rows) else 0 end,
      0,
      case when jsonb_typeof(p_rows) = 'array' then jsonb_array_length(p_rows) else 0 end,
      'failed',
      now(),
      left(sqlerrm, 1000),
      jsonb_build_object('pipeline', 'unit_portal_listing_v2', 'failure_persisted', true)
    ) returning id into v_run_id;
  end if;

  if v_source_code is not null then
    update public.market_sources
    set status = 'quarantined',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'last_failure_at', now(),
          'last_failure_run_id', v_run_id,
          'last_failure', left(sqlerrm, 500)
        )
    where code = v_source_code;
  end if;

  return jsonb_build_object(
    'failed', true,
    'run_id', v_run_id,
    'received', coalesce(v_received, 0),
    'accepted', 0,
    'rejected', coalesce(v_received, 0),
    'new', 0,
    'updated', 0,
    'unchanged', 0,
    'removed', 0,
    'linked', 0,
    'unlinked', 0,
    'error', 'Portal ingestion failed and was recorded.'
  );
end;
$$;

revoke all on function public.ingest_portal_listing_snapshot_v2(text, text, text, timestamptz, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.ingest_portal_listing_snapshot_v2(text, text, text, timestamptz, jsonb, boolean) to service_role;

create or replace view private.market_source_refresh_health_v1
with (security_invoker = true)
as
with required(dataset_kind) as (
  values ('portal_apartments'::text), ('portal_houses'::text), ('portal_projects'::text)
), latest as (
  select distinct on (r.dataset_kind)
    r.dataset_kind,
    r.id as run_id,
    r.status,
    r.received_rows,
    r.accepted_rows,
    r.rejected_rows,
    r.completed_at,
    r.metadata
  from public.market_ingestion_runs r
  where r.source_system = 'portal_inmobiliario'
    and r.dataset_kind in ('portal_apartments', 'portal_houses', 'portal_projects')
  order by r.dataset_kind, r.completed_at desc nulls last, r.created_at desc
)
select
  req.dataset_kind,
  l.run_id,
  l.status,
  l.received_rows,
  l.accepted_rows,
  l.rejected_rows,
  l.completed_at,
  case
    when l.run_id is null then 'missing'
    when l.status <> 'completed' then 'failed_or_incomplete'
    when coalesce(l.accepted_rows, 0) = 0 then 'no_accepted_rows'
    when l.completed_at < now() - interval '7 days' then 'stale'
    else 'fresh'
  end as refresh_status
from required req
left join latest l using (dataset_kind);

revoke all on private.market_source_refresh_health_v1 from public, anon, authenticated;
grant select on private.market_source_refresh_health_v1 to service_role;

create or replace view private.market_properties_production_v2
with (security_invoker = true)
as
select mp.*
from public.market_properties mp
where mp.identity_status = 'confirmed'
  and exists (
    select 1
    from private.market_identity_quality_effective_v1 q
    where q.property_id = mp.id
      and q.provenance_origin <> 'unresolved'
  )
  and not exists (
    select 1
    from private.market_identity_quality_effective_v1 q
    where q.property_id = mp.id
      and (q.provenance_origin = 'unresolved' or q.identity_signal_class = 'conflicting_external_identity')
  )
  and not exists (
    select 1
    from private.market_identity_quality_effective_v1 q
    where q.property_id = mp.id
      and q.identity_signal_class = 'probable_duplicate_listing'
      and not exists (
        select 1
        from private.market_identity_quality_effective_v1 q2
        join public.market_property_matches m
          on m.status = 'confirmed'
         and m.left_entity_type = 'property'
         and m.right_entity_type = 'property'
         and (
           (m.left_entity_id = mp.id and m.right_entity_id = q2.property_id)
           or (m.right_entity_id = mp.id and m.left_entity_id = q2.property_id)
         )
        where q2.effective_external_listing_id = q.effective_external_listing_id
          and q2.property_id <> mp.id
      )
  )
  and exists (
    select 1
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    where ml.property_id = mp.id
      and ml.status in ('active', 'observed')
      and ml.observed_at >= now() - interval '7 days'
      and ms.status = 'active'
      and ms.source_type = 'portal'
      and ms.metadata->>'pipeline' = 'unit_portal_listing_v2'
  );

revoke all on private.market_properties_production_v2 from public, anon, authenticated;
grant select on private.market_properties_production_v2 to service_role;

create or replace view private.market_listings_production_v2
with (security_invoker = true)
as
select ml.*
from public.market_current_listings ml
join public.market_sources ms on ms.id = ml.source_id
join private.market_properties_production_v2 mp on mp.id = ml.property_id
where ml.status in ('active', 'observed')
  and ml.observed_at >= now() - interval '7 days'
  and ms.status = 'active'
  and ms.source_type = 'portal'
  and ms.metadata->>'pipeline' = 'unit_portal_listing_v2';

revoke all on private.market_listings_production_v2 from public, anon, authenticated;
grant select on private.market_listings_production_v2 to service_role;

create or replace view private.market_production_release_gate_v2
with (security_invoker = true)
as
with refresh as (
  select
    count(*) as required_dataset_count,
    count(*) filter (where refresh_status = 'fresh') as fresh_dataset_count,
    count(*) filter (where refresh_status <> 'fresh') as unhealthy_dataset_count,
    max(completed_at) as latest_refresh_completed_at
  from private.market_source_refresh_health_v1
), current_v2 as (
  select
    count(*) as current_listing_rows,
    count(*) filter (where ml.property_id is null) as unlinked_current_listing_rows,
    count(*) filter (where ml.property_id is not null and mp.identity_status <> 'confirmed') as linked_unconfirmed_property_rows
  from public.market_current_listings ml
  join public.market_sources ms on ms.id = ml.source_id
  left join public.market_properties mp on mp.id = ml.property_id
  where ms.source_type = 'portal'
    and ms.metadata->>'pipeline' = 'unit_portal_listing_v2'
    and ml.status in ('active', 'observed')
    and ml.observed_at >= now() - interval '7 days'
), current_link_conflicts as (
  select count(*) as conflicting_current_external_ids
  from (
    select private.normalize_market_external_id(ml.source_listing_id) as external_id
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    where ms.source_type = 'portal'
      and ms.metadata->>'pipeline' = 'unit_portal_listing_v2'
      and ml.status in ('active', 'observed')
      and ml.observed_at >= now() - interval '7 days'
      and ml.property_id is not null
    group by private.normalize_market_external_id(ml.source_listing_id)
    having count(distinct ml.property_id) > 1
  ) x
), production as (
  select
    (select count(*) from private.market_properties_production_v2) as production_property_rows,
    (select count(*) from private.market_listings_production_v2) as production_listing_rows
), legacy_backlog as (
  select
    count(*) filter (where q.property_identity_status = 'candidate') as legacy_candidate_rows,
    count(*) filter (where q.provenance_origin = 'unresolved') as unresolved_provenance_rows,
    count(*) filter (where q.identity_signal_class = 'conflicting_external_identity') as conflicting_external_identity_rows,
    count(*) filter (where q.identity_signal_class = 'probable_duplicate_listing') as probable_duplicate_rows
  from private.market_identity_quality_effective_v1 q
), exposure as (
  select
    has_table_privilege('authenticated', 'public.market_properties', 'SELECT') as authenticated_can_read_market_properties,
    has_table_privilege('authenticated', 'public.market_listings', 'SELECT') as authenticated_can_read_market_listings,
    has_table_privilege('authenticated', 'public.neighborhood_market_data', 'SELECT') as authenticated_can_read_neighborhood_source
), capability as (
  select
    (select count(*) from private.neighborhood_market_data_verified_v1) as neighborhood_verified_rows,
    (select count(*) from public.market_transactions) as transaction_rows,
    (select count(*) from public.valuation_cases) as valuation_case_rows,
    (select count(*) from public.valuation_comparables) as valuation_comparable_rows,
    (select count(*) from public.management_approved_metric_values) as management_approved_rows
), assembled as (
  select r.*, c.*, clc.*, p.*, lb.*, e.*, cap.*
  from refresh r
  cross join current_v2 c
  cross join current_link_conflicts clc
  cross join production p
  cross join legacy_backlog lb
  cross join exposure e
  cross join capability cap
), classified as (
  select a.*,
    array_remove(array[
      case when a.authenticated_can_read_market_properties or a.authenticated_can_read_market_listings
        then 'quarantined_market_tables_exposed_to_authenticated' end,
      case when a.unhealthy_dataset_count > 0
        then 'required_market_refresh_missing_or_stale' end,
      case when a.conflicting_current_external_ids > 0
        then 'current_source_identity_conflict' end,
      case when a.production_property_rows = 0 or a.production_listing_rows = 0
        then 'no_publishable_market_dataset' end
    ]::text[], null) as blockers,
    array_remove(array[
      case when a.legacy_candidate_rows > 0
        then 'legacy_identity_candidates_quarantined' end,
      case when a.unresolved_provenance_rows > 0
        then 'legacy_provenance_backlog_quarantined' end,
      case when a.probable_duplicate_rows > 0
        then 'legacy_duplicate_backlog_quarantined' end,
      case when a.unlinked_current_listing_rows > 0
        then 'current_listing_identity_backlog_quarantined' end,
      case when a.neighborhood_verified_rows = 0
        then 'neighborhood_data_unverified_disable_neighborhood_features' end,
      case when a.transaction_rows = 0
        then 'transactions_unavailable_disable_transaction_features' end,
      case when a.valuation_case_rows = 0 or a.valuation_comparable_rows = 0
        then 'valuation_evidence_unavailable_disable_valuation_features' end,
      case when a.management_approved_rows = 0
        then 'management_metrics_unpublished_disable_management_reporting' end
    ]::text[], null) as limitations
  from assembled a
)
select
  now() as evaluated_at,
  case
    when cardinality(blockers) > 0 then 'BLOCK'
    when cardinality(limitations) > 0 then 'HOLD'
    else 'PASS'
  end as release_verdict,
  cardinality(blockers) as blocker_count,
  blockers,
  cardinality(limitations) as limitation_count,
  limitations,
  required_dataset_count,
  fresh_dataset_count,
  unhealthy_dataset_count,
  latest_refresh_completed_at,
  current_listing_rows,
  unlinked_current_listing_rows,
  linked_unconfirmed_property_rows,
  conflicting_current_external_ids,
  production_property_rows,
  production_listing_rows,
  legacy_candidate_rows,
  unresolved_provenance_rows,
  conflicting_external_identity_rows,
  probable_duplicate_rows,
  authenticated_can_read_market_properties,
  authenticated_can_read_market_listings,
  authenticated_can_read_neighborhood_source,
  neighborhood_verified_rows,
  transaction_rows,
  valuation_case_rows,
  valuation_comparable_rows,
  management_approved_rows
from classified;

revoke all on private.market_production_release_gate_v2 from public, anon, authenticated;
grant select on private.market_production_release_gate_v2 to service_role;

comment on function public.ingest_portal_listing_snapshot_v2(text, text, text, timestamptz, jsonb, boolean)
is 'Portal ingestion v2: stores immutable source evidence and listings, never auto-creates canonical properties, and links only unique verified external identities.';

comment on view private.market_production_release_gate_v2
is 'Production gate v2: blocks unsafe exposure, stale/missing required source refreshes, current identity conflicts, and absence of a publishable market dataset. Quarantined legacy backlogs are limitations, not release blockers.';
