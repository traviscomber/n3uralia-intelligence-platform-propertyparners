import periodsData from '@/data/management-canonical-periods.json'
import type { DashboardEntity, DashboardMetric } from '@/lib/management-persisted-overlay'

type OfficeSnapshot = {
  name: string
  stock?: number | null
  captures?: number | null
  leads?: number | null
  activeLeads?: number | null
  requirements?: number | null
  scheduledVisits?: number | null
  realizedVisits?: number | null
  creditedClosings: number
  creditedSalesUf: number
  canonicalClosingTarget?: number | null
  managementScore?: number | null
  portfolioScore?: number | null
  followUpScore?: number | null
  conversionScore?: number | null
}

type CompanySnapshot = {
  name: string
  legalName: string
  creditedClosings: number
  creditedSalesUf: number
  canonicalClosingTarget: number
  canonicalSalesUfTarget: number
  ytdCreditedClosings: number
  ytdCreditedSalesUf: number
  ytdCanonicalClosingTarget: number
  ytdCanonicalSalesUfTarget: number
  operationalClosings?: number | null
  operationalSalesUf?: number | null
  stock?: number | null
  captures?: number | null
  leads?: number | null
  requirements?: number | null
  scheduledVisits?: number | null
  realizedVisits?: number | null
  managementScore: number | null
  portfolioScore: number | null
  followUpScore: number | null
  conversionScore: number | null
}

type CanonicalPeriod = {
  period: string
  authority: {
    file: string
    sha256: string
    kind: string
    restatesManagementSeriesThrough?: string
  }
  historicalIssuedSnapshot?: unknown
  company: CompanySnapshot
  offices: OfficeSnapshot[]
  partnerLevelAvailable: boolean
}

const canonicalPeriods = periodsData.periods as CanonicalPeriod[]

const percent = (value: number | null, target: number | null) =>
  value !== null && target !== null && target !== 0 ? (value / target) * 100 : null

