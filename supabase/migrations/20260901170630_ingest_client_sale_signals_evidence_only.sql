create unique index if not exists market_ingestion_runs_client_sales_sha_uq
on public.market_ingestion_runs(source_sha256)
where dataset_kind = 'client_sales' and source_sha256 is not null;

create or replace function public.ingest_market_client_sale_signals_v1(
  p_source_file text,
  p_source_sha256 text,
  p_period_start date,
  p_period_end date,
  p_source_rows_total integer,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_run_id uuid;
  v_existing uuid;
  v_received integer;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_index integer := 0;
  v_row jsonb;
  v_errors text[];
  v_crm_property_id text;
  v_public_property_id text;
  v_property_type text;
  v_status text;
  v_operation text;
  v_price_uf numeric;
  v_updated_at timestamptz;
  v_payload jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if (select auth.uid()) is null or not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
    ) then
      raise exception 'Insufficient permissions' using errcode = '42501';
    end if;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;
  if nullif(btrim(p_source_file),'') is null or nullif(btrim(p_source_sha256),'') is null then
    raise exception 'source file and sha256 are required';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'valid source period is required';
  end if;

  if not pg_try_advisory_xact_lock(hashtext('market_client_sale_signals:' || p_source_sha256)) then
    return jsonb_build_object('skipped',true,'reason','ingestion_locked');
  end if;

  select id into v_existing
  from public.market_ingestion_runs
  where dataset_kind='client_sales' and source_sha256=p_source_sha256
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('skipped',true,'reason','source_already_ingested','run_id',v_existing);
  end if;

  v_received := jsonb_array_length(p_rows);

  insert into public.market_ingestion_runs(
    source_system,dataset_kind,source_file,source_sha256,expected_rows,received_rows,status,metadata
  ) values (
    'client','client_sales',p_source_file,p_source_sha256,v_received,v_received,'running',
    jsonb_build_object(
      'pipeline','client_sale_signal_v1',
      'publication_scope','evidence_only',
      'canonical_write',false,
      'source_rows_total',p_source_rows_total,
      'selected_rows',v_received,
      'selection_rule','property_type=Casa AND operation=Venta AND status=Vendida',
      'sale_date_semantics','unavailable',
      'observed_at_semantics','CRM property update timestamp when sold status was observed',
      'excluded_from',jsonb_build_array('market_transactions','confirmed_sales','days_on_market','absorption','offer_to_sales_ratio')
    )
  ) returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;
    v_errors := '{}';
    v_crm_property_id := nullif(btrim(v_row->>'crm_property_id'),'');
    v_public_property_id := nullif(btrim(v_row->>'public_property_id'),'');
    v_property_type := nullif(btrim(v_row->>'property_type'),'');
    v_status := nullif(btrim(v_row->>'status'),'');
    v_operation := nullif(btrim(v_row->>'operation'),'');

    begin
      v_price_uf := nullif(v_row->>'price_uf','')::numeric;
      v_updated_at := nullif(v_row->>'updated_at','')::timestamptz;
    exception when others then
      v_errors := array_append(v_errors,'invalid_typed_value');
      v_price_uf := null;
      v_updated_at := null;
    end;

    if v_crm_property_id is null then v_errors := array_append(v_errors,'missing_crm_property_id'); end if;
    if v_public_property_id is null then v_errors := array_append(v_errors,'missing_public_property_id'); end if;
    if lower(coalesce(v_property_type,'')) <> 'casa' then v_errors := array_append(v_errors,'not_house'); end if;
    if lower(coalesce(v_operation,'')) <> 'venta' then v_errors := array_append(v_errors,'not_sale_operation'); end if;
    if lower(coalesce(v_status,'')) <> 'vendida' then v_errors := array_append(v_errors,'not_sold_status'); end if;
    if v_price_uf is null or v_price_uf <= 0 then v_errors := array_append(v_errors,'invalid_price_uf'); end if;
    if v_updated_at is null then v_errors := array_append(v_errors,'missing_observation_timestamp'); end if;

    v_payload := coalesce(v_row,'{}'::jsonb) || jsonb_build_object(
      'signal_type','crm_status_vendida',
      'source_period_start',p_period_start,
      'source_period_end',p_period_end,
      'canonical_write',false,
      'is_confirmed_market_sale',false,
      'sale_date',null,
      'governance_note','CRM sold status is recent client evidence, not a confirmed market transaction and not a sale-date observation.'
    );

    insert into public.market_raw_records(
      ingestion_run_id,source_system,dataset_kind,source_record_id,source_file,source_row_number,
      record_hash,payload,observed_at,validation_status,validation_errors
    ) values (
      v_run_id,'client','client_sales',v_crm_property_id,p_source_file,v_index,
      md5(p_source_sha256 || ':' || coalesce(v_crm_property_id,v_index::text) || ':' || v_payload::text),
      v_payload,v_updated_at,
      case when cardinality(v_errors)=0 then 'accepted' else 'rejected' end,
      v_errors
    );

    if cardinality(v_errors)=0 then v_accepted := v_accepted + 1; else v_rejected := v_rejected + 1; end if;
  end loop;

  update public.market_ingestion_runs
  set accepted_rows=v_accepted,
      rejected_rows=v_rejected,
      status=case when v_accepted>0 then 'completed' else 'rejected' end,
      completed_at=now()
  where id=v_run_id;

  return jsonb_build_object(
    'run_id',v_run_id,
    'received',v_received,
    'accepted',v_accepted,
    'rejected',v_rejected,
    'publication_scope','evidence_only'
  );
exception when others then
  if v_run_id is not null then
    update public.market_ingestion_runs
    set status='failed',completed_at=now(),error_message=left(sqlerrm,1000)
    where id=v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_market_client_sale_signals_v1(text,text,date,date,integer,jsonb) from public;
revoke all on function public.ingest_market_client_sale_signals_v1(text,text,date,date,integer,jsonb) from anon;
grant execute on function public.ingest_market_client_sale_signals_v1(text,text,date,date,integer,jsonb) to authenticated;

create or replace function public.get_market_client_sale_signal_summary_v1()
returns table(
  accepted_house_signals bigint,
  latest_observed_at timestamptz,
  latest_source_period_end date,
  source_files bigint
)
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector','seller')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    max(rr.observed_at),
    max(nullif(rr.payload->>'source_period_end','')::date),
    count(distinct rr.source_file)::bigint
  from public.market_raw_records rr
  where rr.source_system='client'
    and rr.dataset_kind='client_sales'
    and rr.validation_status='accepted'
    and rr.payload->>'signal_type'='crm_status_vendida'
    and coalesce((rr.payload->>'is_confirmed_market_sale')::boolean,false)=false;
end;
$$;

revoke all on function public.get_market_client_sale_signal_summary_v1() from public;
revoke all on function public.get_market_client_sale_signal_summary_v1() from anon;
grant execute on function public.get_market_client_sale_signal_summary_v1() to authenticated;
