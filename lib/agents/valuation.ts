import { createClient } from '@/lib/supabase/server'
import { calculateDeterministicValuation, type ValuationInput } from '@/lib/valuation-model'
import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'

type ComparableRow = {
  id: string
  address: string | null
  neighborhood: string | null
  property_type: string | null
  price_uf: number | string | null
  area_m2: number | string | null
  bedrooms: number | null
  bathrooms: number | null
  days_on_market: number | null
  source: string | null
  source_url: string | null
  created_at: string | null
}

type ValuationAgentInput = {
  propertyId?: string
  neighborhood?: string
  propertyType: 'Casa' | 'Departamento'
  valuation: ValuationInput
  comparableLimit?: number
}

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function median(values: number[]) {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

function quantile(values: number[], percentile: number) {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const index = (ordered.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return ordered[lower]
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)
}

function normalizePropertyType(value: string | null) {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized.includes('casa')) return 'Casa'
  if (normalized.includes('depart')) return 'Departamento'
  return value || ''
}

function comparableUfM2(row: ComparableRow) {
  const price = numeric(row.price_uf)
  const area = numeric(row.area_m2)
  return price > 0 && area > 0 ? price / area : 0
}

function freshness(createdAt: string | null) {
  if (!createdAt) return 'unknown' as const
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  return ageDays <= 180 ? 'current' as const : 'stale' as const
}

