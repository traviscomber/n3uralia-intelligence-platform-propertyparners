import { createClient } from '@/lib/supabase/server'
import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'

export type ListingAgentRequest = {
  propertyId?: number
  neighborhood?: string
  status?: string
  limit?: number
  minimumConfidence?: number
}

type PropertyRow = {
  id: number
  address: string
  neighborhood_id: number | null
  area_m2: number | string | null
  sqm: number | string | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  quality_score: number | string | null
  construction_year: number | null
  list_price_uf: number | string | null
  price_uf: number | string | null
  status: string | null
  days_on_market: number | null
  source: string | null
  external_id: string | null
  created_at: string | null
  updated_at: string | null
  neighborhoods: { name: string | null } | null
}

type MarketRow = {
  neighborhood: string | null
  period_date: string
  avg_price_m2_uf: number | string | null
  avg_days_on_market: number | string | null
  source: string | null
  source_url: string | null
  recorded_at: string | null
}

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function median(values: number[]) {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function percentDifference(value: number, reference: number) {
  if (!reference) return null
  return ((value - reference) / Math.abs(reference)) * 100
}

function listingPriceUf(row: PropertyRow) {
  return numeric(row.list_price_uf) || numeric(row.price_uf)
}

function listingArea(row: PropertyRow) {
  return numeric(row.area_m2) || numeric(row.sqm)
}

function confidenceFor(input: {
  property: PropertyRow
  comparableCount: number
  externalMarketAvailable: boolean
}) {
  const completeness = [
    listingPriceUf(input.property) > 0,
    listingArea(input.property) > 0,
    Boolean(input.property.neighborhoods?.name),
    input.property.days_on_market !== null,
    Boolean(input.property.source),
  ].filter(Boolean).length / 5

  const comparableScore = Math.min(1, input.comparableCount / 8)
  const externalScore = input.externalMarketAvailable ? 1 : 0
  return Math.round((completeness * 0.45 + comparableScore * 0.35 + externalScore * 0.2) * 10000) / 10000
}

function pricingPosition(deviation: number | null) {
  if (deviation === null) return 'insufficient_data' as const
  if (deviation >= 12) return 'materially_above_market' as const
  if (deviation >= 5) return 'above_market' as const
  if (deviation <= -12) return 'materially_below_market' as const
  if (deviation <= -5) return 'below_market' as const
  return 'aligned' as const
}

function liquidityRisk(input: {
  pricingDeviation: number | null
  daysDeviation: number | null
  daysOnMarket: number
}) {
  let score = 0
  if (input.pricingDeviation !== null) score += Math.max(0, Math.min(45, input.pricingDeviation * 2))
  if (input.daysDeviation !== null) score += Math.max(0, Math.min(35, input.daysDeviation))
  if (input.daysOnMarket >= 90) score += 20
  else if (input.daysOnMarket >= 60) score += 12
  else if (input.daysOnMarket >= 30) score += 5
  return clamp(score)
}

function recommendedStrategy(input: {
  position: ReturnType<typeof pricingPosition>
  risk: number
  pricingDeviation: number | null
}) {
  if (input.position === 'materially_above_market') {
    return {
      action: 'urgent_price_review',
      message: 'Revisar precio de publicación con comparables equivalentes antes de aumentar inversión comercial.',
      suggestedAdjustmentPercent: input.pricingDeviation === null ? null : -Math.min(10, Math.max(3, input.pricingDeviation - 3)),
    }
  }
  if (input.position === 'above_market' || input.risk >= 60) {
    return {
      action: 'price_and_positioning_review',
      message: 'Validar atributos diferenciales, calidad del aviso y precio frente a comparables del mismo barrio.',
      suggestedAdjustmentPercent: input.pricingDeviation === null ? null : -Math.min(6, Math.max(1, input.pricingDeviation - 2)),
    }
  }
  if (input.position === 'below_market') {
    return {
      action: 'verify_value_capture',
      message: 'Verificar estado, documentación y posibles atributos omitidos antes de concluir que existe descuento real.',
      suggestedAdjustmentPercent: null,
    }
  }
  return {
    action: 'maintain_and_monitor',
    message: 'Mantener estrategia actual y monitorear cambios en inventario, absorción y tiempo en mercado.',
    suggestedAdjustmentPercent: null,
  }
}

export async function runListingIntelligence(request: ListingAgentRequest = {}) {
  const supabase = await createClient()
  const limit = Math.max(1, Math.min(request.limit ?? 25, 100))

  let propertyQuery = supabase
    .from('properties')
    .select('id, address, neighborhood_id, area_m2, sqm, bedrooms, bathrooms, parking_spaces, quality_score, construction_year, list_price_uf, price_uf, status, days_on_market, source, external_id, created_at, updated_at, neighborhoods(name)')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (request.propertyId) propertyQuery = propertyQuery.eq('id', request.propertyId)
  if (request.status) propertyQuery = propertyQuery.eq('status', request.status)
  if (request.neighborhood) propertyQuery = propertyQuery.eq('neighborhoods.name', request.neighborhood)

  const [{ data: propertiesData, error: propertiesError }, { data: marketData, error: marketError }] = await Promise.all([
    propertyQuery,
    supabase
      .from('market_data')
      .select('neighborhood, period_date, avg_price_m2_uf, avg_days_on_market, source, source_url, recorded_at')
      .order('period_date', { ascending: false })
      .limit(1200),
  ])

  if (propertiesError) throw propertiesError
  if (marketError) throw marketError

  const properties = (propertiesData ?? []) as unknown as PropertyRow[]
  const marketRows = (marketData ?? []) as MarketRow[]
  const minimumConfidence = Math.max(0, Math.min(1, request.minimumConfidence ?? 0.5))

  const analyzed = properties.map((property) => {
    const neighborhood = property.neighborhoods?.name || 'Sin barrio asignado'
    const priceUf = listingPriceUf(property)
    const areaM2 = listingArea(property)
    const priceM2Uf = priceUf > 0 && areaM2 > 0 ? priceUf / areaM2 : 0

    const comparableProperties = properties.filter((candidate) => {
      if (candidate.id === property.id) return false
      if (candidate.neighborhoods?.name !== property.neighborhoods?.name) return false
      const candidateArea = listingArea(candidate)
      if (!areaM2 || !candidateArea) return false
      return Math.abs(candidateArea - areaM2) / areaM2 <= 0.25
    })

    const comparablePriceM2 = median(
      comparableProperties.map((candidate) => {
        const candidateArea = listingArea(candidate)
        const candidatePrice = listingPriceUf(candidate)
        return candidateArea > 0 ? candidatePrice / candidateArea : 0
      }),
    )

    const neighborhoodMarketRows = marketRows.filter((row) => row.neighborhood === property.neighborhoods?.name)
    const latestPeriod = [...new Set(neighborhoodMarketRows.map((row) => row.period_date))].sort().reverse()[0]
    const latestMarketRows = latestPeriod
      ? neighborhoodMarketRows.filter((row) => row.period_date === latestPeriod)
      : []
    const externalPriceM2 = median(latestMarketRows.map((row) => numeric(row.avg_price_m2_uf)))
    const externalDays = median(latestMarketRows.map((row) => numeric(row.avg_days_on_market)))

    const referencePriceM2 = externalPriceM2 || comparablePriceM2
    const referenceDays = externalDays || median(comparableProperties.map((candidate) => numeric(candidate.days_on_market)))
    const pricingDeviation = percentDifference(priceM2Uf, referencePriceM2)
    const daysDeviation = percentDifference(numeric(property.days_on_market), referenceDays)
    const position = pricingPosition(pricingDeviation)
    const risk = liquidityRisk({
      pricingDeviation,
      daysDeviation,
      daysOnMarket: numeric(property.days_on_market),
    })
    const confidence = confidenceFor({
      property,
      comparableCount: comparableProperties.length,
      externalMarketAvailable: externalPriceM2 > 0,
    })
    const strategy = recommendedStrategy({ position, risk, pricingDeviation })

    return {
      propertyId: property.id,
      address: property.address,
      neighborhood,
      source: property.source,
      externalId: property.external_id,
      status: property.status,
      priceUf,
      areaM2,
      priceM2Uf: Math.round(priceM2Uf * 100) / 100,
      reference: {
        priceM2Uf: Math.round(referencePriceM2 * 100) / 100,
        daysOnMarket: Math.round(referenceDays),
        comparableListings: comparableProperties.length,
        externalMarketPeriod: latestPeriod ?? null,
        preferredUniverse: externalPriceM2 > 0 ? 'external_market_snapshot' : 'external_listing_comparables',
      },
      assessment: {
        pricingPosition: position,
        pricingDeviationPercent: pricingDeviation === null ? null : Math.round(pricingDeviation * 10) / 10,
        daysOnMarketDeviationPercent: daysDeviation === null ? null : Math.round(daysDeviation * 10) / 10,
        liquidityRiskScore: risk,
      },
      strategy,
      confidence,
      uncertainty: referencePriceM2
        ? 'La referencia compara oferta publicada; no representa necesariamente precio de cierre ni una tasación formal.'
        : 'No existen comparables suficientes para evaluar posicionamiento de precio.',
    }
  })

  const listings = analyzed
    .filter((item) => item.confidence >= minimumConfidence)
    .sort((a, b) => b.assessment.liquidityRiskScore - a.assessment.liquidityRiskScore || b.confidence - a.confidence)

  const findings: AgentFindingInput[] = listings
    .filter((item) => item.assessment.liquidityRiskScore >= 45 || item.assessment.pricingPosition === 'materially_below_market')
    .map((item) => ({
      findingType: item.assessment.pricingPosition === 'materially_below_market' ? 'listing_value_review' : 'listing_liquidity_risk',
      title: `${item.address}: ${item.assessment.pricingPosition === 'materially_below_market' ? 'posible descuento a verificar' : 'riesgo comercial elevado'}`,
      summary: `${item.strategy.message} Desviación de precio: ${item.assessment.pricingDeviationPercent ?? 'sin referencia'}%. Riesgo de liquidez: ${item.assessment.liquidityRiskScore}/100.`,
      severity: item.assessment.pricingPosition === 'materially_below_market' ? 'opportunity' : 'warning',
      confidence: item.confidence,
      evidence: [
        { metric: 'listing_price_m2_uf', value: item.priceM2Uf },
        { metric: 'reference_price_m2_uf', value: item.reference.priceM2Uf },
        { metric: 'comparable_listing_count', value: item.reference.comparableListings },
      ],
      dimensions: {
        propertyId: item.propertyId,
        neighborhood: item.neighborhood,
        pricingPosition: item.assessment.pricingPosition,
        liquidityRiskScore: item.assessment.liquidityRiskScore,
        evidenceUniverse: 'external_listing_and_market',
      },
    }))

  const sourceMap = new Map<string, AgentSourceInput>()
  for (const property of properties) {
    const sourceName = property.source || 'properties'
    const key = `listing:${sourceName}`
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        sourceType: 'external_listing_dataset',
        sourceName,
        sourceTable: 'properties',
        observedAt: property.updated_at || property.created_at,
        freshnessStatus: 'unknown',
        metadata: { evidenceUniverse: 'external_listing' },
      })
    }
  }
  for (const row of marketRows) {
    const sourceName = row.source || 'market_data'
    const key = `market:${sourceName}:${row.source_url || ''}`
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
        metadata: { evidenceUniverse: 'external_market' },
      })
    }
  }

  const averageConfidence = listings.length
    ? listings.reduce((sum, item) => sum + item.confidence, 0) / listings.length
    : 0

  return {
    confidence: Math.round(averageConfidence * 10000) / 10000,
    findings,
    sources: [...sourceMap.values()],
    output: {
      scope: request.propertyId ? `Propiedad ${request.propertyId}` : request.neighborhood || 'Listings disponibles',
      listingCount: listings.length,
      minimumConfidence,
      listings,
      dataUniverses: {
        externalListings: { included: true, records: properties.length },
        externalMarket: { included: true, records: marketRows.length },
        crm: { included: false, records: 0 },
        closedTransactions: { included: false, records: 0 },
      },
      governance: {
        formalValuation: false,
        saleProbabilityClaimed: false,
        automaticPriceChangeAllowed: false,
        humanValidationRequired: true,
      },
      methodology: 'Evaluación explicable de precio ofertado por m², tiempo en mercado y comparables externos del mismo barrio y tamaño aproximado.',
      uncertainty: 'Sin datos históricos de cierres y resultados reales, el agente no estima probabilidades de venta ni tiempos futuros como hechos estadísticos.',
    },
  }
}
