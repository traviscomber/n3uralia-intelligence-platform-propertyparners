import { CRM_INTELLIGENCE } from '@/lib/crm-snapshot'

export type TemporalMetricKey =
  | 'salesCount'
  | 'salesUf'
  | 'capturesCount'
  | 'newLeadsCount'
  | 'requirementsCount'
  | 'visitsCount'
  | 'realizedVisitsCount'
  | 'stockCount'

export type TemporalComparison = {
  metric: TemporalMetricKey
  label: string
  currentPeriod: string
  comparisonPeriod: string | null
  currentValue: number | null
  comparisonValue: number | null
  absoluteChange: number | null
  changePct: number | null
  direction: 'up' | 'down' | 'flat' | 'unavailable'
  comparisonType: 'mom' | 'yoy'
  methodology: string
}

const METRIC_LABELS: Record<TemporalMetricKey, string> = {
  salesCount: 'Ventas',
  salesUf: 'UF vendidas',
  capturesCount: 'Captaciones',
  newLeadsCount: 'Leads nuevos',
  requirementsCount: 'Requerimientos',
  visitsCount: 'Visitas agendadas',
  realizedVisitsCount: 'Visitas realizadas',
  stockCount: 'Stock publicado',
}

function asNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function calculateChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) {
    return { absoluteChange: null, changePct: null, direction: 'unavailable' as const }
  }

  const absoluteChange = current - previous
  const changePct = previous === 0
    ? null
    : Number(((absoluteChange / Math.abs(previous)) * 100).toFixed(1))

  return {
    absoluteChange,
    changePct,
    direction: absoluteChange > 0 ? 'up' as const : absoluteChange < 0 ? 'down' as const : 'flat' as const,
  }
}

function previousMonth(period: string) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function previousYear(period: string) {
  const [year, month] = period.split('-').map(Number)
  return `${year - 1}-${String(month).padStart(2, '0')}`
}

function currentMonthValue(period: string, metric: TemporalMetricKey) {
  const month = CRM_INTELLIGENCE.months.find((item) => item.period === period)
  return month ? asNumber(month[metric]) : null
}

function baselineMonthValue(period: string, metric: TemporalMetricKey) {
  if (metric !== 'salesCount' && metric !== 'salesUf') return null
  const month = CRM_INTELLIGENCE.baseline2025.months.find((item) => item.period === period)
  return month ? asNumber(month[metric]) : null
}

export function getMoMComparison(
  metric: TemporalMetricKey,
  period = CRM_INTELLIGENCE.sourceInventory.periodEnd,
): TemporalComparison {
  const comparisonPeriod = previousMonth(period)
  const currentValue = currentMonthValue(period, metric)
  const comparisonValue = currentMonthValue(comparisonPeriod, metric)
  const change = calculateChange(currentValue, comparisonValue)

  return {
    metric,
    label: METRIC_LABELS[metric],
    currentPeriod: period,
    comparisonPeriod,
    currentValue,
    comparisonValue,
    ...change,
    comparisonType: 'mom',
    methodology: 'Comparación del valor mensual contra el mes calendario inmediatamente anterior, usando registros aceptados de la misma fuente operacional.',
  }
}

export function getYoYComparison(
  metric: TemporalMetricKey,
  period = CRM_INTELLIGENCE.sourceInventory.periodEnd,
): TemporalComparison {
  const comparisonPeriod = previousYear(period)
  const currentValue = currentMonthValue(period, metric)
  const comparisonValue = baselineMonthValue(comparisonPeriod, metric)
  const change = calculateChange(currentValue, comparisonValue)

  return {
    metric,
    label: METRIC_LABELS[metric],
    currentPeriod: period,
    comparisonPeriod,
    currentValue,
    comparisonValue,
    ...change,
    comparisonType: 'yoy',
    methodology: metric === 'salesCount' || metric === 'salesUf'
      ? 'Comparación contra el mismo mes del año anterior usando la línea base histórica disponible. No se mezclan acumulados con valores mensuales.'
      : 'Comparación no disponible: la línea base histórica mensual entregada solo contiene ventas y UF vendidas.',
  }
}

export function getExecutiveTemporalSnapshot(period = CRM_INTELLIGENCE.sourceInventory.periodEnd) {
  const momMetrics: TemporalMetricKey[] = [
    'salesCount',
    'salesUf',
    'capturesCount',
    'newLeadsCount',
    'requirementsCount',
    'visitsCount',
    'realizedVisitsCount',
    'stockCount',
  ]

  const yoyMetrics: TemporalMetricKey[] = ['salesCount', 'salesUf']

  return {
    period,
    mom: momMetrics.map((metric) => getMoMComparison(metric, period)),
    yoy: yoyMetrics.map((metric) => getYoYComparison(metric, period)),
    coverage: {
      momAvailable: momMetrics.filter((metric) => getMoMComparison(metric, period).currentValue !== null && getMoMComparison(metric, period).comparisonValue !== null).length,
      momTotal: momMetrics.length,
      yoyAvailable: yoyMetrics.filter((metric) => getYoYComparison(metric, period).currentValue !== null && getYoYComparison(metric, period).comparisonValue !== null).length,
      yoyTotal: yoyMetrics.length,
    },
  }
}