export async function runValuationAnalysis(input: ValuationAgentInput) {
  const supabase = await createClient()
  const requestedLimit = Math.min(Math.max(input.comparableLimit ?? 12, 3), 30)
  let neighborhood = input.neighborhood?.trim() || ''
  let subject: ComparableRow | null = null

  if (input.propertyId) {
    const { data, error } = await supabase
      .from('properties')
      .select('id,address,neighborhood,property_type,price_uf,area_m2,bedrooms,bathrooms,days_on_market,source,source_url,created_at')
      .eq('id', input.propertyId)
      .maybeSingle()
    if (error) throw error
    subject = data as ComparableRow | null
    neighborhood ||= subject?.neighborhood || ''
  }

  let query = supabase
    .from('properties')
    .select('id,address,neighborhood,property_type,price_uf,area_m2,bedrooms,bathrooms,days_on_market,source,source_url,created_at')
    .not('price_uf', 'is', null)
    .gt('price_uf', 0)
    .not('area_m2', 'is', null)
    .gt('area_m2', 0)
    .order('created_at', { ascending: false })
    .limit(150)

  if (neighborhood) query = query.ilike('neighborhood', neighborhood)
  if (input.propertyId) query = query.neq('id', input.propertyId)

  const { data, error } = await query
  if (error) throw error

  const candidates = ((data || []) as ComparableRow[])
    .filter((row) => normalizePropertyType(row.property_type) === input.propertyType)
    .map((row) => ({ ...row, uf_m2: comparableUfM2(row) }))
    .filter((row) => row.uf_m2 > 0)

  const subjectArea = input.propertyType === 'Casa'
    ? input.valuation.propertyType === 'Casa' ? input.valuation.builtAreaM2 : 0
    : input.valuation.propertyType === 'Departamento' ? input.valuation.usefulAreaM2 : 0

  const ranked = candidates
    .map((row) => ({
      ...row,
      area_gap: subjectArea > 0 ? Math.abs(numeric(row.area_m2) - subjectArea) / subjectArea : 0,
    }))
    .sort((a, b) => a.area_gap - b.area_gap || numeric(a.days_on_market) - numeric(b.days_on_market))
    .slice(0, requestedLimit)

  const ufM2Values = ranked.map((row) => row.uf_m2)
  const marketMedianUfM2 = median(ufM2Values)
  const marketLowUfM2 = quantile(ufM2Values, 0.25)
  const marketHighUfM2 = quantile(ufM2Values, 0.75)
  const valuation = calculateDeterministicValuation(input.valuation)

  const appliedUfM2 = input.valuation.propertyType === 'Casa'
    ? input.valuation.builtUfM2
    : input.valuation.appliedUsefulUfM2
  const deviation = marketMedianUfM2 > 0 ? (appliedUfM2 - marketMedianUfM2) / marketMedianUfM2 : null

  const approvedMarketFindings = await supabase
    .from('agent_findings')
    .select('id,title,summary,severity,confidence,dimensions,created_at,agent_runs!inner(agent_key)')
    .eq('approval_status', 'approved')
    .eq('agent_runs.agent_key', 'market_intelligence')
    .order('created_at', { ascending: false })
    .limit(10)

  if (approvedMarketFindings.error) throw approvedMarketFindings.error

  const sourceCoverage = ranked.filter((row) => row.source).length / Math.max(ranked.length, 1)
  const freshCoverage = ranked.filter((row) => freshness(row.created_at) === 'current').length / Math.max(ranked.length, 1)
  const countScore = Math.min(ranked.length / 8, 1)
  const spread = marketMedianUfM2 > 0 ? (marketHighUfM2 - marketLowUfM2) / marketMedianUfM2 : 1
  const consistencyScore = Math.max(0, 1 - Math.min(spread, 1))
  const confidence = Math.max(0.15, Math.min(0.95,
    countScore * 0.35 + sourceCoverage * 0.2 + freshCoverage * 0.2 + consistencyScore * 0.25,
  ))

  const sources: AgentSourceInput[] = ranked.map((row) => ({
    sourceType: 'property_comparable',
    sourceName: row.source || 'Propiedad registrada',
    sourceUrl: row.source_url,
    sourceTable: 'properties',
    sourceRecordId: row.id,
    observedAt: row.created_at,
    freshnessStatus: freshness(row.created_at),
    metadata: {
      address: row.address,
      neighborhood: row.neighborhood,
      propertyType: row.property_type,
      priceUf: numeric(row.price_uf),
      areaM2: numeric(row.area_m2),
      ufM2: Math.round(row.uf_m2 * 10) / 10,
      areaGap: Math.round(row.area_gap * 1000) / 1000,
    },
  }))

  const findings: AgentFindingInput[] = []
  findings.push({
    findingType: 'valuation_result',
    title: `Valorización estimada: ${Math.round(valuation.commercialValueUf).toLocaleString('es-CL')} UF`,
    summary: `Resultado determinístico basado en ${ranked.length} comparables seleccionados. Rango de referencia UF/m²: ${marketLowUfM2.toFixed(1)}–${marketHighUfM2.toFixed(1)}.`,
    severity: 'info',
    confidence,
    evidence: ranked.map((row) => row.id),
    dimensions: {
      propertyId: input.propertyId || null,
      neighborhood: neighborhood || null,
      propertyType: input.propertyType,
      commercialValueUf: valuation.commercialValueUf,
      effectiveAreaM2: valuation.effectiveAreaM2,
      appliedUfM2,
      marketMedianUfM2,
      marketLowUfM2,
      marketHighUfM2,
    },
  })

  if (deviation !== null && Math.abs(deviation) >= 0.15) {
    findings.push({
      findingType: 'applied_rate_deviation',
      title: deviation > 0 ? 'UF/m² aplicado sobre la mediana comparable' : 'UF/m² aplicado bajo la mediana comparable',
      summary: `La tasa aplicada se desvía ${(Math.abs(deviation) * 100).toFixed(1)}% respecto de la mediana de comparables. Requiere revisión antes de aprobación.`,
      severity: Math.abs(deviation) >= 0.3 ? 'warning' : 'info',
      confidence,
      evidence: ranked.map((row) => row.id),
      dimensions: { deviation, appliedUfM2, marketMedianUfM2 },
    })
  }

  if (ranked.length < 5) {
    findings.push({
      findingType: 'limited_comparable_coverage',
      title: 'Cobertura limitada de comparables',
      summary: `Solo se encontraron ${ranked.length} comparables válidos para el segmento seleccionado.`,
      severity: 'warning',
      confidence,
      evidence: ranked.map((row) => row.id),
      dimensions: { comparableCount: ranked.length },
    })
  }

  return {
    subject,
    valuation,
    comparableSummary: {
      count: ranked.length,
      medianUfM2: Math.round(marketMedianUfM2 * 10) / 10,
      lowUfM2: Math.round(marketLowUfM2 * 10) / 10,
      highUfM2: Math.round(marketHighUfM2 * 10) / 10,
      appliedUfM2,
      deviation,
    },
    comparables: ranked,
    approvedMarketFindings: approvedMarketFindings.data || [],
    confidence: Math.round(confidence * 10000) / 10000,
    sources,
    findings,
    limitations: [
      'La selección usa coincidencia de barrio, tipo y cercanía de superficie; no sustituye revisión profesional.',
      'La base properties no contiene todos los atributos físicos necesarios para ajustes automáticos finos.',
      'Los precios observados pueden ser precios de publicación y no cierres efectivos.',
    ],
  }
}
