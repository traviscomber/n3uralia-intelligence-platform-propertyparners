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
export type IntelligenceModule = 'executive' | 'crm' | 'market' | 'valuation' | 'reports'
export type IntelligenceSeverity = 'critical' | 'warning' | 'info'

export type IntelligenceEvidence = {
  id: string
  module: IntelligenceModule
  label: string
  value: string | number | null
  period: string | null
  source: string
  methodology: string
}

export type IntelligenceRisk = {
  id: string
  module: IntelligenceModule
  severity: IntelligenceSeverity
  title: string
  detail: string
  source: string
}

export type IntelligenceAction = {
  id: string
  audience: Exclude<IntelligenceAudience, 'system'>
  priority: 'high' | 'medium' | 'low'
  title: string
  evidence: string
  action: string
  module: IntelligenceModule
  href: string
}

export type IntelligenceModuleStatus = {
  module: IntelligenceModule
  label: string
  href: string
  status: 'available' | 'partial' | 'not_connected'
  summary: string
  evidenceIds: string[]
  riskIds: string[]
}

export type IntelligenceContext = {
  schemaVersion: 1
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
  risks: IntelligenceRisk[]
  actions: IntelligenceAction[]
  modules: IntelligenceModuleStatus[]
  governance: {
    syntheticScoreAllowed: false
    piiIncluded: false
    universesMustRemainSeparate: true
    recommendationRule: string
  }
}

const MODULE_LINKS: Record<IntelligenceModule, string> = {
  executive: '/dashboard/ceo',
  crm: '/dashboard/datos-crm',
  market: '/dashboard/market',
  valuation: '/dashboard/valorizador',
  reports: '/dashboard/reportes/autonomos',
}

function buildEvidence(): IntelligenceEvidence[] {
  const ytd = getYtdSummary()
  const operational = getOperationalSummary()
  const quality = getDataQuality()
  const compliance = getCompanySalesCompliance('2026-06')
  const branches = getBranchSalesYtdPerformance('2026-06')
  const attributedSales = branches.reduce((sum, branch) => sum + branch.actualSales, 0)
  const attributedUf = branches.reduce((sum, branch) => sum + branch.actualUf, 0)

  return [
    {
      id: 'crm.sales-ytd',
      module: 'crm',
      label: 'Ventas acumuladas',
      value: ytd.salesCount,
      period: '2026-01/2026-06',
      source: 'CRM Intelligence · fuente autoritativa de ventas',
      methodology: 'Conteo de cierres aceptados dentro del alcance operacional definido.',
    },
    {
      id: 'crm.sales-uf-ytd',
      module: 'crm',
      label: 'UF vendidas acumuladas',
      value: ytd.salesUf,
      period: '2026-01/2026-06',
      source: 'CRM Intelligence · fuente autoritativa de ventas',
      methodology: 'Suma de UF disponible en registros aceptados; no completa valores ausentes.',
    },
    {
      id: 'crm.latest-lead-to-sale-proxy',
      module: 'crm',
      label: 'Proxy mensual cierres / leads',
      value: operational.leadToSaleProxy,
      period: operational.month || null,
      source: 'CRM Intelligence · corte mensual',
      methodology: 'Ventas del mes divididas por leads creados del mismo mes; no es una cohorte.',
    },
    {
      id: 'crm.source-coverage',
      module: 'crm',
      label: 'Cobertura de fuentes',
      value: quality.sourceCoverage,
      period: CRM_INTELLIGENCE.sourceInventory.periodEnd,
      source: 'Inventario auditable de libros CRM',
      methodology: 'Datasets presentes frente a datasets esperados para los cortes disponibles.',
    },
    {
      id: 'executive.sales-compliance',
      module: 'executive',
      label: 'Cumplimiento acumulado de cierres',
      value: compliance.compliance,
      period: '2026-06',
      source: 'CRM Intelligence + contrato de Metas 2026',
      methodology: 'Cierres CRM frente a meta acumulada compatible; no mezcla metas incompatibles.',
    },
    {
      id: 'executive.branch-attribution-sales',
      module: 'executive',
      label: 'Ventas atribuibles a sucursal',
      value: attributedSales,
      period: '2026-01/2026-06',
      source: 'CRM Intelligence + estructura de sucursales',
      methodology: `Parte identificada de ${ytd.salesCount} cierres acumulados.`,
    },
    {
      id: 'executive.branch-attribution-uf',
      module: 'executive',
      label: 'UF atribuibles a sucursal',
      value: attributedUf,
      period: '2026-01/2026-06',
      source: 'CRM Intelligence + estructura de sucursales',
      methodology: `Parte identificada de ${ytd.salesUf} UF acumuladas.`,
    },
    {
      id: 'crm.active-leads',
      module: 'crm',
      label: 'Leads activos',
      value: CRM_INTELLIGENCE.latestLeadSnapshot.active,
      period: CRM_INTELLIGENCE.latestLeadSnapshot.period,
      source: 'Snapshot de leads más reciente',
      methodology: 'Valor publicado por el archivo de corte; no se reconstruye cuando falta.',
    },
    {
      id: 'crm.stale-leads',
      module: 'crm',
      label: 'Leads con antigüedad superior a 15 días',
      value: CRM_INTELLIGENCE.latestLeadSnapshot.staleOver15Total,
      period: CRM_INTELLIGENCE.latestLeadSnapshot.period,
      source: 'Snapshot de antigüedad de leads',
      methodology: 'Suma disponible de rangos 15–90 días y sobre 90 días.',
    },
  ]
}

