export type CeoOperationalMetricRow = {
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  source_name: string
  source_reference: string | null
  source_cutoff_at: string | null
  quality_status: string
  evaluation_status: string
  updated_at: string
}

export type CeoOperationalGoalRow = {
  metric_code: string
  period_start: string
  period_end: string
  target_value: number | string | null
  status: string | null
  approved_at: string | null
  source_name: string | null
}

export type CeoCurrentOperationalSnapshot = {
  period: {
    key: string
    start: string
    end: string
  }
  sales: number | null
  salesTarget: number | null
  compliance: number | null
  salesUf: number | null
  managementCreditedSales: number | null
  metrics: Record<string, number | null>
  status: 'verified_operational'
  publicationStatus: 'not_formal_monthly_close'
  goalSource: string | null
  sourceCutoffAt: string | null
  sources: Array<{
    metricCode: string
    sourceName: string
    sourceReference: string | null
  }>
}

const CEO_OPERATIONAL_CODES = new Set([
  'sales',
  'sales_uf',
  'management_credited_sales',
  'requirements',
  'leads',
  'active_leads_snapshot',
  'stale_90_leads',
  'scheduled_visits',
  'realized_visits',
  'listings',
  'stock',
  'suspended_listings',
  'canonical_follow_up_score',
])

const numeric = (value: number | string | null | undefined) => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const newestFirst = <T extends { updated_at: string }>(left: T, right: T) =>
  right.updated_at.localeCompare(left.updated_at)

export function buildCeoCurrentOperationalSnapshot(input: {
  metrics: CeoOperationalMetricRow[]
  goals: CeoOperationalGoalRow[]
}): CeoCurrentOperationalSnapshot | null {
  const verified = input.metrics.filter((row) =>
    row.quality_status === 'verified'
      && row.evaluation_status === 'evaluable'
      && numeric(row.value) !== null,
  )

  const latestSales = verified
    .filter((row) => row.metric_code === 'sales')
    .sort((left, right) => right.period_end.localeCompare(left.period_end) || newestFirst(left, right))[0]

  if (!latestSales) return null

  const samePeriod = verified
    .filter((row) => row.period_start === latestSales.period_start && row.period_end === latestSales.period_end)
    .filter((row) => CEO_OPERATIONAL_CODES.has(row.metric_code))

  const byCode = new Map<string, CeoOperationalMetricRow>()
  for (const row of samePeriod.sort(newestFirst)) {
    if (!byCode.has(row.metric_code)) byCode.set(row.metric_code, row)
  }

  const approvedGoal = input.goals
    .filter((goal) =>
      goal.metric_code === 'sales'
        && goal.period_start === latestSales.period_start
        && goal.period_end === latestSales.period_end
        && goal.status === 'approved'
        && Boolean(goal.approved_at)
        && numeric(goal.target_value) !== null,
    )
    .sort((left, right) => String(right.approved_at).localeCompare(String(left.approved_at)))[0]

  const sales = numeric(byCode.get('sales')?.value)
  const salesTarget = numeric(approvedGoal?.target_value)
  const compliance = sales !== null && salesTarget !== null && salesTarget !== 0
    ? (sales / salesTarget) * 100
    : null

  const metrics = Object.fromEntries(
    [...CEO_OPERATIONAL_CODES]
      .filter((code) => !['sales', 'sales_uf', 'management_credited_sales'].includes(code))
      .map((code) => [code, numeric(byCode.get(code)?.value)]),
  )

  const sourceCutoffAt = samePeriod.reduce<string | null>((latest, row) => {
    if (!row.source_cutoff_at) return latest
    return !latest || row.source_cutoff_at > latest ? row.source_cutoff_at : latest
  }, null)

  const sources = samePeriod
    .filter((row) => ['sales', 'sales_uf', 'requirements', 'leads', 'scheduled_visits', 'realized_visits', 'listings', 'stock'].includes(row.metric_code))
    .map((row) => ({ metricCode: row.metric_code, sourceName: row.source_name, sourceReference: row.source_reference }))
    .filter((row, index, all) => all.findIndex((candidate) =>
      candidate.metricCode === row.metricCode
        && candidate.sourceName === row.sourceName
        && candidate.sourceReference === row.sourceReference,
    ) === index)

  return {
    period: {
      key: latestSales.period_start.slice(0, 7),
      start: latestSales.period_start,
      end: latestSales.period_end,
    },
    sales,
    salesTarget,
    compliance,
    salesUf: numeric(byCode.get('sales_uf')?.value),
    managementCreditedSales: numeric(byCode.get('management_credited_sales')?.value),
    metrics,
    status: 'verified_operational',
    publicationStatus: 'not_formal_monthly_close',
    goalSource: approvedGoal?.source_name ?? null,
    sourceCutoffAt,
    sources,
  }
}
