import type { AgentFindingInput, AgentSourceInput } from '@/lib/agents/types'
import { runTerritoryIntelligence, type TerritoryAgentRequest } from '@/lib/agents/territory-intelligence'

export type OpportunityAgentRequest = TerritoryAgentRequest & {
  mode?: 'all' | 'capture' | 'investment' | 'pricing_review'
  minimumConfidence?: number
}

type Territory = {
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function opportunityScore(item: Territory) {
  let score = item.confidence * 35

  if (item.signal === 'accelerating') score += 25
  if (item.signal === 'slowing') score += 18

  if (item.changes.absorption !== null) score += Math.max(-10, Math.min(15, item.changes.absorption))
  if (item.changes.inventory !== null) score += Math.max(-10, Math.min(15, -item.changes.inventory / 2))
  if (item.changes.daysOnMarket !== null) score += Math.max(-10, Math.min(15, -item.changes.daysOnMarket / 2))

  if (item.opportunity === 'investment' && item.changes.priceM2Uf !== null && item.changes.priceM2Uf <= 4) score += 10
  if (item.opportunity === 'pricing_review' && item.changes.daysOnMarket !== null && item.changes.daysOnMarket >= 10) score += 10

  return clamp(score)
}

function rationale(item: Territory) {
  const evidence = [
    item.changes.absorption === null ? null : `absorción ${item.changes.absorption >= 0 ? '+' : ''}${item.changes.absorption.toFixed(1)}%`,
    item.changes.inventory === null ? null : `inventario ${item.changes.inventory >= 0 ? '+' : ''}${item.changes.inventory.toFixed(1)}%`,
    item.changes.daysOnMarket === null ? null : `días en mercado ${item.changes.daysOnMarket >= 0 ? '+' : ''}${item.changes.daysOnMarket.toFixed(1)}%`,
    item.changes.priceM2Uf === null ? null : `UF/m² ${item.changes.priceM2Uf >= 0 ? '+' : ''}${item.changes.priceM2Uf.toFixed(1)}%`,
  ].filter(Boolean)

  return evidence.length ? evidence.join(', ') : 'sin períodos comparables suficientes'
}

function recommendedAction(item: Territory) {
  if (item.opportunity === 'capture') return 'Priorizar prospección y captación en el barrio antes de que aumente la competencia.'
  if (item.opportunity === 'investment') return 'Revisar activos con precio relativo atractivo y validar comparables antes de recomendar inversión.'
  if (item.opportunity === 'pricing_review') return 'Revisar precio, posicionamiento y exposición de los activos publicados en el barrio.'
  return 'Mantener monitoreo y esperar una señal más concluyente antes de actuar.'
}

export async function runOpportunityIntelligence(request: OpportunityAgentRequest = {}) {
  const territory = await runTerritoryIntelligence({
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
    limit: request.limit ?? 30,
  })

  const output = territory.output as {
    territories: Territory[]
    dataUniverses: Record<string, unknown>
    uncertainty: string
  }

  const minimumConfidence = Math.max(0, Math.min(1, request.minimumConfidence ?? 0.55))
  const mode = request.mode ?? 'all'

  const opportunities = output.territories
    .filter((item) => item.confidence >= minimumConfidence)
    .filter((item) => item.opportunity !== 'monitor')
    .filter((item) => mode === 'all' || item.opportunity === mode)
    .map((item) => ({
      id: `${item.neighborhood.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.currentPeriod}`,
      neighborhood: item.neighborhood,
      type: item.opportunity,
      score: opportunityScore(item),
      confidence: item.confidence,
      signal: item.signal,
      currentPeriod: item.currentPeriod,
      previousPeriod: item.previousPeriod,
      rationale: rationale(item),
      recommendedAction: recommendedAction(item),
      metrics: item.current,
      changes: item.changes,
      evidenceUniverse: 'external_market' as const,
    }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, Math.max(1, Math.min(request.limit ?? 12, 30)))

  const findings: AgentFindingInput[] = opportunities.map((item) => ({
    findingType: `opportunity_${item.type}`,
    title: `${item.neighborhood}: ${item.type === 'capture' ? 'oportunidad de captación' : item.type === 'investment' ? 'oportunidad de inversión' : 'revisión de precio requerida'}`,
    summary: `${item.rationale}. ${item.recommendedAction}`,
    severity: item.type === 'pricing_review' ? 'warning' : 'opportunity',
    confidence: item.confidence,
    evidence: [
      { metric: 'opportunity_score', value: item.score },
      { metric: 'territory_signal', value: item.signal },
      { metric: 'market_changes', value: item.changes },
    ],
    dimensions: {
      neighborhood: item.neighborhood,
      opportunityType: item.type,
      opportunityScore: item.score,
      currentPeriod: item.currentPeriod,
      previousPeriod: item.previousPeriod,
      evidenceUniverse: 'external_market',
    },
  }))

  const sources = territory.sources as AgentSourceInput[]
  const averageConfidence = opportunities.length
    ? opportunities.reduce((sum, item) => sum + item.confidence, 0) / opportunities.length
    : 0

  return {
    confidence: Math.round(averageConfidence * 10000) / 10000,
    findings,
    sources,
    output: {
      scope: 'Vitacura · oportunidades por barrio',
      mode,
      minimumConfidence,
      opportunityCount: opportunities.length,
      opportunities,
      dataUniverses: output.dataUniverses,
      methodology: 'Ranking explicable basado en liquidez territorial, absorción, inventario, días en mercado, presión de precio y calidad de evidencia externa.',
      governance: {
        crmIncluded: false,
        personalDataIncluded: false,
        automaticTransactionRecommendation: false,
        humanValidationRequired: true,
      },
      uncertainty: `${output.uncertainty} El score prioriza revisión humana y no constituye recomendación financiera ni tasación individual.`,
    },
  }
}
