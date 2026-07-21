import crmIntelligence from '@/data/crm-intelligence.json'
import targets2026 from '@/data/targets-2026.json'
import type { KpiSnapshot } from '@/lib/types'

type RankingEntry = { label: string; count: number }
type ValueRankingEntry = { label: string; value: number }
type QualitySeverity = 'critical' | 'warning' | 'info'

export type CrmMonth = {
  period: string
  label: string
  salesCount: number
  salesUf: number
  medianSaleUf: number | null
  capturesCount: number
  newLeadsCount: number
  requirementsCount: number
  visitsCount: number | null
  realizedVisitsCount: number | null
  realizedVisitsRate: number | null
  stockCount: number
  suspendedCount: number
  salesByType: RankingEntry[]
  salesByOffice: RankingEntry[]
  salesUfByOffice: ValueRankingEntry[]
  requirementsByOffice: RankingEntry[]
  leadsByOffice: RankingEntry[]
  visitsByOffice: RankingEntry[]
  realizedVisitsByOffice: RankingEntry[]
  stockByOffice: RankingEntry[]
  salesByListingAgent: RankingEntry[]
  capturesByAgent: RankingEntry[]
  visitStatusCounts: RankingEntry[]
  sellerAttribution: { identified: number; missing: number; coverage: number | null }
  leadOrigins: RankingEntry[]
  leadOwners: RankingEntry[]
  quality: {
    sourceCoverage: number
    expectedDatasets: number
    acceptedRecords: number
    excludedOutsideScope: number
    duplicateRows: number
    malformedRows: number
    missingDatasets: string[]
  }
}

type CrmAction = {
  priority: 'high' | 'medium' | 'low'
  title: string
  evidence: string
  action: string
}

export type CrmLeadSnapshot = {
  period: string
  source: 'month_end' | 'fortnight_audit'
  active: number | null
  classified: number | null
  unclassified: number | null
  stale15To90: number | null
  staleOver90: number | null
  staleOver15Total: number | null
  staleOver15Rate: number | null
  classificationCoverage: number | null
  availableDatasets: Record<'active' | 'classified' | 'unclassified' | 'stale15' | 'stale90', boolean>
}

type Reconciliation = {
  left: number
  right: number
  overlap: number
  leftOnly: number
  rightOnly: number
  exactMatch: boolean
  comparisonKey?: string[]
}

type CrmIntelligence = {
  schemaVersion: number
  generatedAt: string
  scope: {
    commune: string
    operation: string
    propertyTypes: string[]
    excludedOperations: string[]
    piiIncluded: boolean
  }
  sourceInventory: {
    workbookCount: number
    periodStart: string
    periodEnd: string
    monthlyOperationalStart: string
    aprilFortnightIncluded: boolean
    aprilFortnightReconciliation: Record<string, { fortnight: number; month: number; overlap: number; fortnightOnly: number; monthOnly: number }>
    cellCoverage: { workbookCount: number; sheetCount: number; storedCells: number; populatedCells: number; formulaCells: number; formulaErrorCells: number }
    datasetCoverage: Array<{ dataset: string; workbookCount: number; dataRows: number; periods: string[]; sourceRoles: string[] }>
    formulaErrorCount: number
    emptyHeaderCount: number
    duplicateHeaderCount: number
    workbooks: Array<{
      file: string
      period: string | null
      dataset: string
      sourceRole: string
      byteSize: number
      fileSha256: string
      selectedSheet: string
      sheetCount: number
      dataRows: number
      columnCount: number
      emptyHeaderCount: number
      duplicateHeaderCount: number
      storedCells: number
      populatedCells: number
      formulaCells: number
      formulaErrorCells: number
      sheets: Array<{ name: string; range: string | null; storedCells: number; populatedCells: number; formulaCells: number; formulaErrorCells: number; commentCells: number; hyperlinkCells: number; cellDigest: string }>
    }>
  }
  baseline2025: {
    salesCount: number
    salesUf: number
    newLeadsCount: number
    requirementsCount: number
    uniqueVisitAppointmentsCount: number
    realizedVisitsCount: number
    firstHalfSalesCount: number
    firstHalfSalesUf: number
    months: Array<{ period: string; salesCount: number; salesUf: number }>
  }
  annualContext2025: {
    captures: number
    suspended: number
    publishedStock: number
    quality: Record<string, { rawRows: number; acceptedRows: number; duplicateRows: number; excludedRows: number; malformedRows: number; missingColumns: string[]; missing: boolean }>
  }
  months: CrmMonth[]
  leadSnapshots: CrmLeadSnapshot[]
  aprilFortnightLeadSnapshot: CrmLeadSnapshot
  latestLeadSnapshot: CrmLeadSnapshot
  sourceReconciliations: Record<'sales2025WithoutSellerVsWithSeller' | 'sales2025SummaryVsAuthoritative' | 'q1CumulativeVsMonthlyUnion' | 'marchMiscVsMarchSales', Reconciliation>
  ytd: {
    salesCount: number
    salesUf: number
    capturesCount: number
    newLeadsCount: number
    requirementsCount: number
    visitsCount: number | null
    knownVisitsCount: number
    knownRealizedVisitsCount: number
    knownRealizedVisitsRate: number | null
    sellerAttribution: { identified: number; missing: number; coverage: number | null }
    crossPeriodDuplicateIds: Record<'sales' | 'captures' | 'leads' | 'requirements' | 'visits', number>
    stockChange: number
    comparison2025: { salesChangePct: number | null; salesUfChangePct: number | null }
    salesByOffice: RankingEntry[]
    salesByListingAgent: RankingEntry[]
    capturesByAgent: RankingEntry[]
  }
  quality: {
    sourceCoverage: number
    issues: Array<{ severity: QualitySeverity; code: string; title: string; detail: string }>
  }
  actions: Record<'ceo' | 'director' | 'seller', CrmAction[]>
  targetsContract: {
    status: 'not_loaded' | 'loaded_with_source_issues' | 'loaded_with_critical_issues'
    version: string | null
    workbookCount: number
    storedCells: number
    sourceIssueCount: number
    criticalSourceIssueCount: number
    requiredFields: string[]
    rule: string
  }
}

