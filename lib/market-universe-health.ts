import { createServiceClient } from '@/lib/supabase/service'

export type MarketDatasetHealth = {
  datasetKind: 'portal_houses' | 'portal_apartments'
  label: 'Casas' | 'Departamentos'
  fullInventory: number | null
  detailedActive: number | null
  detailCoveragePct: number | null
  fullSnapshotAt: string | null
  latestDeltaAt: string | null
  latestDeltaStatus: string | null
}

export type MarketUniverseHealth = {
  datasets: MarketDatasetHealth[]
  fullInventoryTotal: number | null
  detailedActiveTotal: number | null
  detailCoveragePct: number | null
  latestFullSnapshotAt: string | null
  latestDeltaAt: string | null
  error?: string
}

const DATASETS = [
  {
    datasetKind: 'portal_houses' as const,
    label: 'Casas' as const,
    sourceCode: 'portal-inmobiliario-vitacura-portal-houses',
  },
  {
    datasetKind: 'portal_apartments' as const,
    label: 'Departamentos' as const,
    sourceCode: 'portal-inmobiliario-vitacura-portal-apartments',
  },
]

export async function getMarketUniverseHealth(): Promise<MarketUniverseHealth> {
  const empty: MarketUniverseHealth = {
    datasets: DATASETS.map(({ datasetKind, label }) => ({
      datasetKind,
      label,
      fullInventory: null,
      detailedActive: null,
      detailCoveragePct: null,
      fullSnapshotAt: null,
      latestDeltaAt: null,
      latestDeltaStatus: null,
    })),
    fullInventoryTotal: null,
    detailedActiveTotal: null,
    detailCoveragePct: null,
    latestFullSnapshotAt: null,
    latestDeltaAt: null,
  }

  try {
    const db = createServiceClient()
    const [sourcesResult, fullRunsResult, deltaRunsResult] = await Promise.all([
      db.from('market_sources')
        .select('id,code')
        .in('code', DATASETS.map((item) => item.sourceCode)),
      db.from('market_ingestion_runs')
        .select('dataset_kind,status,started_at,completed_at,metadata')
        .in('dataset_kind', DATASETS.map((item) => item.datasetKind))
        .eq('status', 'completed')
        .contains('metadata', { pipeline: 'portal_inventory_discovery_v1', full_snapshot: true })
        .order('started_at', { ascending: false })
        .limit(10),
      db.from('market_ingestion_runs')
        .select('dataset_kind,status,started_at,completed_at,metadata')
        .in('dataset_kind', DATASETS.map((item) => item.datasetKind))
        .contains('metadata', { pipeline: 'portal_daily_delta_v1' })
        .order('started_at', { ascending: false })
        .limit(10),
    ])

    const firstError = sourcesResult.error || fullRunsResult.error || deltaRunsResult.error
    if (firstError) return { ...empty, error: firstError.message }

    const sourceByCode = new Map((sourcesResult.data ?? []).map((row) => [row.code, row.id]))
    const latestFullByDataset = new Map<string, any>()
    for (const row of fullRunsResult.data ?? []) {
      if (!latestFullByDataset.has(row.dataset_kind)) latestFullByDataset.set(row.dataset_kind, row)
    }
    const latestDeltaByDataset = new Map<string, any>()
    for (const row of deltaRunsResult.data ?? []) {
      if (!latestDeltaByDataset.has(row.dataset_kind)) latestDeltaByDataset.set(row.dataset_kind, row)
    }

    const datasets: MarketDatasetHealth[] = []
    for (const dataset of DATASETS) {
      const sourceId = sourceByCode.get(dataset.sourceCode)
      const currentResult = sourceId
        ? await db.from('market_current_listings')
            .select('source_listing_id')
            .eq('source_id', sourceId)
            .in('status', ['active', 'observed'])
            .limit(3500)
        : { data: [], error: null }

      if (currentResult.error) return { ...empty, error: currentResult.error.message }

      const fullRun = latestFullByDataset.get(dataset.datasetKind) ?? null
      const deltaRun = latestDeltaByDataset.get(dataset.datasetKind) ?? null
      const metadata = fullRun?.metadata && typeof fullRun.metadata === 'object'
        ? fullRun.metadata as Record<string, unknown>
        : null
      const fullInventory = metadata?.discovery_unique_listings == null
        ? null
        : Number(metadata.discovery_unique_listings)
      const detailedActive = new Set((currentResult.data ?? []).map((row) => row.source_listing_id).filter(Boolean)).size

      datasets.push({
        datasetKind: dataset.datasetKind,
        label: dataset.label,
        fullInventory,
        detailedActive,
        detailCoveragePct: fullInventory && fullInventory > 0
          ? detailedActive / fullInventory
          : null,
        fullSnapshotAt: fullRun?.completed_at ?? fullRun?.started_at ?? null,
        latestDeltaAt: deltaRun?.completed_at ?? deltaRun?.started_at ?? null,
        latestDeltaStatus: deltaRun?.status ?? null,
      })
    }

    const inventories = datasets.map((row) => row.fullInventory).filter((value): value is number => value != null)
    const details = datasets.map((row) => row.detailedActive).filter((value): value is number => value != null)
    const fullInventoryTotal = inventories.length === datasets.length
      ? inventories.reduce((sum, value) => sum + value, 0)
      : null
    const detailedActiveTotal = details.length === datasets.length
      ? details.reduce((sum, value) => sum + value, 0)
      : null

    const fullDates = datasets.map((row) => row.fullSnapshotAt).filter((value): value is string => Boolean(value)).sort()
    const deltaDates = datasets.map((row) => row.latestDeltaAt).filter((value): value is string => Boolean(value)).sort()

    return {
      datasets,
      fullInventoryTotal,
      detailedActiveTotal,
      detailCoveragePct: fullInventoryTotal && detailedActiveTotal != null
        ? detailedActiveTotal / fullInventoryTotal
        : null,
      latestFullSnapshotAt: fullDates.at(-1) ?? null,
      latestDeltaAt: deltaDates.at(-1) ?? null,
    }
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : 'No fue posible medir la cobertura del universo de mercado.',
    }
  }
}
