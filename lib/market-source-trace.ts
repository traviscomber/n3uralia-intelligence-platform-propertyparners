import { createClient } from '@/lib/supabase/server'

export type MarketSourceTrace = {
  connected: boolean
  sourceCount: number
  runCount: number
  rawCount: number
  sourcesWithoutRuns: number
  runsWithoutRaw: number
  inconsistentRuns: number
  latestRuns: Array<{
    id: string
    datasetKind: string
    sourceFile: string | null
    status: string
    received: number
    accepted: number
    rejected: number
    completedAt: string | null
    sourceName: string | null
  }>
  error?: string
}

type RawTraceSummary = {
  raw_count: number | string | null
  runs_without_raw: number | string | null
  inconsistent_runs: number | string | null
}

function count(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
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
    latestRuns: [],
  }

  try {
    const supabase = await createClient()
    const [sources, runs, rawSummary, latestRuns] = await Promise.all([
      supabase.from('market_sources').select('id,name'),
      supabase.from('market_ingestion_runs').select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,completed_at,metadata').order('started_at', { ascending: false }),
      supabase.rpc('get_market_raw_trace_summary'),
      supabase.from('market_ingestion_runs').select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,completed_at,metadata').order('started_at', { ascending: false }).limit(8),
    ])

    const errors = [sources.error, runs.error, rawSummary.error, latestRuns.error].filter(Boolean)
    if (errors.length) return { ...empty, error: errors.map((error) => error?.message).join(' · ') }

    const sourceRows = sources.data ?? []
    const runRows = runs.data ?? []
    const summary = ((rawSummary.data ?? [])[0] ?? {}) as RawTraceSummary

    const linkedSourceIds = new Set(
      runRows
        .map((run) => (run.metadata as Record<string, unknown> | null)?.source_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    )
    const sourceNames = new Map(sourceRows.map((source) => [source.id, source.name]))

    return {
      connected: true,
      sourceCount: sourceRows.length,
      runCount: runRows.length,
      rawCount: count(summary.raw_count),
      sourcesWithoutRuns: sourceRows.filter((source) => !linkedSourceIds.has(source.id)).length,
      runsWithoutRaw: count(summary.runs_without_raw),
      inconsistentRuns: count(summary.inconsistent_runs),
      latestRuns: (latestRuns.data ?? []).map((run) => {
        const sourceId = (run.metadata as Record<string, unknown> | null)?.source_id
        return {
          id: run.id,
          datasetKind: run.dataset_kind,
          sourceFile: run.source_file,
          status: run.status,
          received: run.received_rows ?? 0,
          accepted: run.accepted_rows ?? 0,
          rejected: run.rejected_rows ?? 0,
          completedAt: run.completed_at,
          sourceName: typeof sourceId === 'string' ? sourceNames.get(sourceId) ?? null : null,
        }
      }),
    }
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : 'No fue posible consultar la trazabilidad operativa.' }
  }
}