export type CrmOperationalSummary = {
  month: string
  monthLabel: string
  sales: number
  salesUf: number
  medianSaleUf: number | null
  leads: number
  captations: number
  visits: number | null
  realizedVisits: number | null
  realizedVisitsRate: number | null
  requirements: number
  suspended: number
  stock: number
  leadToSaleProxy: number
  sourceCoverage: number
  topAgents: Array<{ value: string; count: number }>
  topPartners: Array<{ value: string; count: number }>
  topOrigins: Array<{ value: string; count: number }>
  topStates: Array<{ value: string; count: number }>
  topTypes: Array<{ value: string; count: number }>
}

export const CRM_INTELLIGENCE = crmIntelligence as CrmIntelligence

function asLegacyRanking(entries: RankingEntry[]) {
  return entries.map((entry) => ({ value: entry.label, count: entry.count }))
}

function findMonth(monthName?: string) {
  if (!monthName) return CRM_INTELLIGENCE.months.at(-1) ?? null
  const normalized = monthName.replace(/^Datos\s+/i, '').trim()
  return CRM_INTELLIGENCE.months.find((month) => month.period === normalized || month.period.replace('-', '') === normalized || month.label === monthName) ?? null
}

export function getOperationalSummary(monthName?: string): CrmOperationalSummary {
  const month = findMonth(monthName)
  if (!month) {
    return {
      month: '', monthLabel: '', sales: 0, salesUf: 0, medianSaleUf: null, leads: 0, captations: 0,
      visits: null, realizedVisits: null, realizedVisitsRate: null, requirements: 0, suspended: 0, stock: 0, leadToSaleProxy: 0, sourceCoverage: 0,
      topAgents: [], topPartners: [], topOrigins: [], topStates: [], topTypes: [],
    }
  }

  return {
    month: month.period,
    monthLabel: month.label,
    sales: month.salesCount,
    salesUf: month.salesUf,
    medianSaleUf: month.medianSaleUf,
    leads: month.newLeadsCount,
    captations: month.capturesCount,
    visits: month.visitsCount,
    realizedVisits: month.realizedVisitsCount,
    realizedVisitsRate: month.realizedVisitsRate,
    requirements: month.requirementsCount,
    suspended: month.suspendedCount,
    stock: month.stockCount,
    leadToSaleProxy: month.newLeadsCount > 0 ? Number(((month.salesCount / month.newLeadsCount) * 100).toFixed(1)) : 0,
    sourceCoverage: month.quality.sourceCoverage,
    topAgents: asLegacyRanking(month.salesByListingAgent),
    topPartners: asLegacyRanking(month.leadOwners),
    topOrigins: asLegacyRanking(month.leadOrigins),
    topStates: [],
    topTypes: asLegacyRanking(month.salesByType),
  }
}

