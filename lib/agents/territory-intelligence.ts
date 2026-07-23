import { createClient } from '@/lib/supabase/server'
import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'

export type TerritoryAgentRequest = {
  dateFrom?: string
  dateTo?: string
  limit?: number
}

type MarketRow = {
  id: string
  neighborhood: string | null
  period_date: string
  avg_price_m2_uf: number | string | null
  inventory_count: number | null
  absorption_rate: number | string | null
  avg_days_on_market: number | string | null
  source: string | null
  source_url: string | null
  recorded_at: string | null
}

type TerritoryMetric = {
  neighborhood: string
  currentPeriod: string
  previousPeriod: string | null
  current: {
    priceM2Uf: number
    inventory: number
    absorption: number
    daysOnMarket: number
  }
  changes: {
    priceM2Uf: number | null
    inventory: number | null
    absorption: number | null
    daysOnMarket: number | null
  }
  signal: 'accelerating' | 'stable' | 'slowing' | 'insufficient_data'
  opportunity: 'capture' | 'investment' | 'pricing_review' | 'monitor'
  confidence: number
}

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function average(rows: MarketRow[], key: keyof MarketRow) {
  const values = rows.map((row) => numeric(row[key] as number | string | null)).filter((value) => value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function change(current: number, previous: number) {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function confidence(rows: MarketRow[]) {
  const sample = Math.min(1, rows.length / 8)
  const sourced = rows.length ? rows.filter((row) => Boolean(row.source)).length / rows.length : 0
  const dated = rows.length ? rows.filter((row) => Boolean(row.recorded_at || row.period_date)).length / rows.length : 0
  return Math.round((sample * 0.5 + sourced * 0.25 + dated * 0.25) * 10000) / 10000
}

function classifySignal(metric: TerritoryMetric['changes']) {
  const available = [metric.inventory, metric.absorption, metric.daysOnMarket].filter(
    (value): value is number => value !== null,
  )

  if (available.length < 2) return 'insufficient_data' as const

  let score = 0
  if (metric.inventory !== null) score += metric.inventory <= -5 ? 1 : metric.inventory >= 8 ? -1 : 0
  if (metric.absorption !== null) score += metric.absorption >= 5 ? 1 : metric.absorption <= -5 ? -1 : 0
  if (metric.daysOnMarket !== null) score += metric.daysOnMarket <= -8 ? 1 : metric.daysOnMarket >= 10 ? -1 : 0

  if (score >= 2) return 'accelerating' as const
  if (score <= -2) return 'slowing' as const
  return 'stable' as const
}

function classifyOpportunity(signal: TerritoryMetric['signal'], metric: TerritoryMetric['changes']) {
  if (signal === 'accelerating' && metric.priceM2Uf !== null && metric.priceM2Uf <= 4) return 'investment' as const
  if (signal === 'accelerating') return 'capture' as const
  if (signal === 'slowing' || (metric.daysOnMarket !== null && metric.daysOnMarket >= 10)) return 'pricing_review' as const
  return 'monitor' as const
}

export async function runTerritoryIntelligence(request: TerritoryAgentRequest = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('market_data')
    .select('id, neighborhood, period_date, avg_price_m2_uf, inventory_count, absorption_rate, avg_days_on_market, source, source_url, recorded_at')
    .not('neighborhood', 'is', null)
    .order('period_date', { ascending: false })
    .limit(1200)

  if (request.dateFrom) query = query.gte('period_date', request.dateFrom)
  if (request.dateTo) query = query.lte('period_date', request.dateTo)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as MarketRow[]
  const groups = new Map<string, MarketRow[]>()

  for (const row of rows) {
    const neighborhood = row.neighborhood?.trim()
    if (!neighborhood) continue
    groups.set(neighborhood, [...(groups.get(neighborhood) ?? []), row])
  }

  const territories: TerritoryMetric[] = [...groups.entries()].map(([neighborhood, neighborhoodRows]) => {
    const dates = [...new Set(neighborhoodRows.map((row) => row.period_date))].sort().reverse()
    const currentPeriod = dates[0]
    const previousPeriod = dates[1] ?? null
    const currentRows = neighborhoodRows.filter((row) => row.period_date === currentPeriod)
    const previousRows = previousPeriod ? neighborhoodRows.filter((row) => row.period_date === previousPeriod) : []

    const current = {
      priceM2Uf: average(currentRows, 'avg_price_m2_uf'),
      inventory: average(currentRows, 'inventory_count'),
      absorption: average(currentRows, 'absorption_rate'),
      daysOnMarket: average(currentRows, 'avg_days_on_market'),
    }

    const previous = {
      priceM2Uf: average(previousRows, 'avg_price_m2_uf'),
      inventory: average(previousRows, 'inventory_count'),
      absorption: average(previousRows, 'absorption_rate'),
      daysOnMarket: average(previousRows, 'avg_days_on_market'),
    }

    const changes = {
      priceM2Uf: change(current.priceM2Uf, previous.priceM2Uf),
      inventory: change(current.inventory, previous.inventory),
      absorption: change(current.absorption, previous.absorption),
      daysOnMarket: change(current.daysOnMarket, previous.daysOnMarket),
    }

    const signal = classifySignal(changes)

    return {
      neighborhood,
      currentPeriod,
      previousPeriod,
      current,
      changes,
      signal,
      opportunity: classifyOpportunity(signal, changes),
      confidence: confidence(neighborhoodRows),
    }
  })

  const priority = { accelerating: 3, slowing: 2, stable: 1, insufficient_data: 0 }
  territories.sort((a, b) => priority[b.signal] - priority[a.signal] || b.confidence - a.confidence)

  const selected = territories.slice(0, Math.max(1, Math.min(request.limit ?? 12, 30)))
  const findings: AgentFindingInput[] = selected
    .filter((item) => item.signal !== 'stable' && item.signal !== 'insufficient_data')
    .map((item) => ({
      findingType: `territory_${item.signal}`,
      title: `${item.neighborhood}: ${item.signal === 'accelerating' ? 'aceleración territorial' : 'desaceleración territorial'}`,
      summary: item.signal === 'accelerating'
        ? `El barrio combina señales de mayor liquidez. Acción sugerida: ${item.opportunity === 'investment' ? 'evaluar oportunidades de inversión' : 'priorizar captación'}.`
        : 'El barrio presenta señales de menor liquidez. Acción sugerida: revisar precio, exposición y estrategia comercial.',
      severity: item.signal === 'accelerating' ? 'opportunity' : 'warning',
      confidence: item.confidence,
      dimensions: {
        neighborhood: item.neighborhood,
        currentPeriod: item.currentPeriod,
        previousPeriod: item.previousPeriod,
        changes: item.changes,
        opportunity: item.opportunity,
        evidenceUniverse: 'external_market',
      },
    }))

  const sourceMap = new Map<string, AgentSourceInput>()
  for (const row of rows) {
    const sourceName = row.source || 'market_data'
    const key = `${sourceName}:${row.source_url || ''}`
    if (sourceMap.has(key)) continue

    const observedAt = row.recorded_at || `${row.period_date}T00:00:00.000Z`
    const ageDays = Math.floor((Date.now() - new Date(observedAt).getTime()) / 86400000)
    sourceMap.set(key, {
      sourceType: 'territory_market_dataset',
      sourceName,
      sourceUrl: row.source_url,
      sourceTable: 'market_data',
      observedAt,
      freshnessStatus: ageDays <= 90 ? 'current' : 'stale',
      metadata: { evidenceUniverse: 'external_market' },
    })
  }

  const overallConfidence = selected.length
    ? selected.reduce((sum, item) => sum + item.confidence, 0) / selected.length
    : 0

  return {
    confidence: Math.round(overallConfidence * 10000) / 10000,
    findings,
    sources: [...sourceMap.values()],
    output: {
      scope: 'Vitacura por barrio',
      dataUniverses: {
        market: { included: true, records: rows.length },
        crm: { included: false, records: 0, reason: 'Territory Intelligence no consulta ni mezcla datos CRM.' },
      },
      neighborhoodCount: territories.length,
      territories: selected,
      leaders: selected.filter((item) => item.signal === 'accelerating'),
      watchlist: selected.filter((item) => item.signal === 'slowing'),
      methodology: 'Comparación por barrio entre los dos períodos externos más recientes disponibles.',
      uncertainty: 'Las señales territoriales dependen de cobertura, frescura y comparabilidad de los registros externos; no equivalen por sí solas a ventas confirmadas.',
    },
  }
}
