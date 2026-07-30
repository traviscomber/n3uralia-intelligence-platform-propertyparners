create or replace function public.get_market_raw_trace_summary()
returns table (
  raw_count bigint,
  runs_without_raw bigint,
  inconsistent_runs bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with raw_by_run as (
    select ingestion_run_id, count(*)::bigint as raw_count
    from public.market_raw_records
    group by ingestion_run_id
  )
  select
    (select count(*)::bigint from public.market_raw_records) as raw_count,
    count(*) filter (where coalesce(r.raw_count, 0) = 0)::bigint as runs_without_raw,
    count(*) filter (
      where coalesce(r.raw_count, 0) <> coalesce(i.received_rows, 0)
         or coalesce(i.accepted_rows, 0) + coalesce(i.rejected_rows, 0) <> coalesce(i.received_rows, 0)
    )::bigint as inconsistent_runs
  from public.market_ingestion_runs i
  left join raw_by_run r on r.ingestion_run_id = i.id;
$$;

revoke all on function public.get_market_raw_trace_summary() from public;
grant execute on function public.get_market_raw_trace_summary() to authenticated;
