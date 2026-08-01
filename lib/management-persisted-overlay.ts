export type ManagementMetricUnit = 'count' | 'uf' | 'percent' | 'days' | 'score'

export type DashboardMetric = {
  code: string
  label: string
  unit: ManagementMetricUnit
  methodology?: string
  value: number | null
  target: number | null
  compliance: number | null
  mom: number | null
  yoy?: number | null
  previousYearValue?: number | null
  comparisonPeriod?: string | null
  reportedYoy?: number | null
  qualityNotes?: string[]
  sourceName?: string
  sourceReference?: string
  periodStart?: string
  periodEnd?: string
  qualityStatus?: string
  dataLayer?: 'documentary' | 'persisted_approved'
}

export type DashboardEvolution = {
  period: string
  sales: number | null
  salesTarget: number | null
  salesUf?: number | null
  salesUfTarget?: number | null
  cumulativeSales?: number | null
  cumulativeSalesTarget?: number | null
}

export type DashboardEntity = {
  id: string
  name: string
  entityType: string
  parentId: string | null
  classification?: string | null
  metrics: DashboardMetric[]
  evolution?: DashboardEvolution[]
  commercialCoverage?: unknown
}

export type PersistedManagementEntity = {
  id: string
  entity_type: string
  name: string
  parent_id: string | null
  profile_id?: string | null
}

export type PersistedMetricDefinition = {
  code: string
  label: string
  unit: string
  methodology: string
  formula_version?: number | null
}

export type ApprovedMetricValue = {
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  metric_value_id: string | null
  value: number | string | null
  formula_version?: number | null
  reconciliation_status?: string | null
  publication_status?: string | null
  approved_at?: string | null
}

export type MetricSourceValue = {
  id: string
  source_name: string
  source_reference: string | null
  source_cutoff_at: string | null
  quality_status: string
  evaluation_status: string
}

export type PersistedGoal = {
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  target_value: number | string | null
  status?: string | null
  approved_at?: string | null
  source_name?: string | null
}

type OverlayInput = {
  entities: DashboardEntity[]
  persistedEntities: PersistedManagementEntity[]
  definitions: PersistedMetricDefinition[]
  approvedValues: ApprovedMetricValue[]
  sourceValues: MetricSourceValue[]
  goals: PersistedGoal[]
}

type OverlayStats = {
  approvedMetricCount: number
  matchedEntities: number
  persistedOnlyEntities: number
  latestPeriodEnd: string | null
  mode: 'documentary' | 'hybrid'
}

const metricCodeAliases: Record<string, string> = {
  listings: 'captations',
  canonical_management_score: 'management_score',
  canonical_portfolio_score: 'portfolio_score',
  canonical_follow_up_score: 'follow_up_score',
  canonical_conversion_score: 'conversion',
}

const normalize = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const dashboardEntityType = (entityType: string) => {
  if (entityType === 'office' || entityType === 'team') return 'branch'
  if (entityType === 'partner' || entityType === 'agent') return 'partner'
  return entityType
}

const compatibleEntityType = (dashboardType: string, persistedType: string) =>
  dashboardType === dashboardEntityType(persistedType)

const numeric = (value: number | string | null | undefined) => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const percentage = (value: number | null, target: number | null) =>
  value !== null && target !== null && target !== 0 ? (value / target) * 100 : null

const variation = (current: number | null, previous: number | null) =>
  current !== null && previous !== null && previous !== 0 ? ((current - previous) / previous) * 100 : null

const previousYearDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setUTCFullYear(parsed.getUTCFullYear() - 1)
  return parsed.toISOString().slice(0, 10)
}

const metricKey = (entityId: string, metricCode: string, periodStart: string, periodEnd: string) =>
  `${entityId}|${metricCode}|${periodStart}|${periodEnd}`

const sourceRank = (source: MetricSourceValue | undefined) => {
  if (!source) return 0
  if (source.quality_status === 'verified' && source.evaluation_status === 'evaluable') return 3
  if (source.quality_status === 'provisional' && source.evaluation_status === 'evaluable') return 2
  return 1
}

function chooseApprovedValues(values: ApprovedMetricValue[], sources: Map<string, MetricSourceValue>) {
  const selected = new Map<string, ApprovedMetricValue>()
  for (const value of values) {
    const key = metricKey(value.entity_id, value.metric_code, value.period_start, value.period_end)
    const existing = selected.get(key)
    if (!existing) {
      selected.set(key, value)
      continue
    }
    const valueSource = value.metric_value_id ? sources.get(value.metric_value_id) : undefined
    const existingSource = existing.metric_value_id ? sources.get(existing.metric_value_id) : undefined
    const rankDelta = sourceRank(valueSource) - sourceRank(existingSource)
    if (rankDelta > 0 || (rankDelta === 0 && String(value.approved_at ?? '') > String(existing.approved_at ?? ''))) {
      selected.set(key, value)
    }
  }
  return [...selected.values()]
}

