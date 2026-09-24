import periodsData from '@/data/management-canonical-periods.json'
import type { DashboardEntity, DashboardMetric } from '@/lib/management-persisted-overlay'

type OfficeSnapshot = {
  name: string
  stock: number | null
  captures: number | null
  leads: number | null
  activeLeads: number | null
  requirements: number | null
  scheduledVisits: number | null
  realizedVisits: number | null
  creditedClosings: number
  creditedSalesUf: number
  managementScore?: number | null
  portfolioScore?: number | null
  followUpScore?: number | null
  conversionScore?: number | null
}

type CanonicalPeriod = (typeof periodsData.periods)[number]

const percent = (value: number | null, target: number | null) =>
  value !== null && target !== null && target !== 0 ? (value / target) * 100 : null

function metric(
  code: string,
  label: string,
  unit: DashboardMetric['unit'],
  value: number | null,
  sourceName: string,
  sourceReference: string,
  period: string,
  target: number | null = null,
): DashboardMetric {
  return {
    code,
    label,
    unit,
    value,
    target,
    compliance: percent(value, target),
    mom: null,
    yoy: null,
    methodology: 'Métrica publicada por la fuente canónica del período.',
    sourceName,
    sourceReference,
    periodStart: `${period}-01`,
    periodEnd: `${period}-31`,
    qualityStatus: value === null ? 'missing' : 'canonical_presentation',
    dataLayer: 'documentary',
  }
}

function officeEntity(period: CanonicalPeriod, office: OfficeSnapshot): DashboardEntity {
  const sourceName = period.authority.file
  const sourceReference = `${period.period} · snapshot canónico`
  return {
    id: `branch:${office.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
    name: office.name,
    entityType: 'branch',
    parentId: null,
    classification: null,
    metrics: [
      metric('management_credited_sales', 'Cierres acreditados', 'count', office.creditedClosings, sourceName, sourceReference, period.period),
      metric('management_credited_sales_uf', 'UF acreditadas', 'uf', office.creditedSalesUf, sourceName, sourceReference, period.period),
      metric('stock', 'Cartera publicada', 'count', office.stock, sourceName, sourceReference, period.period),
      metric('captations', 'Captaciones', 'count', office.captures, sourceName, sourceReference, period.period),
      metric('leads', 'Leads', 'count', office.leads, sourceName, sourceReference, period.period),
      metric('active_leads', 'Leads activos', 'count', office.activeLeads, sourceName, sourceReference, period.period),
      metric('requirements', 'Requerimientos', 'count', office.requirements, sourceName, sourceReference, period.period),
      metric('scheduled_visits', 'Visitas agendadas', 'count', office.scheduledVisits, sourceName, sourceReference, period.period),
      metric('realized_visits', 'Visitas realizadas', 'count', office.realizedVisits, sourceName, sourceReference, period.period),
      metric('management_score', 'Calidad de gestión', 'score', office.managementScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('portfolio_score', 'Calidad de cartera', 'score', office.portfolioScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('follow_up_score', 'Seguimiento', 'score', office.followUpScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('conversion', 'Conversión', 'score', office.conversionScore ?? null, sourceName, sourceReference, period.period, 70),
    ].filter((item) => item.value !== null),
  }
}

export function getCanonicalManagementPeriods() {
  return periodsData.periods
}

export function getLatestCanonicalManagementPeriod() {
  return [...periodsData.periods].sort((a, b) => a.period.localeCompare(b.period)).at(-1) ?? null
}

export function getCanonicalManagementPeriod(period: string) {
  return periodsData.periods.find((item) => item.period === period) ?? null
}

export function getCanonicalManagementDashboardEntities(period = getLatestCanonicalManagementPeriod()): DashboardEntity[] {
  if (!period) return []
  const sourceName = period.authority.file
  const sourceReference = `${period.period} · snapshot canónico`
  const company = period.company
  const companyEntity: DashboardEntity = {
    id: 'company:property-partners-vitacura',
    name: company.name,
    entityType: 'company',
    parentId: null,
    classification: null,
    metrics: [
      metric('management_credited_sales', 'Cierres acreditados', 'count', company.creditedClosings, sourceName, sourceReference, period.period, company.documentaryClosingReference),
      metric('management_credited_sales_uf', 'UF acreditadas', 'uf', company.creditedSalesUf, sourceName, sourceReference, period.period),
      metric('cumulative_management_credited_sales', 'Cierres acreditados acumulados', 'count', company.ytdCreditedClosings, sourceName, sourceReference, period.period, company.ytdDocumentaryReference),
      metric('operational_sales', 'Cierres operacionales', 'count', company.operationalClosings, sourceName, sourceReference, period.period),
      metric('operational_sales_uf', 'UF operacionales', 'uf', company.operationalSalesUf, sourceName, sourceReference, period.period),
      metric('stock', 'Cartera publicada', 'count', company.stock, sourceName, sourceReference, period.period),
      metric('captations', 'Captaciones', 'count', company.captures, sourceName, sourceReference, period.period),
      metric('leads', 'Leads', 'count', company.leads, sourceName, sourceReference, period.period),
      metric('requirements', 'Requerimientos', 'count', company.requirements, sourceName, sourceReference, period.period),
      metric('scheduled_visits', 'Visitas agendadas', 'count', company.scheduledVisits, sourceName, sourceReference, period.period),
      metric('realized_visits', 'Visitas realizadas', 'count', company.realizedVisits, sourceName, sourceReference, period.period),
      metric('management_score', 'Calidad de gestión', 'score', company.managementScore, sourceName, sourceReference, period.period, 70),
      metric('portfolio_score', 'Calidad de cartera', 'score', company.portfolioScore, sourceName, sourceReference, period.period, 70),
      metric('follow_up_score', 'Seguimiento', 'score', company.followUpScore, sourceName, sourceReference, period.period, 70),
      metric('conversion', 'Conversión', 'score', company.conversionScore, sourceName, sourceReference, period.period, 70),
    ].filter((item) => item.value !== null),
    evolution: periodsData.periods.map((item) => ({
      period: item.period,
      sales: item.company.creditedClosings,
      salesTarget: item.company.documentaryClosingReference,
      salesUf: item.company.creditedSalesUf,
      salesUfTarget: null,
    })),
  }

  return [companyEntity, ...period.offices.map((office) => officeEntity(period, office as OfficeSnapshot))]
}
