alter table public.market_ingestion_runs
  drop constraint if exists market_ingestion_runs_dataset_kind_check;

alter table public.market_ingestion_runs
  add constraint market_ingestion_runs_dataset_kind_check
  check (dataset_kind = any (array[
    'portal_apartments'::text,
    'portal_houses'::text,
    'portal_projects'::text,
    'registered_sales'::text,
    'client_sales'::text,
    'kml_neighborhoods'::text,
    'market_aggregate'::text
  ]));

create or replace function public.ingest_market_aggregate(
  p_source_system text,
  p_source_label text,
  p_source_file text,
  p_snapshot_date date,
  p_rows jsonb
) returns jsonb
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
  v_row jsonb;
  v_index integer := 0;
  v_neighborhood text;
  v_neighborhood_id uuid;
  v_inventory integer;
  v_absorption numeric;
  v_days numeric;
  v_errors text[];
  v_hash text;
  v_source_code text;
begin
  if p_source_system not in ('portal_inmobiliario','cbrs','client','kml','manual_import') then
    raise exception 'Unsupported source_system: %', p_source_system;
  end if;

  v_source_code := left(regexp_replace(lower(coalesce(nullif(p_source_label,''),'market-import')), '[^a-z0-9]+', '-', 'g'), 120);

  insert into public.market_sources (code,name,source_type,file_name,period_start,period_end,row_count,status,metadata)
  values (
    v_source_code,
    coalesce(nullif(p_source_label,''),'Market import'),
    case p_source_system when 'portal_inmobiliario' then 'portal' when 'cbrs' then 'cbrs' when 'client' then 'client' when 'kml' then 'kml' else 'other' end,
    p_source_file,
    p_snapshot_date,
    p_snapshot_date,
    v_received,
    'active',
    jsonb_build_object('pipeline','canonical_market_aggregate_v1')
  )
  on conflict (code) do update set
    name = excluded.name,
    source_type = excluded.source_type,
    file_name = excluded.file_name,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    row_count = excluded.row_count,
    imported_at = now(),
    metadata = public.market_sources.metadata || excluded.metadata
  returning id into v_source_id;

  insert into public.market_ingestion_runs (
    source_system,dataset_kind,source_file,expected_rows,received_rows,status,metadata
  ) values (
    p_source_system,'market_aggregate',p_source_file,v_received,v_received,'running',
    jsonb_build_object('pipeline','canonical_market_aggregate_v1','source_id',v_source_id,'snapshot_date',p_snapshot_date)
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_neighborhood := nullif(trim(v_row->>'neighborhood'),'');
    v_inventory := greatest(0, coalesce((v_row->>'inventory_count')::integer,0));
    v_absorption := nullif(v_row->>'absorption_rate','')::numeric;
    v_days := nullif(v_row->>'avg_days_on_market','')::numeric;
    v_errors := '{}'::text[];

    if v_neighborhood is null then v_errors := array_append(v_errors,'missing_neighborhood'); end if;
    if v_absorption is not null and (v_absorption < 0 or v_absorption > 1) then v_errors := array_append(v_errors,'invalid_absorption_rate'); end if;
    if v_days is not null and v_days < 0 then v_errors := array_append(v_errors,'invalid_days_on_market'); end if;

    v_hash := md5('aggregate:' || coalesce(v_source_code,'') || ':' || p_snapshot_date::text || ':' || v_index::text || ':' || v_row::text);

    insert into public.market_raw_records (
      ingestion_run_id,source_system,dataset_kind,source_record_id,source_file,source_row_number,
      record_hash,payload,observed_at,validation_status,validation_errors
    ) values (
      v_run_id,p_source_system,'market_aggregate',coalesce(v_row->>'source_record_id',v_index::text),p_source_file,v_index,
      v_hash,v_row,coalesce(nullif(v_row->>'recorded_at','')::timestamptz,p_snapshot_date::timestamptz),
      case when cardinality(v_errors)=0 then 'accepted' else 'rejected' end,v_errors
    ) on conflict (dataset_kind,record_hash) do nothing;

    if cardinality(v_errors) > 0 then
      v_rejected := v_rejected + 1;
      continue;
    end if;

    select id into v_neighborhood_id
    from public.market_neighborhoods
    where lower(trim(name)) = lower(v_neighborhood)
    order by created_at
    limit 1;

    insert into public.market_metric_snapshots (
      period_start,period_end,neighborhood_id,property_type,active_inventory,new_listings,
      removed_listings,confirmed_sales,median_days_on_market,absorption_rate,offer_to_sales_ratio,
      source_ids,methodology_version
    ) values (
      date_trunc('month',p_snapshot_date)::date,p_snapshot_date,v_neighborhood_id,null,v_inventory,null,
      null,null,v_days,v_absorption,null,array[v_source_id],'canonical_market_aggregate_v1'
    ) on conflict do nothing;

    v_accepted := v_accepted + 1;
  end loop;

  update public.market_ingestion_runs
  set accepted_rows=v_accepted,rejected_rows=v_rejected,status=case when v_accepted>0 then 'completed' else 'rejected' end,
      completed_at=now(),metadata=metadata || jsonb_build_object('source_id',v_source_id)
  where id=v_run_id;

  return jsonb_build_object('run_id',v_run_id,'source_id',v_source_id,'received',v_received,'accepted',v_accepted,'rejected',v_rejected);
exception when others then
  if v_run_id is not null then
    update public.market_ingestion_runs set status='failed',completed_at=now(),error_message=sqlerrm where id=v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_market_aggregate(text,text,text,date,jsonb) from public;
grant execute on function public.ingest_market_aggregate(text,text,text,date,jsonb) to service_role;