function buildRisks(): IntelligenceRisk[] {
  return CRM_INTELLIGENCE.quality.issues.map((issue) => ({
    id: `crm.${issue.code}`,
    module: 'crm',
    severity: issue.severity,
    title: issue.title,
    detail: issue.detail,
    source: 'CRM Intelligence · registro de calidad',
  }))
}

function buildActions(): IntelligenceAction[] {
  const audienceEntries = Object.entries(CRM_INTELLIGENCE.actions) as Array<[
    'ceo' | 'director' | 'seller',
    typeof CRM_INTELLIGENCE.actions.ceo,
  ]>

  return audienceEntries.flatMap(([audience, actions]) =>
    actions.map((item, index) => ({
      id: `crm.${audience}.${index + 1}`,
      audience,
      priority: item.priority,
      title: item.title,
      evidence: item.evidence,
      action: item.action,
      module: 'crm' as const,
      href: MODULE_LINKS.crm,
    })),
  )
}

function buildModules(evidence: IntelligenceEvidence[], risks: IntelligenceRisk[]): IntelligenceModuleStatus[] {
  const evidenceFor = (module: IntelligenceModule) => evidence.filter((item) => item.module === module).map((item) => item.id)
  const risksFor = (module: IntelligenceModule) => risks.filter((item) => item.module === module).map((item) => item.id)

  return [
    {
      module: 'executive',
      label: 'Executive Intelligence Hub',
      href: MODULE_LINKS.executive,
      status: 'available',
      summary: 'Consolida desempeño y riesgos sin convertirlos en un score sintético.',
      evidenceIds: evidenceFor('executive'),
      riskIds: risksFor('executive'),
    },
    {
      module: 'crm',
      label: 'CRM Intelligence',
      href: MODULE_LINKS.crm,
      status: 'available',
      summary: 'Ventas, leads, captaciones, cartera, conciliaciones y acciones por audiencia.',
      evidenceIds: evidenceFor('crm'),
      riskIds: risksFor('crm'),
    },
    {
      module: 'market',
      label: 'Market Intelligence',
      href: MODULE_LINKS.market,
      status: 'partial',
      summary: 'Interfaz disponible; pendiente registrar su contrato de evidencia en esta capa compartida.',
      evidenceIds: [],
      riskIds: [],
    },
    {
      module: 'valuation',
      label: 'Valuation Intelligence',
      href: MODULE_LINKS.valuation,
      status: 'partial',
      summary: 'Motor determinista disponible; pendiente exponer casos aprobados al contexto compartido.',
      evidenceIds: [],
      riskIds: [],
    },
    {
      module: 'reports',
      label: 'Executive Publishing',
      href: MODULE_LINKS.reports,
      status: 'partial',
      summary: 'Registro editorial disponible; pendiente consumir este contexto como fuente única.',
      evidenceIds: [],
      riskIds: [],
    },
  ]
}

export function buildIntelligenceContext(audience: IntelligenceAudience = 'system'): IntelligenceContext {
  const evidence = buildEvidence()
  const risks = buildRisks()
  const allActions = buildActions()
  const actions = audience === 'system'
    ? allActions
    : allActions.filter((item) => item.audience === audience)

  return {
    schemaVersion: 1,
    generatedAt: CRM_INTELLIGENCE.generatedAt,
    audience,
    scope: {
      commune: CRM_INTELLIGENCE.scope.commune,
      operation: CRM_INTELLIGENCE.scope.operation,
      propertyTypes: CRM_INTELLIGENCE.scope.propertyTypes,
      periodStart: CRM_INTELLIGENCE.sourceInventory.periodStart,
      periodEnd: CRM_INTELLIGENCE.sourceInventory.periodEnd,
    },
    evidence,
    risks,
    actions,
    modules: buildModules(evidence, risks),
    governance: {
      syntheticScoreAllowed: false,
      piiIncluded: false,
      universesMustRemainSeparate: true,
      recommendationRule: 'Only publish recommendations already supported by an explicit source contract and visible evidence.',
    },
  }
}

export function getIntelligenceModuleContext(module: IntelligenceModule, audience: IntelligenceAudience = 'system') {
  const context = buildIntelligenceContext(audience)
  const moduleStatus = context.modules.find((item) => item.module === module) ?? null

  return {
    ...context,
    evidence: context.evidence.filter((item) => item.module === module || module === 'executive'),
    risks: context.risks.filter((item) => item.module === module || module === 'executive'),
    actions: context.actions.filter((item) => item.module === module || module === 'executive'),
    modules: moduleStatus ? [moduleStatus] : [],
  }
}
