do $$
declare
  v_source_id uuid;
begin
  insert into public.market_sources (
    code, name, source_type, file_name, period_start, period_end,
    row_count, status, imported_at, metadata
  ) values (
    'legacy-properties-bridge',
    'Puente legado de propiedades',
    'other',
    'legacy_properties_bridge',
    date '2026-07-11',
    date '2026-07-20',
    837,
    'active',
    now(),
    jsonb_build_object(
      'pipeline', 'legacy_properties_v1',
      'historical_backfill', true,
      'provenance', 'public.properties',
      'observation_basis', 'market_listings.observed_at'
    )
  )
  on conflict (code) do update set
    name = excluded.name,
    source_type = excluded.source_type,
    file_name = excluded.file_name,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    row_count = excluded.row_count,
    status = excluded.status,
    metadata = public.market_sources.metadata || excluded.metadata
  returning id into v_source_id;

  update public.market_ingestion_runs
  set metadata = metadata || jsonb_build_object('source_id', v_source_id)
  where metadata ->> 'bridge' = 'legacy_properties_v1'
    and coalesce(metadata ->> 'source_id', '') = '';
end $$;
