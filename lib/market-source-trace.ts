import { createClient } from '@/lib/supabase/server'

export type MarketSourceTrace = {
  connected: boolean
  sourceCount: number
  runCount: number
  rawCount: number
  sourcesWithoutRuns: number
  runsWithoutRaw: number
  inconsistentRuns: number
  quarantinedSources: number
  failedRuns: number
  sources: Array<{
    id: string
    code: string
    name: string
    sourceType: string
    status: string
    fileName: string | null
    importedAt: string | null
    periodStart: string | null
    periodEnd: string | null
    rowCount: number
    isLegacy: boolean
    latestRunId: string | null
    latestRunStatus: string | null
    latestRunStartedAt: string | null
    latestRunCompletedAt: string | null
    latestRunError: string | null
    latestRunReceived: number
    latestRunAccepted: number
    latestRunRejected: number
  }>
  latestRuns: Array<{
    id: string
    datasetKind: string
    sourceFile: string | null
    status: string
    received: number
    accepted: number
    rejected: number
    startedAt: string | null
    completedAt: string | null
    errorMessage: string | null
    sourceName: string | null
  }>
  error?: string
}

type RawTraceSummary = {
  raw_count: number | string | null
  runs_without_raw: number | string | null
  inconsistent_runs: number | string | null
}

type RunRow = {
  id: string
  dataset_kind: string
  source_file: string | null
  status: string
  received_rows: number | null
  accepted_rows: number | null
  rejected_rows: number | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

function count(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function sourceIdFromRun(run: RunRow) {
  const sourceId = run.metadata?.source_id
  return typeof sourceId === 'string' && sourceId.length > 0 ? sourceId : null
}

export async function getMarketSourceTrace(): Promise<MarketSourceTrace> {
  const empty: MarketSourceTrace = {
    connected: false,
    sourceCount: 0,
    runCount: 0,
    rawCount: 0,
    sourcesWithoutRuns: 0,
    runsWithoutRaw: 0,
    inconsistentRuns: 0,
    quarantinedSources: 0,
    failedRuns: 0,
    sources: [],
    latestRuns: [],
  }

  try {
    const supabase = await createClient()
    const [sources, runs, rawSummary, latestRuns] = await Promise.all([
      supabase
        .from('market_sources')
        .select('id,code,name,source_type,status,file_name,imported_at,period_start,period_end,row_count,metadata')
        .order('imported_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('market_ingestion_runs')
        .select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,started_at,completed_at,error_message,metadata')
        .order('started_at', { ascending: false }),
      supabase.rpc('get_market_raw_trace_summary'),
      supabase
        .from('market_ingestion_runs')
        .select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,started_at,completed_at,error_message,metadata')
        .order('started_at', { ascending: false })
        .limit(12),
    ])

    const errors = [sources.error, runs.error, rawSummary.error, latestRuns.error].filter(Boolean)
    if (errors.length) return { ...empty, error: errors.map((error) => error?.message).join(' · ') }

    const sourceRows = sources.data ?? []
    const runRows = (runs.data ?? []) as RunRow[]
    const summary = ((rawSummary.data ?? [])[0] ?? {}) as RawTraceSummary

    const linkedSourceIds = new Set(runRows.map(sourceIdFromRun).filter((value): value is string => Boolean(value)))
    const sourceNames = new Map(sourceRows.map((source) => [source.id, source.name]))
    const latestRunBySource = new Map<string, RunRow>()

    for (const run of runRows) {
      const sourceId = sourceIdFromRun(run)
      if (sourceId && !latestRunBySource.has(sourceId)) latestRunBySource.set(sourceId, run)
    }

    return {
      connected: true,
      sourceCount: sourceRows.length,
      runCount: runRows.length,
      rawCount: count(summary.raw_count),
      sourcesWithoutRuns: sourceRows.filter((source) => !linkedSourceIds.has(source.id)).length,
      runsWithoutRaw: count(summary.runs_without_raw),
      inconsistentRuns: count(summary.inconsistent_runs),
      quarantinedSources: sourceRows.filter((source) => source.status === 'quarantined').length,
      failedRuns: runRows.filter((run) => run.status === 'failed').length,
      sources: sourceRows.map((source) => {
        const metadata = (source.metadata ?? {}) as Record<string, unknown>
        const latestRun = latestRunBySource.get(source.id) ?? null
        return {
          id: source.id,
          code: source.code,
          name: source.name,
          sourceType: source.source_type,
          status: source.status,
          fileName: source.file_name,
          importedAt: source.imported_at,
          periodStart: source.period_start,
          periodEnd: source.period_end,
          rowCount: count(source.row_count),
          isLegacy: metadata.historical_backfill === true || typeof metadata.legacy_data_source_id === 'string',
          latestRunId: latestRun?.id ?? null,
          latestRunStatus: latestRun?.status ?? null,
          latestRunStartedAt: latestRun?.started_at ?? null,
          latestRunCompletedAt: latestRun?.completed_at ?? null,
          latestRunError: latestRun?.error_message ?? null,
          latestRunReceived: count(latestRun?.received_rows),
          latestRunAccepted: count(latestRun?.accepted_rows),
          latestRunRejected: count(latestRun?.rejected_rows),
        }
      }),
      latestRuns: ((latestRuns.data ?? []) as RunRow[]).map((run) => {
        const sourceId = sourceIdFromRun(run)
        return {
          id: run.id,
          datasetKind: run.dataset_kind,
          sourceFile: run.source_file,
          status: run.status,
          received: count(run.received_rows),
          accepted: count(run.accepted_rows),
          rejected: count(run.rejected_rows),
          startedAt: run.started_at,
          completedAt: run.completed_at,
          errorMessage: run.error_message,
          sourceName: sourceId ? sourceNames.get(sourceId) ?? null : null,
        }
      }),
    }
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : 'No fue posible consultar la trazabilidad operativa.' }
  }
}
