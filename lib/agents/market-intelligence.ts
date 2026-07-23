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

type ConfidenceLevel = 'high' | 'medium' | 'low'
type MarketDirection = 'improving' | 'stable' | 'weakening' | 'insufficient_data'

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function percentageChange(current: number, previous: number) {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function average(rows: MarketRow[], key: keyof MarketRow) {
  const values = rows
    .map((row) => numberValue(row[key] as number | string | null))
    .filter((value) => value > 0)

  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function uniqueSources(rows: MarketRow[]) {
  return new Set(rows.map((row) => row.source).filter(Boolean)).size
}

function confidenceFor(rows: MarketRow[]) {
  const sampleScore = Math.min(1, rows.length / 24)
  const sourcedRows = rows.filter((row) => Boolean(row.source)).length
  const sourceScore = rows.length ? sourcedRows / rows.length : 0
  const datedRows = rows.filter((row) => Boolean(row.recorded_at || row.period_date)).length
  const dateScore = rows.length ? datedRows / rows.length : 0
  const diversityScore = Math.min(1, uniqueSources(rows) / 2)

  return Math.round((sampleScore * 0.35 + sourceScore * 0.25 + dateScore * 0.2 + diversityScore * 0.2) * 10000) / 10000
}

function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high'
  if (score >= 0.55) return 'medium'
  return 'low'
}

function sourceFreshness(rows: MarketRow[]) {
  const ages = rows
    .map((row) => row.recorded_at || `${row.period_date}T00:00:00.000Z`)
    .map((value) => Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
    .filter((value) => Number.isFinite(value) && value >= 0)

  if (!ages.length) return { status: 'unknown' as const, newestAgeDays: null, oldestAgeDays: null }

  const newestAgeDays = Math.min(...ages)
  const oldestAgeDays = Math.max(...ages)
  const status = newestAgeDays <= 30 ? 'current' : newestAgeDays <= 90 ? 'aging' : 'stale'

  return { status, newestAgeDays, oldestAgeDays }
}

function marketDirection(changes: {
  inventory: number | null
  absorption: number | null
  daysOnMarket: number | null
}): MarketDirection {
  const available = [changes.inventory, changes.absorption, changes.daysOnMarket].filter(
    (value): value is number => value !== null,
  )

  if (available.length < 2) return 'insufficient_data'

  let score = 0
  if (changes.inventory !== null) score += changes.inventory <= -5 ? 1 : changes.inventory >= 8 ? -1 : 0
  if (changes.absorption !== null) score += changes.absorption >= 5 ? 1 : changes.absorption <= -5 ? -1 : 0
  if (changes.daysOnMarket !== null) score += changes.daysOnMarket <= -8 ? 1 : changes.daysOnMarket >= 10 ? -1 : 0

  if (score >= 2) return 'improving'
  if (score <= -2) return 'weakening'
  return 'stable'
}

function pricePressure(changes: {
  avgPriceM2Uf: number | null
  inventory: number | null
  daysOnMarket: number | null
}) {
  if (changes.avgPriceM2Uf === null) return 'insufficient_data' as const

  if (
    changes.avgPriceM2Uf >= 4 &&
    (changes.inventory === null || changes.inventory <= 5) &&
    (changes.daysOnMarket === null || changes.daysOnMarket <= 5)
  ) {
    return 'upward' as const
  }

  if (
    changes.avgPriceM2Uf <= -4 ||
    (changes.inventory !== null && changes.inventory >= 10) ||
    (changes.daysOnMarket !== null && changes.daysOnMarket >= 12)
  ) {
    return 'downward' as const
  }

  return 'balanced' as const
}

function buildExecutiveSummary(input: {
  scope: string
  direction: MarketDirection
  pressure: 'upward' | 'downward' | 'balanced' | 'insufficient_data'
  confidence: ConfidenceLevel
  changes: {
    inventory: number | null
    absorption: number | null
    daysOnMarket: number | null
    avgPriceM2Uf: number | null
  }
}) {
  const directionText: Record<MarketDirection, string> = {
    improving: 'muestra una mejora de liquidez',
    stable: 'se mantiene sin cambios estructurales concluyentes',
    weakening: 'muestra señales de debilitamiento de liquidez',
    insufficient_data: 'no tiene períodos comparables suficientes para concluir una tendencia',
  }

  const pressureText = {
    upward: 'La presión de precios es alcista.',
    downward: 'La presión de precios es bajista o enfrenta resistencia.',
    balanced: 'La presión de precios se mantiene equilibrada.',
    insufficient_data: 'No existe evidencia suficiente para clasificar la presión de precios.',
  }[input.pressure]

  const evidence = [
    input.changes.inventory === null ? null : `inventario ${input.changes.inventory >= 0 ? '+' : ''}${input.changes.inventory.toFixed(1)}%`,
    input.changes.absorption === null ? null : `absorción ${input.changes.absorption >= 0 ? '+' : ''}${input.changes.absorption.toFixed(1)}%`,
    input.changes.daysOnMarket === null ? null : `días en mercado ${input.changes.daysOnMarket >= 0 ? '+' : ''}${input.changes.daysOnMarket.toFixed(1)}%`,
    input.changes.avgPriceM2Uf === null ? null : `UF/m² ${input.changes.avgPriceM2Uf >= 0 ? '+' : ''}${input.changes.avgPriceM2Uf.toFixed(1)}%`,
  ].filter(Boolean)

  return `${input.scope} ${directionText[input.direction]}. ${pressureText} Evidencia comparable: ${evidence.length ? evidence.join(', ') : 'no disponible'}. Confianza ${input.confidence}.`
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
        scope: request.neighborhood || 'Vitacura',
        sampleSize: 0,
        dataUniverses: {
          market: { included: true, records: 0 },
          crm: { included: false, records: 0 },
        },
        uncertainty: 'No existen registros externos de mercado para los filtros seleccionados.',
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
  const confidenceBand = confidenceLevel(confidence)
  const freshness = sourceFreshness(rows)
  const direction = marketDirection(changes)
  const pressure = pricePressure(changes)
  const findings: AgentFindingInput[] = []
  const scope = request.neighborhood || 'Vitacura'

  if (changes.inventory !== null && Math.abs(changes.inventory) >= 8) {
    findings.push({
      findingType: changes.inventory > 0 ? 'inventory_increase' : 'inventory_decrease',
      title: `${changes.inventory > 0 ? 'Aumento' : 'Disminución'} relevante de inventario`,
      summary: `El inventario promedio de ${scope} cambió ${changes.inventory.toFixed(1)}% frente al período anterior.`,
      severity: changes.inventory > 0 ? 'warning' : 'opportunity',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.inventory, evidenceUniverse: 'external_market' },
    })
  }

  if (changes.absorption !== null && Math.abs(changes.absorption) >= 5) {
    findings.push({
      findingType: changes.absorption > 0 ? 'absorption_increase' : 'absorption_decrease',
      title: `${changes.absorption > 0 ? 'Mejora' : 'Deterioro'} de absorción`,
      summary: `La absorción promedio de ${scope} cambió ${changes.absorption.toFixed(1)}% frente al período anterior.`,
      severity: changes.absorption > 0 ? 'opportunity' : 'warning',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.absorption, evidenceUniverse: 'external_market' },
    })
  }

  if (changes.avgPriceM2Uf !== null && Math.abs(changes.avgPriceM2Uf) >= 4) {
    findings.push({
      findingType: changes.avgPriceM2Uf > 0 ? 'price_m2_increase' : 'price_m2_decrease',
      title: 'Cambio relevante en precio UF/m²',
      summary: `El precio promedio por m² en ${scope} cambió ${changes.avgPriceM2Uf.toFixed(1)}% frente al período anterior.`,
      severity: changes.avgPriceM2Uf > 0 ? 'opportunity' : 'warning',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.avgPriceM2Uf, evidenceUniverse: 'external_market' },
    })
  }

  if (changes.daysOnMarket !== null && Math.abs(changes.daysOnMarket) >= 10) {
    findings.push({
      findingType: changes.daysOnMarket > 0 ? 'days_on_market_increase' : 'days_on_market_decrease',
      title: `${changes.daysOnMarket > 0 ? 'Mayor' : 'Menor'} tiempo de publicación`,
      summary: `Los días promedio en mercado de ${scope} cambiaron ${changes.daysOnMarket.toFixed(1)}% frente al período anterior.`,
      severity: changes.daysOnMarket > 0 ? 'warning' : 'opportunity',
      confidence,
      dimensions: { scope, currentDate, previousDate, changePercent: changes.daysOnMarket, evidenceUniverse: 'external_market' },
    })
  }

  if (freshness.status === 'stale') {
    findings.push({
      findingType: 'market_data_stale',
      title: 'Datos de mercado desactualizados',
      summary: `La observación más reciente tiene ${freshness.newestAgeDays} días. Las conclusiones no deben tratarse como estado actual del mercado.`,
      severity: 'warning',
      confidence,
      dimensions: { scope, newestAgeDays: freshness.newestAgeDays, evidenceUniverse: 'external_market' },
    })
  }

  if (!findings.length) {
    findings.push({
      findingType: 'market_stable',
      title: 'Mercado sin variaciones críticas',
      summary: `No se detectaron cambios por sobre los umbrales operativos para ${scope}.`,
      severity: 'info',
      confidence,
      dimensions: { scope, currentDate, previousDate, evidenceUniverse: 'external_market' },
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
        metadata: {
          evidenceUniverse: 'external_market',
          rows: rows.filter((candidate) => (candidate.source || 'market_data') === sourceName).length,
        },
      })
    }
  }

  const comparablePeriodsAvailable = Boolean(previousDate)
  const uncertainty = comparablePeriodsAvailable
    ? `Las métricas representan promedios de registros externos disponibles. No incluyen CRM, cierres internos ni equivalen por sí solas a transacciones confirmadas.`
    : `Sólo existe un período disponible. Se muestran niveles actuales, pero no puede inferirse una tendencia temporal confiable.`

  return {
    confidence,
    findings,
    sources: [...sourceMap.values()],
    output: {
      scope,
      sampleSize: rows.length,
      currentPeriod: currentDate,
      previousPeriod: previousDate ?? null,
      comparablePeriodsAvailable,
      dataUniverses: {
        market: {
          included: true,
          records: rows.length,
          sourceCount: uniqueSources(rows),
          latestPeriod: currentDate,
        },
        crm: {
          included: false,
          records: 0,
          reason: 'El agente de mercado no consulta ni combina datos CRM.',
        },
      },
      marketHealth: {
        direction,
        liquiditySignal: direction,
        pricePressure: pressure,
      },
      metrics: current,
      previousMetrics: previous,
      changes,
      freshness,
      confidence: {
        score: confidence,
        level: confidenceBand,
      },
      executiveSummary: buildExecutiveSummary({
        scope,
        direction,
        pressure,
        confidence: confidenceBand,
        changes,
      }),
      uncertainty,
      findingCount: findings.length,
    },
  }
}