export function buildOperationalSeries(limit = 6) {
  return CRM_INTELLIGENCE.months.slice(-limit).map((month) => ({
    mes: month.label.replace(' 2026', ''),
    period_date: `${month.period}-01`,
    ventas: month.salesCount,
    ventasUf: month.salesUf,
    captaciones: month.capturesCount,
    leads: month.newLeadsCount,
    visitas: month.visitsCount,
    stock: month.stockCount,
    suspended: month.suspendedCount,
    conversion: month.newLeadsCount > 0 ? Number(((month.salesCount / month.newLeadsCount) * 100).toFixed(1)) : 0,
    sourceCoverage: month.quality.sourceCoverage,
  }))
}

function toKpiSnapshot(summary: CrmOperationalSummary): KpiSnapshot {
  return {
    id: `crm-${summary.month}`,
    period_date: `${summary.month}-01`,
    period_type: 'monthly',
    ventas_count: summary.sales,
    ventas_uf: summary.salesUf,
    captaciones_count: summary.captations,
    visitas_count: summary.visits,
    leads_count: summary.leads,
    conversion_rate: summary.leadToSaleProxy,
    comision_total: 0,
    stock_count: summary.stock,
    velocidad_venta: 0,
    monthly_target: targets2026.companyMonthlyTargets.sales_count[summary.month as keyof typeof targets2026.companyMonthlyTargets.sales_count] ?? 0,
    director_id: null,
    agent_id: null,
    created_at: CRM_INTELLIGENCE.generatedAt,
  }
}

export function buildLatestKpiFallback() {
  return toKpiSnapshot(getOperationalSummary())
}

export function buildHomeFallbackCards() {
  const latest = getOperationalSummary()
  const ytd = CRM_INTELLIGENCE.ytd
  const leadSnapshot = CRM_INTELLIGENCE.latestLeadSnapshot
  return [
    {
      role: 'CEO',
      title: 'Resultado y cartera',
      body: `${ytd.salesCount} ventas por UF ${ytd.salesUf.toLocaleString('es-CL')} en 2026; cartera ${ytd.stockChange} propiedades frente al primer corte.`,
      note: `Cobertura de fuentes ${CRM_INTELLIGENCE.quality.sourceCoverage}%. Metas 2026 integradas desde ${targets2026.cellCoverage.workbookCount} libros y ${targets2026.cellCoverage.storedCells.toLocaleString('es-CL')} celdas.`,
    },
    {
      role: 'Director',
      title: 'Riesgo de gestion',
      body: `${leadSnapshot.staleOver15Total} leads superan 15 dias sin gestion y ${leadSnapshot.unclassified} permanecen sin clasificar en el ultimo corte.`,
      note: `${latest.requirements} requerimientos; ${latest.visits ?? 'sin dato'} agendamientos unicos y ${latest.realizedVisits ?? 'sin dato'} realizados en ${latest.monthLabel}.`,
    },
    {
      role: 'Vendedor',
      title: 'Prioridad comercial',
      body: CRM_INTELLIGENCE.actions.seller[0]?.action ?? 'Sin accion calculada.',
      note: CRM_INTELLIGENCE.actions.seller[0]?.evidence ?? 'Sin evidencia disponible.',
    },
  ]
}

export function buildAgentFallbackRows(limit = 8) {
  const captures = new Map(CRM_INTELLIGENCE.ytd.capturesByAgent.map((entry) => [entry.label, entry.count]))
  return CRM_INTELLIGENCE.ytd.salesByListingAgent.slice(0, limit).map((entry) => ({
    id: entry.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
    name: entry.label.replace(/\s*\|\s*Chile$/i, ''),
    team: 'Vitacura CRM',
    ventas: entry.count,
    captaciones: captures.get(entry.label) ?? 0,
    conversion: null,
    velocidad: null,
    status: 'inactive' as const,
  }))
}

export function buildDirectorFallbackRows(limit = 3) {
  return CRM_INTELLIGENCE.ytd.salesByOffice.slice(0, limit).map((entry) => ({
    id: entry.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
    name: entry.label,
    team: 'Sucursal Vitacura',
    ventas: entry.count,
    uf: null,
    target: null,
    comision: null,
  }))
}

export function getDataQuality() {
  return CRM_INTELLIGENCE.quality
}

export function getLatestLeadSnapshot() {
  return CRM_INTELLIGENCE.latestLeadSnapshot
}

export function getRoleActions(role: 'ceo' | 'director' | 'seller') {
  return CRM_INTELLIGENCE.actions[role]
}

export function getYtdSummary() {
  return CRM_INTELLIGENCE.ytd
}

export function getTargetsStatus() {
  return CRM_INTELLIGENCE.targetsContract
}
