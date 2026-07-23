import { createN3uraliaProjectCanon } from '@/lib/n3uralia-canon'

export const PROPERTY_PARTNERS_CANON = createN3uraliaProjectCanon({
  id: 'property-partners',
  name: 'Property Partners Intelligence Platform',
  category: 'real_estate',
  clientFacingBrand: 'Property Partners',
  engineVisibility: 'powered_by',
})

export const PROPERTY_PARTNERS_DOMAIN_AGENTS = [
  {
    id: 'executive-agent',
    role: 'executive',
    mission: 'Synthesize the strongest available explanation and translate it into decision-ready guidance for executives.',
  },
  {
    id: 'research-agent',
    role: 'research',
    mission: 'Continuously investigate market, economic, regulatory and territorial evidence beyond client-provided information.',
  },
  {
    id: 'market-agent',
    role: 'market',
    mission: 'Interpret supply, demand, absorption, pricing, competition and territorial movement independently of the client CRM.',
  },
  {
    id: 'economy-agent',
    role: 'economy',
    mission: 'Connect rates, inflation, UF, credit availability, employment and construction conditions to real-estate outcomes.',
  },
  {
    id: 'valuation-agent',
    role: 'domain_specialist',
    mission: 'Produce explainable valuation ranges from comparable evidence, market context and explicit uncertainty.',
  },
  {
    id: 'crm-agent',
    role: 'operations',
    mission: 'Analyze leads, listings, pipeline, sales, attribution and operational quality as one evidence universe, not as market truth.',
  },
  {
    id: 'opportunity-agent',
    role: 'opportunity',
    mission: 'Proactively discover commercial, territorial, pricing and acquisition opportunities before the user asks.',
  },
  {
    id: 'risk-agent',
    role: 'risk',
    mission: 'Detect weakening liquidity, pricing errors, concentration, stale inventory, incomplete attribution and unsupported conclusions.',
  },
  {
    id: 'strategy-agent',
    role: 'strategy',
    mission: 'Challenge assumptions and choose the most defensible course of action across conflicting signals.',
  },
  {
    id: 'publisher-agent',
    role: 'publisher',
    mission: 'Communicate the same intelligence appropriately to CEO, director, seller, investor or external stakeholder without changing its evidentiary basis.',
  },
  {
    id: 'governance-agent',
    role: 'governance',
    mission: 'Enforce lineage, freshness, privacy, uncertainty, human approval and separation between evidence, inference and opinion.',
  },
] as const

export const PROPERTY_PARTNERS_EXTERNAL_SIGNAL_REGISTRY = [
  {
    id: 'market.listing-supply',
    domain: 'market',
    label: 'Oferta publicada',
    required: true,
    expectedCadence: 'daily',
    purpose: 'Measure active supply, additions, withdrawals, concentration and competitive pressure.',
  },
  {
    id: 'market.transaction-evidence',
    domain: 'market',
    label: 'Evidencia de transacciones',
    required: true,
    expectedCadence: 'monthly',
    purpose: 'Anchor price and liquidity conclusions in observed transactions rather than asking prices alone.',
  },
  {
    id: 'market.asking-prices',
    domain: 'market',
    label: 'Precios de publicación',
    required: true,
    expectedCadence: 'daily',
    purpose: 'Track seller expectations, repricing and competitive positioning.',
  },
  {
    id: 'market.absorption',
    domain: 'market',
    label: 'Absorción y velocidad',
    required: true,
    expectedCadence: 'weekly',
    purpose: 'Estimate how quickly available inventory is being absorbed by segment and territory.',
  },
  {
    id: 'market.time-on-market',
    domain: 'market',
    label: 'Tiempo en mercado',
    required: true,
    expectedCadence: 'weekly',
    purpose: 'Identify liquidity changes, stale supply and pricing resistance.',
  },
  {
    id: 'economy.mortgage-rates',
    domain: 'economy',
    label: 'Tasas hipotecarias',
    required: true,
    expectedCadence: 'weekly',
    purpose: 'Estimate affordability pressure, financing sensitivity and probable demand movement.',
  },
  {
    id: 'economy.uf-inflation',
    domain: 'economy',
    label: 'UF e inflación',
    required: true,
    expectedCadence: 'daily',
    purpose: 'Normalize values and interpret real purchasing-power and financing effects.',
  },
  {
    id: 'territory.permits',
    domain: 'territory',
    label: 'Permisos y nueva construcción',
    required: true,
    expectedCadence: 'monthly',
    purpose: 'Anticipate future supply and structural changes in local competition.',
  },
  {
    id: 'territory.development',
    domain: 'territory',
    label: 'Desarrollo territorial',
    required: true,
    expectedCadence: 'monthly',
    purpose: 'Connect infrastructure, zoning and amenity changes to future demand and value.',
  },
  {
    id: 'competition.activity',
    domain: 'competition',
    label: 'Actividad competitiva',
    required: true,
    expectedCadence: 'weekly',
    purpose: 'Detect changes in stock, positioning, pricing, marketing and market-share pressure.',
  },
] as const

export const PROPERTY_PARTNERS_DECISION_POLICIES = {
  publishValuation: {
    impact: 'high',
    humanApprovalRequired: true,
    minimumRequirements: [
      'comparable evidence lineage',
      'market freshness declaration',
      'valuation range rather than false precision',
      'uncertainty statement',
      'separation of observed and inferred values',
    ],
  },
  changePricing: {
    impact: 'high',
    humanApprovalRequired: true,
    minimumRequirements: [
      'current competitive supply',
      'time-on-market evidence',
      'absorption context',
      'client objective and constraints',
    ],
  },
  recommendAcquisitionOrSale: {
    impact: 'high',
    humanApprovalRequired: true,
    minimumRequirements: [
      'market evidence',
      'risk analysis',
      'scenario comparison',
      'explicit assumptions',
      'confidence level',
    ],
  },
  allocateCommercialBudget: {
    impact: 'high',
    humanApprovalRequired: true,
    minimumRequirements: [
      'attribution quality assessment',
      'pipeline evidence',
      'market opportunity evidence',
      'expected outcome and downside',
    ],
  },
} as const

export function getPropertyPartnersCanon() {
  return {
    ...PROPERTY_PARTNERS_CANON,
    domainAgents: PROPERTY_PARTNERS_DOMAIN_AGENTS,
    externalSignals: PROPERTY_PARTNERS_EXTERNAL_SIGNAL_REGISTRY,
    decisionPolicies: PROPERTY_PARTNERS_DECISION_POLICIES,
  }
}
