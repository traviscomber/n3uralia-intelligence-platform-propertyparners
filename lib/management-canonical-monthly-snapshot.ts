import { getCanonicalManagementDashboardEntities, getCanonicalManagementPeriod } from './management-canonical-periods'

type CanonicalMonthlyTrigger = 'cron' | 'manual' | 'upload' | string

const monthEnd = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return null
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${period}-${String(lastDay).padStart(2, '0')}`
}

const percentage = (numerator: number | null | undefined, denominator: number | null | undefined) =>
  numerator != null && denominator != null && denominator !== 0
    ? (numerator / denominator) * 100
    : null

const missingMetricReason = (label: string) =>
  `${label} no está publicada por la autoridad documental canónica de este período; se conserva como N/D y no se infiere.`

export function buildCanonicalMonthlySnapshot(
  periodLabel: string,
  generatedAt: string,
  trigger: CanonicalMonthlyTrigger,
) {
  const period = getCanonicalManagementPeriod(periodLabel)
  const periodEnd = monthEnd(periodLabel)
  if (!period || !periodEnd) return null

  const company = period.company
  const entities = getCanonicalManagementDashboardEntities(period)
  const requiredOperational = [
    { code: 'stock', label: 'Cartera', value: company.stock },
    { code: 'captations', label: 'Captaciones', value: company.captures },
    { code: 'leads', label: 'Leads nuevos', value: company.leads },
    { code: 'requirements', label: 'Requerimientos', value: company.requirements },
    { code: 'scheduled_visits', label: 'Visitas agendadas', value: company.scheduledVisits },
    { code: 'realized_visits', label: 'Visitas realizadas', value: company.realizedVisits },
    { code: 'suspended_listings', label: 'Propiedades suspendidas', value: null },
  ]
  const missing = requiredOperational.filter((metric) => metric.value == null)

  return {
    schemaVersion: 'canonical-monthly-report-v1',
    trigger,
    generatedAt,
    period: {
      start: `${period.period}-01`,
      end: periodEnd,
      label: period.period,
    },
    scope: {
      type: 'global',
      id: null,
      name: company.name,
    },
    company: {
      cartera: company.stock ?? null,
      captaciones: company.captures ?? null,
      leadsNuevos: company.leads ?? null,
      requerimientos: company.requirements ?? null,
      visitasAgendadas: company.scheduledVisits ?? null,
      visitasRealizadas: company.realizedVisits ?? null,
      cumplimientoVisitas: percentage(company.realizedVisits, company.scheduledVisits),
      cierresAcreditados: company.creditedClosings,
      cierresOperacionales: company.operationalClosings ?? null,
      volumenUfAcreditado: company.creditedSalesUf,
      volumenUfBruto: company.creditedSalesUf,
      suspendidas: null,
      productividad: null,
      scoreGestion: company.managementScore,
      scoreCartera: company.portfolioScore,
      scoreSeguimiento: company.followUpScore,
      scoreConversion: company.conversionScore,
      metaCierres: company.canonicalClosingTarget,
      metaUf: company.canonicalSalesUfTarget,
      cierresYtd: company.ytdCreditedClosings,
      ufYtd: company.ytdCreditedSalesUf,
      metaCierresYtd: company.ytdCanonicalClosingTarget,
      metaUfYtd: company.ytdCanonicalSalesUfTarget,
    },
    offices: period.offices.map((office) => ({
      name: office.name,
      cierresAcreditados: office.creditedClosings,
      volumenUfAcreditado: office.creditedSalesUf,
      metaCierres: office.canonicalClosingTarget ?? null,
      cartera: office.stock ?? null,
      captaciones: office.captures ?? null,
      leadsNuevos: office.leads ?? null,
      requerimientos: office.requirements ?? null,
      visitasAgendadas: office.scheduledVisits ?? null,
      visitasRealizadas: office.realizedVisits ?? null,
      scoreGestion: office.managementScore ?? null,
      scoreCartera: office.portfolioScore ?? null,
      scoreSeguimiento: office.followUpScore ?? null,
      scoreConversion: office.conversionScore ?? null,
    })),
    completeness: {
      operationalReportReady: missing.length === 0,
      fullManagementScoreReady: company.managementScore != null,
      blocked: missing.map((metric) => ({
        code: metric.code,
        reason: missingMetricReason(metric.label),
      })),
    },
    provenance: {
      sourceFiles: [period.authority.file],
      sourceAuthority: {
        file: period.authority.file,
        sha256: period.authority.sha256,
        kind: period.authority.kind,
        restatesManagementSeriesThrough: period.authority.restatesManagementSeriesThrough ?? null,
      },
      dataLayer: 'documentary',
    },
    qualityNotes: [
      'Snapshot mensual construido desde la autoridad documental canónica vigente del período.',
      'Los valores faltantes permanecen como N/D; no se sustituyen con cero, promedios ni inferencias.',
      'La distribución externa es independiente del archivo interno de revisión.',
    ],
    warnings: [],
    alertEvaluation: null,
    entities,
  }
}