function approvedGoalMap(goals: PersistedGoal[]) {
  const map = new Map<string, PersistedGoal>()
  for (const goal of goals) {
    if (goal.status !== 'approved' && !goal.approved_at) continue
    map.set(metricKey(goal.entity_id, goal.metric_code, goal.period_start, goal.period_end), goal)
  }
  return map
}

function latestMetricRows(rows: ApprovedMetricValue[]) {
  const map = new Map<string, ApprovedMetricValue>()
  for (const row of rows) {
    const key = `${row.entity_id}|${row.metric_code}`
    const existing = map.get(key)
    if (!existing || row.period_end > existing.period_end || (row.period_end === existing.period_end && row.period_start > existing.period_start)) {
      map.set(key, row)
    }
  }
  return [...map.values()]
}

function findPrevious(rows: ApprovedMetricValue[], current: ApprovedMetricValue) {
  return rows
    .filter((row) => row.entity_id === current.entity_id && row.metric_code === current.metric_code && row.period_end < current.period_end)
    .sort((left, right) => right.period_end.localeCompare(left.period_end))[0]
}

function findPriorYear(rows: ApprovedMetricValue[], current: ApprovedMetricValue) {
  const expectedEnd = previousYearDate(current.period_end)
  if (!expectedEnd) return undefined
  return rows.find((row) => row.entity_id === current.entity_id && row.metric_code === current.metric_code && row.period_end === expectedEnd)
}

function createPersistedMetric(
  row: ApprovedMetricValue,
  allRows: ApprovedMetricValue[],
  definitions: Map<string, PersistedMetricDefinition>,
  sources: Map<string, MetricSourceValue>,
  goals: Map<string, PersistedGoal>,
): DashboardMetric {
  const definition = definitions.get(row.metric_code)
  const source = row.metric_value_id ? sources.get(row.metric_value_id) : undefined
  const goal = goals.get(metricKey(row.entity_id, row.metric_code, row.period_start, row.period_end))
  const previous = findPrevious(allRows, row)
  const priorYear = findPriorYear(allRows, row)
  const value = numeric(row.value)
  const target = numeric(goal?.target_value)
  const displayCode = metricCodeAliases[row.metric_code] ?? row.metric_code
  const unit = ['count', 'uf', 'percent', 'days', 'score'].includes(definition?.unit ?? '')
    ? definition!.unit as ManagementMetricUnit
    : 'count'

  return {
    code: displayCode,
    label: definition?.label ?? row.metric_code,
    unit,
    methodology: `${definition?.methodology ?? 'Métrica persistida.'} Valor reconciliado y aprobado para publicación.`,
    value,
    target,
    compliance: percentage(value, target),
    mom: variation(value, numeric(previous?.value)),
    yoy: variation(value, numeric(priorYear?.value)),
    previousYearValue: numeric(priorYear?.value),
    comparisonPeriod: priorYear ? `${row.period_start}–${row.period_end} vs ${priorYear.period_start}–${priorYear.period_end}` : null,
    reportedYoy: null,
    qualityNotes: [
      `Publicación ${row.publication_status ?? 'approved'}`,
      `Conciliación ${row.reconciliation_status ?? 'aprobada'}`,
      `Fórmula v${row.formula_version ?? definition?.formula_version ?? 1}`,
      ...(row.approved_at ? [`Aprobado ${row.approved_at}`] : []),
    ],
    sourceName: source?.source_name ?? 'Métrica aprobada',
    sourceReference: source?.source_reference ?? goal?.source_name ?? null,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    qualityStatus: 'approved_verified',
    dataLayer: 'persisted_approved',
  }
}

function mergeEvolution(
  existing: DashboardEvolution[] | undefined,
  rows: ApprovedMetricValue[],
  goalMap: Map<string, PersistedGoal>,
) {
  const byPeriod = new Map((existing ?? []).map((item) => [item.period, { ...item }]))
  for (const row of rows) {
    if (!['sales', 'sales_uf'].includes(row.metric_code)) continue
    const period = row.period_start.slice(0, 7)
    const current = byPeriod.get(period) ?? { period, sales: null, salesTarget: null }
    const goal = goalMap.get(metricKey(row.entity_id, row.metric_code, row.period_start, row.period_end))
    if (row.metric_code === 'sales') {
      current.sales = numeric(row.value)
      current.salesTarget = numeric(goal?.target_value)
    } else {
      current.salesUf = numeric(row.value)
      current.salesUfTarget = numeric(goal?.target_value)
    }
    byPeriod.set(period, current)
  }
  return [...byPeriod.values()].sort((left, right) => left.period.localeCompare(right.period))
}

