import crm from '@/data/crm-intelligence.json'
import type { ManagementReportRecord } from '@/lib/management-report-artifact'

type GoalRow = {
  metric_code: string
  period_start: string
  period_end: string
  target_value: number | string
  source_name?: string | null
  status?: string | null
  approved_at?: string | null
  formula_version?: number | null
}

type ReportLike = ManagementReportRecord & { entity_id?: string | null }

type MetricSpec = {
  key: string
  label: string
  current: (company: Record<string, unknown>, scope: Record<string, unknown>) => number | null
  deltaMode?: 'percent' | 'points'
}

type HistoricalSalesMonth = {
  period: string
  salesCount: number
  salesUf: number
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const number = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const companyOf = (report: ReportLike) => isRecord(report.snapshot?.company) ? report.snapshot.company : {}
const scopeOf = (report: ReportLike) => isRecord(report.snapshot?.scope) ? report.snapshot.scope : {}

export const creditedClosures = (report: ReportLike) => {
  const company = companyOf(report)
  const scope = scopeOf(report)
  return number(company.cierresAcreditados) ?? number(scope.managementCreditedClosures) ?? number(company.cierresOperacionales) ?? number(scope.rawOperations)
}

export const creditedSalesUf = (report: ReportLike) => {
  const company = companyOf(report)
  const scope = scopeOf(report)
  return number(company.volumenUfAcreditado) ?? number(scope.managementCreditedSalesUf) ?? number(company.volumenUfBruto) ?? number(scope.grossSalesUf)
}

export const operationalClosures = (report: ReportLike) => {
  const company = companyOf(report)
  const scope = scopeOf(report)
  return number(company.cierresOperacionales) ?? number(scope.rawOperations) ?? number(company.cierresAcreditados) ?? number(scope.managementCreditedClosures)
}

export const operationalSalesUf = (report: ReportLike) => {
  const company = companyOf(report)
  const scope = scopeOf(report)
  return number(company.volumenUfOperacionalBruto) ?? number(scope.grossSalesUf) ?? number(company.volumenUfBruto) ?? number(company.volumenUfAcreditado) ?? number(scope.managementCreditedSalesUf)
}

const historicalSalesMonths = (((crm as unknown as { baseline2025?: { months?: HistoricalSalesMonth[] } }).baseline2025?.months) ?? [])

function historicalSalesMonth(period: string) {
  return historicalSalesMonths.find((month) => month.period === period) ?? null
}

function historicalSalesYtd(endPeriod: string) {
  const year = endPeriod.slice(0, 4)
  const months = historicalSalesMonths.filter((month) => month.period.startsWith(year) && month.period <= endPeriod)
  if (!months.length) return null
  return {
    periodStart: `${year}-01`,
    periodEnd: endPeriod,
    salesCount: months.reduce((sum, month) => sum + month.salesCount, 0),
    salesUf: months.reduce((sum, month) => sum + month.salesUf, 0),
    months: months.length,
  }
}

const metrics: MetricSpec[] = [
  { key: 'closures', label: 'Cierres acreditados', current: (_company, _scope) => null },
  { key: 'creditedUf', label: 'Volumen acreditado', current: (_company, _scope) => null },
  { key: 'leads', label: 'Leads nuevos', current: (company) => number(company.leadsNuevos) },
  { key: 'requirements', label: 'Requerimientos', current: (company) => number(company.requerimientos) },
  { key: 'portfolio', label: 'Cartera', current: (company) => number(company.cartera) },
  { key: 'captures', label: 'Captaciones', current: (company) => number(company.captaciones) },
  { key: 'scheduledVisits', label: 'Visitas agendadas', current: (company) => number(company.visitasAgendadas) },
  { key: 'realizedVisits', label: 'Visitas realizadas', current: (company) => number(company.visitasRealizadas) },
  { key: 'visitCompliance', label: 'Cumplimiento de visitas', current: (company) => number(company.cumplimientoVisitas), deltaMode: 'points' },
  { key: 'suspended', label: 'Suspendidas', current: (company) => number(company.suspendidas) },
]

function metricValue(spec: MetricSpec, report: ReportLike): number | null {
  if (spec.key === 'closures') return creditedClosures(report)
  if (spec.key === 'creditedUf') return creditedSalesUf(report)
  return spec.current(companyOf(report), scopeOf(report))
}

function delta(current: number | null, previous: number | null, mode: 'percent' | 'points' = 'percent') {
  if (current == null || previous == null) return null
  if (mode === 'points') return { value: current - previous, unit: 'pp' as const }
  if (previous === 0) return null
  return { value: ((current / previous) - 1) * 100, unit: '%' as const }
}

function goalFor(goals: GoalRow[], metricCode: string, periodStart: string) {
  return goals.find((goal) => goal.metric_code === metricCode && goal.period_start <= periodStart && goal.period_end >= periodStart) ?? null
}

function targetComparison(actual: number | null, goal: GoalRow | null) {
  const target = goal ? number(goal.target_value) : null
  return {
    actual,
    target,
    attainmentPct: actual != null && target != null && target !== 0 ? (actual / target) * 100 : null,
    gap: actual != null && target != null ? actual - target : null,
    status: goal?.status ?? null,
    sourceName: goal?.source_name ?? null,
    approvedAt: goal?.approved_at ?? null,
    formulaVersion: goal?.formula_version ?? null,
    officialForScoring: String(goal?.status ?? '').toLowerCase() === 'approved' && Boolean(goal?.approved_at),
  }
}

export function buildManagementReportComparisons(args: {
  current: ReportLike
  previous?: ReportLike | null
  samePeriodPriorYear?: ReportLike | null
  ytdReports?: ReportLike[]
  goals?: GoalRow[]
}) {
  const { current, previous = null, samePeriodPriorYear = null, ytdReports = [], goals = [] } = args
  const mom = previous
    ? Object.fromEntries(metrics.map((spec) => {
        const currentValue = metricValue(spec, current)
        const previousValue = metricValue(spec, previous)
        return [spec.key, {
          label: spec.label,
          current: currentValue,
          previous: previousValue,
          delta: delta(currentValue, previousValue, spec.deltaMode),
        }]
      }))
    : null

  const salesGoal = goalFor(goals, 'sales', current.period_start)
  const leadsGoal = goalFor(goals, 'leads', current.period_start)
  const currentTargets = {
    sales: targetComparison(creditedClosures(current), salesGoal),
    leads: targetComparison(number(companyOf(current).leadsNuevos), leadsGoal),
  }

  const currentYear = current.period_start.slice(0, 4)
  const throughCurrent = ytdReports
    .filter((report) => report.period_start.startsWith(currentYear) && report.period_start <= current.period_start)
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
  const ytdClosures = throughCurrent.reduce((sum, report) => sum + (creditedClosures(report) ?? 0), 0)
  const ytdOperationalClosures = throughCurrent.reduce((sum, report) => sum + (operationalClosures(report) ?? 0), 0)
  const ytdOperationalUf = throughCurrent.reduce((sum, report) => sum + (operationalSalesUf(report) ?? 0), 0)
  const ytdSalesGoals = goals.filter((goal) => goal.metric_code === 'sales' && goal.period_start.startsWith(currentYear) && goal.period_start <= current.period_start)
  const ytdSalesTarget = ytdSalesGoals.reduce((sum, goal) => sum + (number(goal.target_value) ?? 0), 0)

  const priorYearPeriod = `${Number(currentYear) - 1}-${current.period_start.slice(5, 7)}`
  const historicalMonth = historicalSalesMonth(priorYearPeriod)
  const historicalYtd = historicalSalesYtd(priorYearPeriod)

  const priorOperationalClosures = samePeriodPriorYear ? operationalClosures(samePeriodPriorYear) : historicalMonth?.salesCount ?? null
  const priorOperationalUf = samePeriodPriorYear ? operationalSalesUf(samePeriodPriorYear) : historicalMonth?.salesUf ?? null
  const yoySource = samePeriodPriorYear ? 'canonical-monthly-report' : historicalMonth ? 'crm-intelligence.baseline2025' : null

  const yoy = priorOperationalClosures != null || priorOperationalUf != null
    ? {
        status: 'exact_operational' as const,
        period: priorYearPeriod,
        source: yoySource,
        dimension: 'operational_corporate' as const,
        closures: {
          current: operationalClosures(current),
          previous: priorOperationalClosures,
          delta: delta(operationalClosures(current), priorOperationalClosures),
        },
        salesUf: {
          current: operationalSalesUf(current),
          previous: priorOperationalUf,
          delta: delta(operationalSalesUf(current), priorOperationalUf),
        },
        managementCredited: {
          currentClosures: creditedClosures(current),
          currentSalesUf: creditedSalesUf(current),
          previousClosures: null,
          previousSalesUf: null,
          status: 'prior_year_credit_dimension_unavailable' as const,
        },
      }
    : {
        status: 'same_period_not_canonicalized' as const,
        period: priorYearPeriod,
      }

  const operationalYoyYtd = historicalYtd
    ? {
        status: 'exact_operational' as const,
        periodStart: historicalYtd.periodStart,
        periodEnd: historicalYtd.periodEnd,
        source: 'crm-intelligence.baseline2025' as const,
        closures: {
          current: ytdOperationalClosures,
          previous: historicalYtd.salesCount,
          delta: delta(ytdOperationalClosures, historicalYtd.salesCount),
        },
        salesUf: {
          current: ytdOperationalUf,
          previous: historicalYtd.salesUf,
          delta: delta(ytdOperationalUf, historicalYtd.salesUf),
        },
        managementCreditedClosures: ytdClosures,
        historicalCreditDimensionAvailable: false,
      }
    : null

  return {
    generatedFrom: 'canonical-monthly-reports+management-goals+crm-2025-baseline',
    mom: previous ? { status: 'exact', previousPeriod: previous.period_start.slice(0, 7), metrics: mom } : { status: 'no_previous_month', metrics: null },
    targets: {
      current: currentTargets,
      ytd: {
        closures: ytdClosures,
        target: ytdSalesTarget || null,
        attainmentPct: ytdSalesTarget ? (ytdClosures / ytdSalesTarget) * 100 : null,
        goalStatus: ytdSalesGoals.length ? (ytdSalesGoals.every((goal) => String(goal.status).toLowerCase() === 'approved' && goal.approved_at) ? 'approved' : 'documentary') : 'missing',
        officialForScoring: ytdSalesGoals.length > 0 && ytdSalesGoals.every((goal) => String(goal.status).toLowerCase() === 'approved' && Boolean(goal.approved_at)),
      },
    },
    yoy,
    operationalYoyYtd,
  }
}

export function enrichManagementReportWithComparisons<T extends ReportLike>(report: T, comparisons: ReturnType<typeof buildManagementReportComparisons>): T {
  const snapshot = isRecord(report.snapshot) ? { ...report.snapshot } : {}
  snapshot.comparisons = comparisons

  const notes = Array.isArray(snapshot.qualityNotes) ? snapshot.qualityNotes.filter((value): value is string => typeof value === 'string') : []
  const momMetrics = comparisons.mom.status === 'exact' ? comparisons.mom.metrics : null
  const closuresMom = momMetrics && isRecord(momMetrics.closures) ? momMetrics.closures : null
  const leadsMom = momMetrics && isRecord(momMetrics.leads) ? momMetrics.leads : null
  const closureDelta = closuresMom && isRecord(closuresMom.delta) ? number(closuresMom.delta.value) : null
  const leadsDelta = leadsMom && isRecord(leadsMom.delta) ? number(leadsMom.delta.value) : null
  if (closureDelta != null && leadsDelta != null) {
    notes.unshift(`Comparación MoM exacta: cierres acreditados ${closureDelta >= 0 ? '+' : ''}${closureDelta.toFixed(1)}% y leads nuevos ${leadsDelta >= 0 ? '+' : ''}${leadsDelta.toFixed(1)}% versus ${comparisons.mom.previousPeriod}.`)
  }

  const salesTarget = comparisons.targets.current.sales
  if (salesTarget.target != null && salesTarget.actual != null && salesTarget.attainmentPct != null) {
    const qualifier = salesTarget.officialForScoring ? 'meta aprobada' : 'meta documental asignada; comparación informativa, no scoring oficial'
    notes.unshift(`Meta de cierres: ${salesTarget.actual.toLocaleString('es-CL')} / ${salesTarget.target.toLocaleString('es-CL')} = ${salesTarget.attainmentPct.toFixed(1)}% (${qualifier}).`)
  }

  const ytd = comparisons.targets.ytd
  if (ytd.target != null) {
    notes.unshift(`Acumulado año a la fecha: ${ytd.closures.toLocaleString('es-CL')} cierres acreditados / ${ytd.target.toLocaleString('es-CL')} de referencia = ${(ytd.attainmentPct ?? 0).toFixed(1)}%.`)
  }

  if (comparisons.yoy.status === 'exact_operational') {
    const closingDelta = comparisons.yoy.closures.delta?.value ?? null
    const ufDelta = comparisons.yoy.salesUf.delta?.value ?? null
    if (closingDelta != null && ufDelta != null) {
      notes.unshift(`YoY operacional exacto vs ${comparisons.yoy.period}: cierres ${closingDelta >= 0 ? '+' : ''}${closingDelta.toFixed(1)}% y volumen UF ${ufDelta >= 0 ? '+' : ''}${ufDelta.toFixed(1)}%. El crédito de gestión se mantiene separado porque 2025 no posee esa dimensión.`)
    }
  }

  snapshot.qualityNotes = [...new Set(notes)]
  return { ...report, snapshot }
}
