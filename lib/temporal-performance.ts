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

export type TemporalDirection = 'up' | 'down' | 'flat' | 'unavailable'
export type TemporalMomentum = 'accelerating' | 'decelerating' | 'stable' | 'insufficient_data'
export type TemporalSignalLevel = 'positive' | 'warning' | 'critical' | 'neutral' | 'unavailable'

export type TemporalComparison = {
  metric: TemporalMetricKey
  label: string
  currentPeriod: string
  comparisonPeriod: string | null
  currentValue: number | null
  comparisonValue: number | null
  absoluteChange: number | null
  changePct: number | null
  direction: TemporalDirection
  comparisonType: 'mom' | 'yoy'
  methodology: string
}

export type TemporalTrend = {
  metric: TemporalMetricKey
  label: string
  period: string
  latestValue: number | null
  previousValue: number | null
  priorValue: number | null
  currentChangePct: number | null
  previousChangePct: number | null
  momentum: TemporalMomentum
  streakDirection: Exclude<TemporalDirection, 'unavailable'> | 'none'
  streakLength: number
  recentHigh: number | null
  recentLow: number | null
  anomaly: boolean
  anomalyReason: string | null
  signalLevel: TemporalSignalLevel
  summary: string
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

function previousMonth(period: string, offset = 1) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 - offset, 1))
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

function getMetricSeries(metric: TemporalMetricKey, period: string, limit = 6) {
  return CRM_INTELLIGENCE.months
    .filter((month) => month.period <= period)
    .slice(-limit)
    .map((month) => ({ period: month.period, value: asNumber(month[metric]) }))
    .filter((item): item is { period: string; value: number } => item.value !== null)
}

function calculateStreak(values: number[]) {
  if (values.length < 2) return { direction: 'none' as const, length: 0 }

  let direction: 'up' | 'down' | 'flat' = values.at(-1)! > values.at(-2)!
    ? 'up'
    : values.at(-1)! < values.at(-2)!
      ? 'down'
      : 'flat'
  let length = 1

  for (let index = values.length - 2; index > 0; index -= 1) {
    const currentDirection = values[index] > values[index - 1]
      ? 'up'
      : values[index] < values[index - 1]
        ? 'down'
        : 'flat'

    if (currentDirection !== direction) break
    length += 1
  }

  return { direction, length }
}

function calculateMomentum(currentChangePct: number | null, previousChangePct: number | null): TemporalMomentum {
  if (currentChangePct === null || previousChangePct === null) return 'insufficient_data'
  const delta = currentChangePct - previousChangePct
  if (Math.abs(delta) < 3) return 'stable'
  return delta > 0 ? 'accelerating' : 'decelerating'
}

function detectAnomaly(values: number[]) {
  if (values.length < 4) return { anomaly: false, reason: null }
  const current = values.at(-1)!
  const history = values.slice(0, -1)
  const mean = history.reduce((sum, value) => sum + value, 0) / history.length
  const variance = history.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / history.length
  const standardDeviation = Math.sqrt(variance)

  if (standardDeviation === 0) {
    const anomaly = current !== mean
    return {
      anomaly,
      reason: anomaly ? `El valor actual (${current}) se aparta de una serie reciente sin variación (${mean}).` : null,
    }
  }

  const zScore = Math.abs((current - mean) / standardDeviation)
  const anomaly = zScore >= 2
  return {
    anomaly,
    reason: anomaly ? `El valor actual se encuentra ${zScore.toFixed(1)} desviaciones estándar fuera del promedio reciente.` : null,
  }
}

function classifySignal(metric: TemporalMetricKey, trend: Pick<TemporalTrend, 'momentum' | 'streakDirection' | 'streakLength' | 'anomaly'>): TemporalSignalLevel {
  if (trend.momentum === 'insufficient_data') return 'unavailable'
  if (trend.anomaly) return 'warning'

  const inverseMetric = metric === 'stockCount'
  const positiveDirection = inverseMetric ? 'down' : 'up'
  const negativeDirection = inverseMetric ? 'up' : 'down'

  if (trend.streakDirection === positiveDirection && trend.streakLength >= 2) return 'positive'
  if (trend.streakDirection === negativeDirection && trend.streakLength >= 3) return 'critical'
  if (trend.streakDirection === negativeDirection || trend.momentum === 'decelerating') return 'warning'
  if (trend.momentum === 'stable') return 'neutral'
  return 'positive'
}