function emptyCommercialCoverage() {
  return {
    captations: {
      available: false,
      reason: 'Sin métrica aprobada de captaciones para el período visible.',
    },
    portfolioNetChange: {
      available: false,
      currentStock: null,
      previousStock: null,
      netChange: null,
      netChangePercent: null,
      currentPeriod: '',
      previousPeriod: '',
      methodology: 'Sin serie persistida suficiente.',
    },
    yoy: {
      available: false,
      comparisonPeriod: null,
      cumulativeComparisonPeriod: null,
      qualityNotes: [],
    },
  }
}

export function overlayApprovedManagementMetrics(input: OverlayInput): { entities: DashboardEntity[]; stats: OverlayStats } {
  const sourceMap = new Map(input.sourceValues.map((row) => [row.id, row]))
  const selectedRows = chooseApprovedValues(input.approvedValues, sourceMap)
  const definitionMap = new Map(input.definitions.map((definition) => [definition.code, definition]))
  const goalMap = approvedGoalMap(input.goals)
  const persistedEntityMap = new Map(input.persistedEntities.map((entity) => [entity.id, entity]))
  const latestRows = latestMetricRows(selectedRows)
  const rowsByEntity = new Map<string, ApprovedMetricValue[]>()

  for (const row of selectedRows) {
    const rows = rowsByEntity.get(row.entity_id) ?? []
    rows.push(row)
    rowsByEntity.set(row.entity_id, rows)
  }

  const matchedPersistedIds = new Set<string>()
  let matchedEntities = 0

  const entities = input.entities.map((entity) => {
    const persisted = input.persistedEntities.find((candidate) =>
      compatibleEntityType(entity.entityType, candidate.entity_type) && normalize(candidate.name) === normalize(entity.name),
    )
    if (!persisted) {
      return {
        ...entity,
        metrics: entity.metrics.map((item) => ({ ...item, dataLayer: item.dataLayer ?? 'documentary' })),
      }
    }

    matchedPersistedIds.add(persisted.id)
    const entityRows = rowsByEntity.get(persisted.id) ?? []
    if (!entityRows.length) {
      return {
        ...entity,
        metrics: entity.metrics.map((item) => ({ ...item, dataLayer: item.dataLayer ?? 'documentary' })),
      }
    }

    matchedEntities += 1
    const replacements = latestRows
      .filter((row) => row.entity_id === persisted.id)
      .map((row) => createPersistedMetric(row, entityRows, definitionMap, sourceMap, goalMap))
    const replacementMap = new Map(replacements.map((metric) => [metric.code, metric]))
    const existingCodes = new Set(entity.metrics.map((metric) => metric.code))

    return {
      ...entity,
      metrics: [
        ...entity.metrics.map((metric) => replacementMap.get(metric.code) ?? { ...metric, dataLayer: metric.dataLayer ?? 'documentary' as const }),
        ...replacements.filter((metric) => !existingCodes.has(metric.code)),
      ],
      evolution: mergeEvolution(entity.evolution, entityRows, goalMap),
    }
  })

  const persistedOnly = input.persistedEntities.flatMap((persisted): DashboardEntity[] => {
    if (matchedPersistedIds.has(persisted.id)) return []
    const entityRows = rowsByEntity.get(persisted.id) ?? []
    if (!entityRows.length) return []
    const type = dashboardEntityType(persisted.entity_type)
    if (!['company', 'branch', 'partner'].includes(type)) return []
    const parent = persisted.parent_id ? persistedEntityMap.get(persisted.parent_id) : undefined
    const metrics = latestRows
      .filter((row) => row.entity_id === persisted.id)
      .map((row) => createPersistedMetric(row, entityRows, definitionMap, sourceMap, goalMap))
    return [{
      id: `${type}:${slug(persisted.name)}`,
      name: persisted.name,
      entityType: type,
      parentId: parent ? `branch:${slug(parent.name)}` : null,
      classification: null,
      metrics,
      evolution: mergeEvolution([], entityRows, goalMap),
      commercialCoverage: emptyCommercialCoverage(),
    }]
  })

  const latestPeriodEnd = selectedRows.reduce<string | null>((latest, row) =>
    !latest || row.period_end > latest ? row.period_end : latest,
  null)

  return {
    entities: [...entities, ...persistedOnly],
    stats: {
      approvedMetricCount: selectedRows.length,
      matchedEntities,
      persistedOnlyEntities: persistedOnly.length,
      latestPeriodEnd,
      mode: selectedRows.length ? 'hybrid' : 'documentary',
    },
  }
}
