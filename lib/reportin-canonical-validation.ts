import { createHash } from 'node:crypto'

export type CanonicalValidationPayload = {
  title: string
  client: string
  sourceSnapshotId: string
  period: { start: string; end: string; sourceCutoff: string }
  evidence: Array<{ id: string; claim: string; source: string; status?: string }>
  metrics?: Array<{ evidenceRefs: string[] }>
  charts?: Array<{
    id: string
    title: string
    purpose: string
    sourceNote: string
    type: 'bar' | 'grouped_bar' | 'line' | 'combo_bar_line' | 'progress' | 'donut'
    status: 'verified' | 'partial' | 'not_evaluable'
    categories: string[]
    evidenceRefs: string[]
    targetSeriesId?: string
    series: Array<{
      id: string
      label: string
      unit: string
      values: Array<number | null>
      evidenceRefs: string[]
      methodologyVersion?: string
    }>
  }>
}

export class CanonicalReportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanonicalReportValidationError'
  }
}

function fail(message: string): never {
  throw new CanonicalReportValidationError(message)
}

function validateRefs(refs: unknown, evidenceIds: ReadonlySet<string>, path: string) {
  if (!Array.isArray(refs) || refs.length === 0 || refs.some((ref) => typeof ref !== 'string' || !ref)) {
    fail(`missing_or_invalid:${path}`)
  }
  const unknown = refs.filter((ref) => !evidenceIds.has(ref as string))
  if (unknown.length) fail(`unknown_evidence:${path}:${unknown.join(',')}`)
}

export function createCanonicalSnapshotId(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function validateCanonicalReportPayload(payload: CanonicalValidationPayload): void {
  for (const field of ['title', 'client', 'sourceSnapshotId'] as const) {
    if (typeof payload[field] !== 'string' || !payload[field].trim()) fail(`missing_or_invalid:${field}`)
  }

  const { start, end, sourceCutoff } = payload.period ?? {}
  if (![start, end, sourceCutoff].every((value) => typeof value === 'string' && value)) {
    fail('missing_or_invalid:period_dates')
  }
  if (start > end || end > sourceCutoff) fail('invalid:period_order')

  if (!Array.isArray(payload.evidence) || payload.evidence.length === 0) fail('missing_or_invalid:evidence')
  const evidenceIds = new Set<string>()
  payload.evidence.forEach((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) fail(`invalid:evidence[${index}].id`)
    if (typeof item.claim !== 'string' || !item.claim.trim()) fail(`invalid:evidence[${index}].claim`)
    if (typeof item.source !== 'string' || !item.source.trim()) fail(`invalid:evidence[${index}].source`)
    if (item.status !== undefined && typeof item.status !== 'string') fail(`invalid:evidence[${index}].status`)
    if (evidenceIds.has(item.id)) fail(`duplicate_evidence:${item.id}`)
    evidenceIds.add(item.id)
  })

  ;(payload.metrics ?? []).forEach((metric, index) => validateRefs(metric.evidenceRefs, evidenceIds, `metrics[${index}].evidenceRefs`))

  ;(payload.charts ?? []).forEach((chart, chartIndex) => {
    const path = `charts[${chartIndex}]`
    if (chart.status === 'not_evaluable') fail(`not_evaluable_chart:${path}`)
    if (!chart.id || !chart.title || !chart.purpose || !chart.sourceNote) fail(`missing_or_invalid:${path}`)
    validateRefs(chart.evidenceRefs, evidenceIds, `${path}.evidenceRefs`)
    if (!Array.isArray(chart.categories) || chart.categories.length === 0 || chart.categories.some((value) => !value)) {
      fail(`missing_or_invalid:${path}.categories`)
    }
    if (!Array.isArray(chart.series) || chart.series.length === 0) fail(`missing_or_invalid:${path}.series`)

    const methodologyVersions = new Set<string>()
    const numericValues: number[] = []
    chart.series.forEach((series, seriesIndex) => {
      const seriesPath = `${path}.series[${seriesIndex}]`
      if (!series.id || !series.label || !series.unit) fail(`missing_or_invalid:${seriesPath}`)
      if (!Array.isArray(series.values) || series.values.length !== chart.categories.length) fail(`invalid:${seriesPath}.values_length`)
      series.values.forEach((value) => {
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) fail(`invalid:${seriesPath}.value`)
        if (value !== null) numericValues.push(value)
      })
      validateRefs(series.evidenceRefs, evidenceIds, `${seriesPath}.evidenceRefs`)
      if (series.methodologyVersion) methodologyVersions.add(series.methodologyVersion)
    })

    if (methodologyVersions.size > 1) fail(`incompatible_methodology_versions:${path}`)
    if (chart.type === 'donut') {
      if (chart.series.length !== 1) fail(`invalid:${path}.donut_series_count`)
      if (numericValues.some((value) => value < 0) || Math.abs(numericValues.reduce((sum, value) => sum + value, 0) - 100) > 0.2) {
        fail(`invalid:${path}.donut_total`)
      }
    }
    if (chart.targetSeriesId && !chart.series.some((series) => series.id === chart.targetSeriesId)) {
      fail(`invalid:${path}.targetSeriesId`)
    }
  })
}