function buildTrendSummary(trend: Omit<TemporalTrend, 'summary' | 'methodology'>) {
  if (trend.latestValue === null || trend.previousValue === null) {
    return `${trend.label}: datos insuficientes para evaluar tendencia.`
  }

  const streak = trend.streakLength > 0 && trend.streakDirection !== 'none'
    ? `Racha de ${trend.streakLength} variaciones consecutivas ${trend.streakDirection === 'up' ? 'al alza' : trend.streakDirection === 'down' ? 'a la baja' : 'sin cambio'}.`
    : 'Sin racha consistente.'
  const momentum = trend.momentum === 'accelerating'
    ? 'El ritmo está acelerando.'
    : trend.momentum === 'decelerating'
      ? 'El ritmo está desacelerando.'
      : trend.momentum === 'stable'
        ? 'El ritmo se mantiene estable.'
        : 'No hay datos suficientes para medir el ritmo.'
  const anomaly = trend.anomaly ? ` Anomalía detectada: ${trend.anomalyReason}` : ''

  return `${trend.label}: ${streak} ${momentum}${anomaly}`
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

export function getTemporalTrend(
  metric: TemporalMetricKey,
  period = CRM_INTELLIGENCE.sourceInventory.periodEnd,
): TemporalTrend {
  const series = getMetricSeries(metric, period, 6)
  const values = series.map((item) => item.value)
  const latestValue = values.at(-1) ?? null
  const previousValue = values.at(-2) ?? null
  const priorValue = values.at(-3) ?? null
  const currentChange = calculateChange(latestValue, previousValue)
  const previousChange = calculateChange(previousValue, priorValue)
  const momentum = calculateMomentum(currentChange.changePct, previousChange.changePct)
  const streak = calculateStreak(values)
  const anomaly = detectAnomaly(values)
  const recentHigh = values.length > 0 ? Math.max(...values) : null
  const recentLow = values.length > 0 ? Math.min(...values) : null

  const baseTrend = {
    metric,
    label: METRIC_LABELS[metric],
    period,
    latestValue,
    previousValue,
    priorValue,
    currentChangePct: currentChange.changePct,
    previousChangePct: previousChange.changePct,
    momentum,
    streakDirection: streak.direction,
    streakLength: streak.length,
    recentHigh,
    recentLow,
    anomaly: anomaly.anomaly,
    anomalyReason: anomaly.reason,
  }

  const signalLevel = classifySignal(metric, baseTrend)

  return {
    ...baseTrend,
    signalLevel,
    summary: buildTrendSummary({ ...baseTrend, signalLevel }),
    methodology: 'Análisis determinístico de hasta seis cortes mensuales consecutivos. La aceleración compara la variación porcentual actual con la previa; la racha exige movimientos consecutivos en la misma dirección; la anomalía requiere al menos cuatro observaciones y un desvío de dos desviaciones estándar.',
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
  const mom = momMetrics.map((metric) => getMoMComparison(metric, period))
  const yoy = yoyMetrics.map((metric) => getYoYComparison(metric, period))
  const trends = momMetrics.map((metric) => getTemporalTrend(metric, period))

  return {
    period,
    mom,
    yoy,
    trends,
    executiveSignals: trends.filter((trend) => trend.signalLevel === 'critical' || trend.signalLevel === 'warning' || trend.anomaly),
    coverage: {
      momAvailable: mom.filter((comparison) => comparison.currentValue !== null && comparison.comparisonValue !== null).length,
      momTotal: momMetrics.length,
      yoyAvailable: yoy.filter((comparison) => comparison.currentValue !== null && comparison.comparisonValue !== null).length,
      yoyTotal: yoyMetrics.length,
      trendAvailable: trends.filter((trend) => trend.momentum !== 'insufficient_data').length,
      trendTotal: trends.length,
    },
  }
}
