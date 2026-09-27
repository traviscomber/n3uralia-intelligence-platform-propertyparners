import type { SourceAdapterDefinition } from '@/lib/platform/operating-profile'

export type SourceAdapterHealth = 'healthy' | 'attention' | 'unavailable'

export type SourceAdapterState = {
  id: string
  label: string
  domain: SourceAdapterDefinition['domain']
  backend: SourceAdapterDefinition['backend']
  refreshMode: SourceAdapterDefinition['refreshMode']
  canonicalRole: SourceAdapterDefinition['canonicalRole']
  health: SourceAdapterHealth
  status: string
  records: number | null
  lastObservedAt: string | null
  evidenceCount: number
}

type MarketSourceRow = {
  source_type: string
  status: string
  row_count: number
  imported_at: string
}

type DataSourceRow = {
  source_type: string
  status: string | null
  records_count: number | null
  last_sync: string | null
}

type ManagementSourceRow = {
  dataset: string
  imported_at: string
}

function matches(values: readonly string[] | undefined, value: string) {
  return !values?.length || values.includes(value)
}

function aggregateStatus(statuses: string[]) {
  if (!statuses.length) return { health: 'unavailable' as const, status: 'sin evidencia' }
  if (statuses.some((status) => ['error', 'failed', 'quarantined'].includes(status))) {
    return { health: 'attention' as const, status: 'requiere revisión' }
  }
  if (statuses.some((status) => ['syncing', 'pending_review', 'pending'].includes(status))) {
    return { health: 'attention' as const, status: 'actualizando' }
  }
  return { health: 'healthy' as const, status: 'disponible' }
}

export function resolveSourceAdapterState(
  adapter: SourceAdapterDefinition,
  sources: {
    market: MarketSourceRow[]
    data: DataSourceRow[]
    management: ManagementSourceRow[]
  },
): SourceAdapterState {
  if (adapter.backend === 'market_sources') {
    const rows = sources.market.filter((row) => matches(adapter.matchSourceTypes, row.source_type))
    const state = aggregateStatus(rows.map((row) => row.status))
    return {
      ...adapter,
      ...state,
      records: rows.reduce((sum, row) => sum + Number(row.row_count || 0), 0),
      lastObservedAt: rows.map((row) => row.imported_at).filter(Boolean).sort().at(-1) ?? null,
      evidenceCount: rows.length,
    }
  }

  if (adapter.backend === 'data_sources') {
    const rows = sources.data.filter((row) => matches(adapter.matchSourceTypes, row.source_type))
    const state = aggregateStatus(rows.map((row) => row.status ?? 'unknown'))
    const counts = rows.map((row) => row.records_count).filter((value): value is number => value != null)
    return {
      ...adapter,
      ...state,
      records: counts.length ? counts.reduce((sum, value) => sum + Number(value || 0), 0) : null,
      lastObservedAt: rows.map((row) => row.last_sync).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null,
      evidenceCount: rows.length,
    }
  }

  const rows = sources.management.filter((row) => matches(adapter.matchDatasets, row.dataset))
  return {
    ...adapter,
    health: rows.length ? 'healthy' : 'unavailable',
    status: rows.length ? 'disponible' : 'sin evidencia',
    records: null,
    lastObservedAt: rows.map((row) => row.imported_at).filter(Boolean).sort().at(-1) ?? null,
    evidenceCount: rows.length,
  }
}

export function sourceAdapterSummary(states: SourceAdapterState[]) {
  return {
    total: states.length,
    healthy: states.filter((item) => item.health === 'healthy').length,
    attention: states.filter((item) => item.health === 'attention').length,
    unavailable: states.filter((item) => item.health === 'unavailable').length,
  }
}
