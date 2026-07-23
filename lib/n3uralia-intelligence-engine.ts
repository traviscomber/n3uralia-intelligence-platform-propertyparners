import {
  CRM_INTELLIGENCE,
  getDataQuality,
  getOperationalSummary,
  getYtdSummary,
} from '@/lib/crm-snapshot'
import {
  getBranchSalesYtdPerformance,
  getCompanySalesCompliance,
} from '@/lib/targets-2026'

export type IntelligenceAudience = 'ceo' | 'director' | 'seller' | 'system'
export type IntelligenceDomain = 'executive' | 'crm' | 'market' | 'valuation' | 'reports'
export type IntelligenceSourceClass =
  | 'client_evidence'
  | 'external_market'
  | 'n3uralia_model'
  | 'n3uralia_inference'

export type IntelligenceEvidence = {
  id: string
  domain: IntelligenceDomain
  sourceClass: IntelligenceSourceClass
  label: string
  value: string | number | null
  period: string | null
  source: string
  methodology: string
}

export type IntelligenceSignal = {
  id: string
  domain: IntelligenceDomain
  sourceClass: Exclude<IntelligenceSourceClass, 'client_evidence'>
  title: string
  interpretation: string
  evidenceIds: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type IntelligenceRisk = {
  id: string
  domain: IntelligenceDomain
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  evidenceIds: string[]
}

export type IntelligenceAction = {
  id: string
  audience: Exclude<IntelligenceAudience, 'system'>
  priority: 'high' | 'medium' | 'low'
  title: string
  rationale: string
  action: string
  domain: IntelligenceDomain
  evidenceIds: string[]
  origin: 'n3uralia_agent'
  href: string
}

export type N3uraliaIntelligenceContext = {
  schemaVersion: 1
  engine: {
    owner: 'N3uralia'
    productRole: 'proprietary_intelligence_engine'
    clientOwnsEngine: false
    clientDataIsOneInputOnly: true
    autonomousProcessingEnabled: true
    mission: string
  }
  generatedAt: string
  audience: IntelligenceAudience
  scope: {
    commune: string
    operation: string
    propertyTypes: string[]
    periodStart: string
    periodEnd: string
  }
  evidence: IntelligenceEvidence[]
  signals: IntelligenceSignal[]
  risks: IntelligenceRisk[]
  actions: IntelligenceAction[]
  governance: {
    piiIncluded: false
    syntheticScoreAllowed: false
    universesMustRemainSeparate: true
    clientEvidenceMayNotDefineTruthAlone: true
    externalMarketResearchRequiredForMarketClaims: true
    inferenceMustDeclareEvidence: true
    operatingPrinciple: string
  }
}

const DOMAIN_LINKS: Record<IntelligenceDomain, string> = {
  executive: '/dashboard/ceo',
  crm: '/dashboard/datos-crm',
  market: '/dashboard/market',
  valuation: '/dashboard/valorizador',
  reports: '/dashboard/reportes/autonomos',
}

function buildClientEvidence(): IntelligenceEvidence[] {
  const ytd = getYtdSummary()
  const operational = getOperationalSummary()
  const quality = getDataQuality()
  const compliance = getCompanySalesCompliance('2026-06')
  const branches = getBranchSalesYtdPerformance('2026-06')
  const attributedSales = branches.reduce((sum, branch) => sum + branch.actualSales, 0)

  return [
    {
      id: 'client.crm.sales-ytd',
      domain: 'crm',
      sourceClass: 'client_evidence',
      label: 'Ventas acumuladas',
      value: ytd.salesCount,
      period: '2026-01/2026-06',
      source: 'CRM del cliente · fuente autoritativa disponible',
      methodology: 'Conteo de cierres aceptados dentro del alcance operacional declarado.',
    },
    {
      id: 'client.crm.sales-uf-ytd',
      domain: 'crm',
      sourceClass: 'client_evidence',
      label: 'UF vendidas acumuladas',
      value: ytd.salesUf,
      period: '2026-01/2026-06',
      source: 'CRM del cliente · fuente autoritativa disponible',
      methodology: 'Suma de UF presentes en registros aceptados; no se imputan valores ausentes.',
    },
    {
      id: 'client.crm.lead-to-sale-proxy',
      domain: 'crm',
      sourceClass: 'client_evidence',
      label: 'Proxy mensual cierres / leads',
      value: operational.leadToSaleProxy,
      period: operational.month || null,
      source: 'CRM del cliente · corte mensual',
      methodology: 'Ventas del mes divididas por leads creados en el mismo mes; no representa cohorte.',
    },
    {
      id: 'client.crm.source-coverage',
      domain: 'crm',
      sourceClass: 'client_evidence',
      label: 'Cobertura de fuentes entregadas',
      value: quality.sourceCoverage,
      period: CRM_INTELLIGENCE.sourceInventory.periodEnd,
      source: 'Inventario de archivos del cliente',
      methodology: 'Datasets presentes frente a datasets esperados dentro de la entrega recibida.',
    },
    {
      id: 'client.executive.sales-compliance',
      domain: 'executive',
      sourceClass: 'client_evidence',
      label: 'Cumplimiento acumulado de cierres',
      value: compliance.compliance,
      period: '2026-06',
      source: 'CRM del cliente + contrato de metas entregado',
      methodology: 'Cierres CRM frente a meta acumulada compatible.',
    },
    {
      id: 'client.executive.branch-attribution',
      domain: 'executive',
      sourceClass: 'client_evidence',
      label: 'Ventas atribuibles a sucursal',
      value: attributedSales,
      period: '2026-01/2026-06',
      source: 'CRM del cliente + estructura de sucursales',
      methodology: `Parte identificada de ${ytd.salesCount} cierres acumulados.`,
    },
  ]
}

function buildN3uraliaSignals(evidence: IntelligenceEvidence[]): IntelligenceSignal[] {
  const sales = Number(evidence.find((item) => item.id === 'client.crm.sales-ytd')?.value ?? 0)
  const attributed = Number(evidence.find((item) => item.id === 'client.executive.branch-attribution')?.value ?? 0)
  const coverage = Number(evidence.find((item) => item.id === 'client.crm.source-coverage')?.value ?? 0)
  const attributionRate = sales > 0 ? Number(((attributed / sales) * 100).toFixed(1)) : null

  return [
    {
      id: 'n3uralia.signal.attribution-gap',
      domain: 'executive',
      sourceClass: 'n3uralia_inference',
      title: 'Brecha de atribución comercial',
      interpretation: attributionRate === null
        ? 'No existe base suficiente para medir atribución comercial.'
        : `${attributionRate}% de los cierres acumulados puede vincularse a una sucursal. La fracción restante limita la lectura comparativa y la asignación de responsabilidad.`,
      evidenceIds: ['client.crm.sales-ytd', 'client.executive.branch-attribution'],
      confidence: attributionRate === null ? 'low' : 'high',
    },
    {
      id: 'n3uralia.signal.source-dependence',
      domain: 'executive',
      sourceClass: 'n3uralia_inference',
      title: 'Dependencia de información entregada',
      interpretation: coverage >= 90
        ? 'La entrega del cliente tiene cobertura operativa alta, pero sigue representando sólo una perspectiva interna y no sustituye inteligencia de mercado independiente.'
        : 'La cobertura parcial de archivos internos aumenta la necesidad de contrastar resultados con fuentes externas y modelos propietarios.',
      evidenceIds: ['client.crm.source-coverage'],
      confidence: 'high',
    },
    {
      id: 'n3uralia.signal.market-context-pending',
      domain: 'market',
      sourceClass: 'n3uralia_model',
      title: 'Contexto externo requerido',
      interpretation: 'El rendimiento interno no debe interpretarse sin contrastarlo con oferta, demanda, velocidad de absorción, precios, tasas, competencia y señales territoriales externas.',
      evidenceIds: [],
      confidence: 'high',
    },
  ]
}

function buildRisks(evidence: IntelligenceEvidence[], signals: IntelligenceSignal[]): IntelligenceRisk[] {
  const sourceRisks: IntelligenceRisk[] = CRM_INTELLIGENCE.quality.issues.map((issue) => ({
    id: `client.crm.${issue.code}`,
    domain: 'crm',
    severity: issue.severity,
    title: issue.title,
    detail: issue.detail,
    evidenceIds: [],
  }))

  const attributionSignal = signals.find((signal) => signal.id === 'n3uralia.signal.attribution-gap')

  return [
    ...sourceRisks,
    {
      id: 'n3uralia.risk.client-data-bias',
      domain: 'executive',
      severity: 'warning',
      title: 'Sesgo de perspectiva interna',
      detail: 'Los archivos del cliente describen su operación, pero no demuestran por sí solos el estado del mercado, la competitividad ni el potencial económico futuro.',
      evidenceIds: evidence.filter((item) => item.sourceClass === 'client_evidence').map((item) => item.id),
    },
    ...(attributionSignal ? [{
      id: 'n3uralia.risk.incomplete-attribution',
      domain: 'executive' as const,
      severity: 'warning' as const,
      title: 'Atribución incompleta',
      detail: attributionSignal.interpretation,
      evidenceIds: attributionSignal.evidenceIds,
    }] : []),
  ]
}

function buildActions(signals: IntelligenceSignal[]): IntelligenceAction[] {
  const existing = CRM_INTELLIGENCE.actions

  const clientBacked = (Object.entries(existing) as Array<['ceo' | 'director' | 'seller', typeof existing.ceo]>).flatMap(([audience, actions]) =>
    actions.map((item, index) => ({
      id: `n3uralia.action.${audience}.${index + 1}`,
      audience,
      priority: item.priority,
      title: item.title,
      rationale: item.evidence,
      action: item.action,
      domain: 'crm' as const,
      evidenceIds: [],
      origin: 'n3uralia_agent' as const,
      href: DOMAIN_LINKS.crm,
    })),
  )

  return [
    ...clientBacked,
    {
      id: 'n3uralia.action.ceo.market-contrast',
      audience: 'ceo',
      priority: 'high',
      title: 'Contrastar desempeño interno con el mercado',
      rationale: signals.find((signal) => signal.id === 'n3uralia.signal.market-context-pending')?.interpretation ?? '',
      action: 'Incorporar oferta, precios, absorción, competencia, tasas y señales territoriales antes de emitir una conclusión estratégica.',
      domain: 'market',
      evidenceIds: [],
      origin: 'n3uralia_agent',
      href: DOMAIN_LINKS.market,
    },
    {
      id: 'n3uralia.action.ceo.improve-attribution',
      audience: 'ceo',
      priority: 'high',
      title: 'Cerrar la brecha de atribución',
      rationale: signals.find((signal) => signal.id === 'n3uralia.signal.attribution-gap')?.interpretation ?? '',
      action: 'Priorizar normalización de sucursales, ejecutivos y responsables para que la inteligencia pueda asignar desempeño y riesgo con mayor precisión.',
      domain: 'crm',
      evidenceIds: ['client.crm.sales-ytd', 'client.executive.branch-attribution'],
      origin: 'n3uralia_agent',
      href: DOMAIN_LINKS.crm,
    },
  ]
}

export function buildN3uraliaIntelligenceContext(audience: IntelligenceAudience = 'system'): N3uraliaIntelligenceContext {
  const evidence = buildClientEvidence()
  const signals = buildN3uraliaSignals(evidence)
  const risks = buildRisks(evidence, signals)
  const allActions = buildActions(signals)
  const actions = audience === 'system' ? allActions : allActions.filter((item) => item.audience === audience)

  return {
    schemaVersion: 1,
    engine: {
      owner: 'N3uralia',
      productRole: 'proprietary_intelligence_engine',
      clientOwnsEngine: false,
      clientDataIsOneInputOnly: true,
      autonomousProcessingEnabled: true,
      mission: 'Act as an independent, continuously collaborating intelligence brain that transforms internal evidence, external market information and proprietary models into useful, transparent and disinterested guidance.',
    },
    generatedAt: new Date().toISOString(),
    audience,
    scope: {
      commune: CRM_INTELLIGENCE.scope.commune,
      operation: CRM_INTELLIGENCE.scope.operation,
      propertyTypes: CRM_INTELLIGENCE.scope.propertyTypes,
      periodStart: CRM_INTELLIGENCE.sourceInventory.periodStart,
      periodEnd: CRM_INTELLIGENCE.sourceInventory.periodEnd,
    },
    evidence,
    signals,
    risks,
    actions,
    governance: {
      piiIncluded: false,
      syntheticScoreAllowed: false,
      universesMustRemainSeparate: true,
      clientEvidenceMayNotDefineTruthAlone: true,
      externalMarketResearchRequiredForMarketClaims: true,
      inferenceMustDeclareEvidence: true,
      operatingPrinciple: 'N3uralia serves the quality of the decision, not the preference of any stakeholder. It must separate evidence, inference and opinion, disclose uncertainty, challenge incomplete assumptions and collaborate in good faith.',
    },
  }
}

export function getN3uraliaDomainContext(domain: IntelligenceDomain, audience: IntelligenceAudience = 'system') {
  const context = buildN3uraliaIntelligenceContext(audience)
  return {
    ...context,
    evidence: context.evidence.filter((item) => item.domain === domain || domain === 'executive'),
    signals: context.signals.filter((item) => item.domain === domain || domain === 'executive'),
    risks: context.risks.filter((item) => item.domain === domain || domain === 'executive'),
    actions: context.actions.filter((item) => item.domain === domain || domain === 'executive'),
  }
}
