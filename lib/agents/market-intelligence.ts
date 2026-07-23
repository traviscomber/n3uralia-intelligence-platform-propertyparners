import { createClient } from '@/lib/supabase/server'
import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'

export type MarketAgentRequest = {
  neighborhood?: string
  dateFrom?: string
  dateTo?: string
}

type MarketRow = {
  id: string
  neighborhood: string | null
  period_date: string
  avg_price_uf: number | string | null
  avg_price_m2_uf: number | string | null
  inventory_count: number | null
  absorption_rate: number | string | null
  avg_days_on_market: number | string | null
  source: string | null
  source_url: string | null
  recorded_at: string | null
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function percentageChange(current: number, previous: number) {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function average(rows: MarketRow[], key: keyof MarketRow) {
  const values = rows.map((row) => numberValue(row[key] as number | string | null)).filter((value) => value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function confidenceFor(rows: MarketRow[]) {
  const sampleScore = Math.min(1, rows.length / 12)
  const sourcedRows = rows.filter((row) => Boolean(row.source)).length
  const sourceScore = rows.length ? sourcedRows / rows.length : 0
  const datedRows = rows.filter((row) => Boolean(row.recorded_at || row.period_date)).length
  const dateScore = rows.length ? datedRows / rows.length : 0
  return Math.round((sampleScore * 0.45 + sourceScore * 0.3 + dateScore * 0.25) * 10000) / 10000
}

export async function runMarketIntelligence(request: MarketAgentRequest) {
  const supabase = await createClient()
  let query = supabase
    .from('market_data')
    .select('id, neighborhood, period_date, avg_price_uf, avg_price_m2_uf, inventory_count, absorption_rate, avg_days_on_market, source, source_url, recorded_at')
    .order('period_date', { ascending: false })
    .limit(240)

  if (request.neighborhood) query = query.eq('neighborhood', request.neighborhood)
  if (request.dateFrom) query = query.gte('period_date', request.dateFrom)
  if (request.dateTo) query = query.lte('period_date', request.dateTo)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as MarketRow[]
  if (!rows.length) {
    return {
      confidence: 0,
      findings: [] as AgentFindingInput[],
      sources: [] as AgentSourceInput[],
      output: {
        sampleSize: 0,
        message: 'No existen registros de mercado para los filtros seleccionados.',
      },
    }
  }

  const orderedDates = [...new Set(rows.map((row) => row.period_date))].sort().reverse()
  const currentDate = orderedDates[0]
  const previousDate = orderedDates[1]
  const currentRows = rows.filter((row) => row.period_date === currentDate)
  const previousRows = previousDate ? rows.filter((row) => row.period_date === previousDate) : []

  const current = {
    avgPriceUf: average(currentRows, 'avg_price_uf'),
    avgPriceM2Uf: average(currentRows, 'avg_price_m2_uf'),
    inventory: average(currentRows, 'inventory_count'),
    absorption: average(currentRows, 'absorption_rate'),
    daysOnMarket: average(currentRows, 'avg_days_on_market'),
  }
  const previous = {
    avgPriceUf: average(previousRows, 'avg_price_uf'),
    avgPriceM2Uf: average(previousRows, 'avg_price_m2_uf'),
    inventory: average(previousRows, 'inventory_count'),
    absorption: average(previousRows, 'absorption_rate'),
    daysOnMarket: average(previousRows, 'avg_days_on_market'),
  }

  const changes = {
    avgPriceUf: percentageChange(current.avgPriceUf, previous.avgPriceUf),
    avgPriceM2Uf: percentageChange(current.avgPriceM2Uf, previous.avgPriceM2Uf),
    inventory: percentageChange(current.inventory, previous.inventory),
    absorption: percentageChange(current.absorption, previous.absorption),
    daysOnMarket: percentageChange(current.daysOnMarket, previous.daysOnMarket),
  }

  const confidence = confidenceFor(rows)
  const findings: AgentFindingInput[] = []
  const scope = request.neighborhood || 'Vitacura'

  if (changes.inventory !== null && Math.abs(changes.inventory) >= 8) {
    findings.push({
      findingType: changes.inventory > 0 ? 'inventory_increase' : 'inventory_decrease',
      title: `${changes.inventory > 0 ? 'Aumento' : 'Disminución'} relevante de inventario`,
      summary: `El inventario promedio de ${scope} cambió ${changes.inventory.toFixed(1)}% frente al período anterior.`,
      severity: changes.inventory > 0 ? 'warning' : 'opportunity',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.inventory },
    })
  }

  if (changes.avgPriceM2Uf !== null && Math.abs(changes.avgPriceM2Uf) >= 4) {
    findings.push({
      findingType: changes.avgPriceM2Uf > 0 ? 'price_m2_increase' : 'price_m2_decrease',
      title: `Cambio relevante en precio UF/m²`,
      summary: `El precio promedio por m² en ${scope} cambió ${changes.avgPriceM2Uf.toFixed(1)}% frente al período anterior.`,
      severity: changes.avgPriceM2Uf > 0 ? 'opportunity' : 'warning',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.avgPriceM2Uf },
    })
  }

  if (changes.daysOnMarket !== null && Math.abs(changes.daysOnMarket) >= 10) {
    findings.push({
      findingType: changes.daysOnMarket > 0 ? 'days_on_market_increase' : 'days_on_market_decrease',
      title: `${changes.daysOnMarket > 0 ? 'Mayor' : 'Menor'} tiempo de publicación`,
      summary: `Los días promedio en mercado de ${scope} cambiaron ${changes.daysOnMarket.toFixed(1)}% frente al período anterior.`,
      severity: changes.daysOnMarket > 0 ? 'warning' : 'opportunity',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.daysOnMarket },
    })
  }

  if (!findings.length) {
    findings.push({
      findingType: 'market_stable',
      title: 'Mercado sin variaciones críticas',
      summary: `No se detectaron cambios por sobre los umbrales operativos para ${scope}.`,
      severity: 'info',
      confidence,
      dimensions: { scope, currentDate, previousDate },
    })
  }

  const sourceMap = new Map<string, AgentSourceInput>()
  for (const row of rows) {
    const sourceName = row.source || 'market_data'
    const key = `${sourceName}:${row.source_url || ''}`
    if (!sourceMap.has(key)) {
      const observedAt = row.recorded_at || `${row.period_date}T00:00:00.000Z`
      const ageDays = Math.floor((Date.now() - new Date(observedAt).getTime()) / 86400000)
      sourceMap.set(key, {
        sourceType: 'market_dataset',
        sourceName,
        sourceUrl: row.source_url,
        sourceTable: 'market_data',
        observedAt,
        freshnessStatus: ageDays <= 90 ? 'current' : 'stale',
        metadata: { rows: rows.filter((candidate) => (candidate.source || 'market_data') === sourceName).length },
      })
    }
  }

  return {
    confidence,
    findings,
    sources: [...sourceMap.values()],
    output: {
      scope,
      sampleSize: rows.length,
      currentPeriod: currentDate,
      previousPeriod: previousDate ?? null,
      metrics: current,
      previousMetrics: previous,
      changes,
      findingCount: findings.length,
    },
  }
}
