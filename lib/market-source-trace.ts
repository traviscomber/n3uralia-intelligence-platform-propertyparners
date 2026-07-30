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
    const [sources, runs, raw, latestRuns] = await Promise.all([
      supabase.from('market_sources').select('id,name'),
      supabase.from('market_ingestion_runs').select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,completed_at,metadata').order('started_at', { ascending: false }),
      supabase.from('market_raw_records').select('id,ingestion_run_id'),
      supabase.from('market_ingestion_runs').select('id,dataset_kind,source_file,status,received_rows,accepted_rows,rejected_rows,completed_at,metadata').order('started_at', { ascending: false }).limit(8),
    ])

    const errors = [sources.error, runs.error, raw.error, latestRuns.error].filter(Boolean)
    if (errors.length) return { ...empty, error: errors.map((error) => error?.message).join(' · ') }

    const sourceRows = sources.data ?? []
    const runRows = runs.data ?? []
    const rawRows = raw.data ?? []
    const rawByRun = new Map<string, number>()
    for (const row of rawRows) rawByRun.set(row.ingestion_run_id, (rawByRun.get(row.ingestion_run_id) ?? 0) + 1)

    const linkedSourceIds = new Set(
      runRows
        .map((run) => (run.metadata as Record<string, unknown> | null)?.source_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    )
    const sourceNames = new Map(sourceRows.map((source) => [source.id, source.name]))

    const inconsistentRuns = runRows.filter((run) => {
      const rawCount = rawByRun.get(run.id) ?? 0
      return rawCount !== (run.received_rows ?? 0) || (run.accepted_rows ?? 0) + (run.rejected_rows ?? 0) !== (run.received_rows ?? 0)
    }).length

    return {
      connected: true,
      sourceCount: sourceRows.length,
      runCount: runRows.length,
      rawCount: rawRows.length,
      sourcesWithoutRuns: sourceRows.filter((source) => !linkedSourceIds.has(source.id)).length,
      runsWithoutRaw: runRows.filter((run) => !rawByRun.has(run.id)).length,
      inconsistentRuns,
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