const monthEnd = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${period}-${String(last).padStart(2, '0')}`
}

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
    methodology: 'Métrica publicada o restatada por la fuente canónica vigente del período.',
    sourceName,
    sourceReference,
    periodStart: `${period}-01`,
    periodEnd: monthEnd(period),
    qualityStatus: value === null ? 'missing' : 'canonical_presentation',
    dataLayer: 'documentary',
  }
}

function officeEntity(period: CanonicalPeriod, office: OfficeSnapshot): DashboardEntity {
  const sourceName = period.authority.file
  const sourceReference = `${period.period} · serie canónica vigente`
  return {
    id: `branch:${office.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
    name: office.name,
    entityType: 'branch',
    parentId: null,
    classification: null,
    metrics: [
      metric('management_credited_sales', 'Cierres acreditados', 'count', office.creditedClosings, sourceName, sourceReference, period.period, office.canonicalClosingTarget ?? null),
      metric('management_credited_sales_uf', 'UF acreditadas', 'uf', office.creditedSalesUf, sourceName, sourceReference, period.period),
      metric('stock', 'Cartera publicada', 'count', office.stock ?? null, sourceName, sourceReference, period.period),
      metric('captations', 'Captaciones', 'count', office.captures ?? null, sourceName, sourceReference, period.period),
      metric('leads', 'Leads', 'count', office.leads ?? null, sourceName, sourceReference, period.period),
      metric('active_leads', 'Leads activos', 'count', office.activeLeads ?? null, sourceName, sourceReference, period.period),
      metric('requirements', 'Requerimientos', 'count', office.requirements ?? null, sourceName, sourceReference, period.period),
      metric('scheduled_visits', 'Visitas agendadas', 'count', office.scheduledVisits ?? null, sourceName, sourceReference, period.period),
      metric('realized_visits', 'Visitas realizadas', 'count', office.realizedVisits ?? null, sourceName, sourceReference, period.period),
      metric('management_score', 'Calidad de gestión', 'score', office.managementScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('portfolio_score', 'Calidad de cartera', 'score', office.portfolioScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('follow_up_score', 'Seguimiento', 'score', office.followUpScore ?? null, sourceName, sourceReference, period.period, 70),
      metric('conversion', 'Conversión', 'score', office.conversionScore ?? null, sourceName, sourceReference, period.period, 70),
    ].filter((item) => item.value !== null),
    evolution: canonicalPeriods
      .map((item) => {
        const historicalOffice = item.offices.find((candidate) => candidate.name === office.name)
        if (!historicalOffice) return null
        return {
          period: item.period,
          sales: historicalOffice.creditedClosings,
          salesTarget: historicalOffice.canonicalClosingTarget ?? null,
          salesUf: historicalOffice.creditedSalesUf,
          cumulativeSales: null,
          cumulativeSalesTarget: null,
          metrics: {
            management_credited_sales: historicalOffice.creditedClosings,
            management_credited_sales_uf: historicalOffice.creditedSalesUf,
            management_score: historicalOffice.managementScore ?? null,
            portfolio_score: historicalOffice.portfolioScore ?? null,
            follow_up_score: historicalOffice.followUpScore ?? null,
            conversion: historicalOffice.conversionScore ?? null,
            stock: historicalOffice.stock ?? null,
            leads: historicalOffice.leads ?? null,
            active_leads_snapshot: historicalOffice.activeLeads ?? null,
            requirements: historicalOffice.requirements ?? null,
            scheduled_visits: historicalOffice.scheduledVisits ?? null,
            realized_visits: historicalOffice.realizedVisits ?? null,
          },
          targets: {
            management_credited_sales: historicalOffice.canonicalClosingTarget ?? null,
          },
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }
}

export function getCanonicalManagementPeriods() {
  return canonicalPeriods
}

export function getLatestCanonicalManagementPeriod() {
  return [...canonicalPeriods].sort((a, b) => a.period.localeCompare(b.period)).at(-1) ?? null
}

export function getCanonicalManagementPeriod(period: string) {
  return canonicalPeriods.find((item) => item.period === period) ?? null
}

export function getCanonicalManagementDashboardEntities(period = getLatestCanonicalManagementPeriod()): DashboardEntity[] {
  if (!period) return []
  const sourceName = period.authority.file
  const sourceReference = `${period.period} · serie canónica vigente`
  const company = period.company
  const companyEntity: DashboardEntity = {
    id: 'company:property-partners-vitacura',
    name: company.name,
    entityType: 'company',
    parentId: null,
    classification: null,
    metrics: [
      metric('management_credited_sales', 'Cierres acreditados', 'count', company.creditedClosings, sourceName, sourceReference, period.period, company.canonicalClosingTarget),
      metric('management_credited_sales_uf', 'UF acreditadas', 'uf', company.creditedSalesUf, sourceName, sourceReference, period.period, company.canonicalSalesUfTarget),
      metric('cumulative_management_credited_sales', 'Cierres acreditados acumulados', 'count', company.ytdCreditedClosings, sourceName, sourceReference, period.period, company.ytdCanonicalClosingTarget),
      metric('cumulative_management_credited_sales_uf', 'UF acreditadas acumuladas', 'uf', company.ytdCreditedSalesUf, sourceName, sourceReference, period.period, company.ytdCanonicalSalesUfTarget),
      metric('operational_sales', 'Cierres operacionales', 'count', company.operationalClosings ?? null, sourceName, sourceReference, period.period),
      metric('operational_sales_uf', 'UF operacionales', 'uf', company.operationalSalesUf ?? null, sourceName, sourceReference, period.period),
      metric('stock', 'Cartera publicada', 'count', company.stock ?? null, sourceName, sourceReference, period.period),
      metric('captations', 'Captaciones', 'count', company.captures ?? null, sourceName, sourceReference, period.period),
      metric('leads', 'Leads', 'count', company.leads ?? null, sourceName, sourceReference, period.period),
      metric('requirements', 'Requerimientos', 'count', company.requirements ?? null, sourceName, sourceReference, period.period),
      metric('scheduled_visits', 'Visitas agendadas', 'count', company.scheduledVisits ?? null, sourceName, sourceReference, period.period),
      metric('realized_visits', 'Visitas realizadas', 'count', company.realizedVisits ?? null, sourceName, sourceReference, period.period),
      metric('management_score', 'Calidad de gestión', 'score', company.managementScore, sourceName, sourceReference, period.period, 70),
      metric('portfolio_score', 'Calidad de cartera', 'score', company.portfolioScore, sourceName, sourceReference, period.period, 70),
      metric('follow_up_score', 'Seguimiento', 'score', company.followUpScore, sourceName, sourceReference, period.period, 70),
      metric('conversion', 'Conversión', 'score', company.conversionScore, sourceName, sourceReference, period.period, 70),
    ].filter((item) => item.value !== null),
    evolution: canonicalPeriods.map((item) => ({
      period: item.period,
      sales: item.company.creditedClosings,
      salesTarget: item.company.canonicalClosingTarget,
      salesUf: item.company.creditedSalesUf,
      salesUfTarget: item.company.canonicalSalesUfTarget,
      cumulativeSales: item.company.ytdCreditedClosings,
      cumulativeSalesTarget: item.company.ytdCanonicalClosingTarget,
      metrics: {
        management_score: item.company.managementScore,
        portfolio_score: item.company.portfolioScore,
        follow_up_score: item.company.followUpScore,
        conversion: item.company.conversionScore,
      },
    })),
  }

  return [companyEntity, ...period.offices.map((office) => officeEntity(period, office))]
}
