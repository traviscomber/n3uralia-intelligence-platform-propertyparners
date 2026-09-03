import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CanonicalCeoIntelligenceInput,
  CeoEvidence,
  CeoEvidenceStatus,
  CeoKpi,
  CeoMarketGeometry,
  CeoMarketPolygon,
  CeoMarketRow,
  CeoMonthlyPoint,
  CeoOfficeSnapshot,
} from '@/lib/property-partners-ceo-intelligence-report'

type MetricRow = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  source_name: string
  source_reference: string | null
  source_cutoff_at: string | null
  quality_status: string
  evaluation_status: string
  formula_version: number
  updated_at: string
}

type EntityRow = { id: string; entity_type: string; name: string }
type DefinitionRow = { code: string; label: string; unit: string }
type GoalRow = { id: string; status: string }
type MarketPolygonRow = {
  barrio_id: string
  barrio_nombre: string
  fuente: string
  version: string
  geometry: unknown
}
type MarketIntelligenceRow = {
  id: number
  neighborhood_name: string
  property_type: string
  portal_listings: number | null
  cbrs_transactions: number | null
  portal_median_price_uf: number | string | null
  cbrs_median_price_uf: number | string | null
  portal_median_uf_m2: number | string | null
  cbrs_median_uf_m2: number | string | null
  uf_m2_gap_pct: number | string | null
  supply_depth_ratio: number | string | null
  signal: string | null
  confidence: string | null
  as_of_portal: string | null
  as_of_cbrs: string | null
}
type ValuationRow = { id: string; status: string; valuation_date: string }

const COMPANY_KPI_CODES = [
  'sales',
  'sales_uf',
  'goal_compliance',
  'leads',
  'realized_visits',
  'listings',
  'stock',
  'suspended_listings',
  'canonical_follow_up_score',
] as const

const FUNNEL_CODES = ['requirements', 'leads', 'scheduled_visits', 'realized_visits', 'sales'] as const
const OFFICE_CODES = [
  'management_credited_sales',
  'management_credited_sales_uf',
  'canonical_follow_up_score',
  'realized_visits',
  'scheduled_visits',
  'stale_90_leads',
  'stale_15a_leads',
  'stock',
  'suspended_listings',
  'listings',
] as const

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function metricStatus(row: MetricRow | null): CeoEvidenceStatus {
  if (!row) return 'not_evaluable'
  return row.quality_status === 'verified' && row.evaluation_status === 'evaluable'
    ? 'verified'
    : row.evaluation_status === 'not_evaluable'
      ? 'not_evaluable'
      : 'partial'
}

function metricEvidenceId(row: MetricRow) {
  return `metric:${row.entity_id}:${row.metric_code}:${row.period_start}:${row.period_end}`
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function isoDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function normalizeGeometry(value: unknown): CeoMarketGeometry | null {
  let parsed = value
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) as unknown } catch { return null }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const geometry = record.type === 'Feature' && record.geometry && typeof record.geometry === 'object'
    ? record.geometry as Record<string, unknown>
    : record
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null
  if (!Array.isArray(geometry.coordinates)) return null
  return {
    type: geometry.type,
    coordinates: geometry.coordinates as CeoMarketGeometry['coordinates'],
  }
}

function currentPreviousPeriod(periodStart: string) {
  const current = new Date(`${periodStart}T00:00:00Z`)
  current.setUTCMonth(current.getUTCMonth() - 1)
  const start = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0))
  return {
    start,
    end: endDate.toISOString().slice(0, 10),
  }
}

function previousYearPeriod(periodStart: string, periodEnd: string) {
  const start = new Date(`${periodStart}T00:00:00Z`)
  const end = new Date(`${periodEnd}T00:00:00Z`)
  start.setUTCFullYear(start.getUTCFullYear() - 1)
  end.setUTCFullYear(end.getUTCFullYear() - 1)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

function comparableChange(current: MetricRow | null, previous: MetricRow | null) {
  if (!current || !previous) return null
  if (metricStatus(current) !== 'verified' || metricStatus(previous) !== 'verified') return null
  if (current.formula_version !== previous.formula_version) return null
  const currentValue = toNumber(current.value)
  const previousValue = toNumber(previous.value)
  if (currentValue === null || previousValue === null || previousValue === 0) return null
  return ((currentValue - previousValue) / previousValue) * 100
}

export async function buildLatestCeoIntelligenceInput(): Promise<CanonicalCeoIntelligenceInput> {
  const supabase = createAdminClient()
  const { data: latestPeriod, error: latestError } = await supabase
    .from('management_metric_values')
    .select('period_start,period_end')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (latestError || !latestPeriod) throw new Error('CEO_INTELLIGENCE_PERIOD_UNAVAILABLE')
  const periodStart = String(latestPeriod.period_start)
  const periodEnd = String(latestPeriod.period_end)
  const previous = currentPreviousPeriod(periodStart)
  const previousYear = previousYearPeriod(periodStart, periodEnd)

  const [metricsResult, entitiesResult, definitionsResult, goalsResult, polygonsResult, marketResult, valuationResult] = await Promise.all([
    supabase
      .from('management_metric_values')
      .select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,source_cutoff_at,quality_status,evaluation_status,formula_version,updated_at')
      .lte('period_end', periodEnd)
      .order('updated_at', { ascending: false }),
    supabase.from('management_entities').select('id,entity_type,name').eq('active', true),
    supabase.from('management_metric_definitions').select('code,label,unit').eq('active', true),
    supabase.from('management_goals').select('id,status').eq('period_start', periodStart).eq('period_end', periodEnd),
    supabase
      .from('vitacura_market_neighborhoods')
      .select('barrio_id,barrio_nombre,fuente,version,geometry')
      .eq('comuna', 'Vitacura')
      .order('barrio_nombre', { ascending: true }),
    supabase
      .from('market_supply_sales_intelligence')
      .select('id,neighborhood_name,property_type,portal_listings,cbrs_transactions,portal_median_price_uf,cbrs_median_price_uf,portal_median_uf_m2,cbrs_median_uf_m2,uf_m2_gap_pct,supply_depth_ratio,signal,confidence,as_of_portal,as_of_cbrs')
      .order('neighborhood_name', { ascending: true }),
    supabase
      .from('valuation_cases')
      .select('id,status,valuation_date')
      .gte('valuation_date', periodStart)
      .lte('valuation_date', periodEnd),
  ])

  if (
    metricsResult.error || entitiesResult.error || definitionsResult.error || goalsResult.error
    || polygonsResult.error || marketResult.error || valuationResult.error
  ) throw new Error('CEO_INTELLIGENCE_SOURCE_QUERY_FAILED')

  const metrics = (metricsResult.data || []) as MetricRow[]
  const entities = (entitiesResult.data || []) as EntityRow[]
  const definitions = new Map(((definitionsResult.data || []) as DefinitionRow[]).map((row) => [row.code, row]))
  const goals = (goalsResult.data || []) as GoalRow[]
  const company = entities.find((entity) => entity.entity_type === 'company')
  if (!company) throw new Error('CEO_INTELLIGENCE_COMPANY_UNAVAILABLE')

  const metricIndex = new Map<string, MetricRow>()
  for (const row of metrics) {
    const key = `${row.entity_id}:${row.metric_code}:${row.period_start}:${row.period_end}`
    if (!metricIndex.has(key)) metricIndex.set(key, row)
  }

  const getMetric = (entityId: string, code: string, start: string, end: string) =>
    metricIndex.get(`${entityId}:${code}:${start}:${end}`) || null

  const evidence = new Map<string, CeoEvidence>()
  const addMetricEvidence = (row: MetricRow | null, entityName: string) => {
    if (!row) return
    const definition = definitions.get(row.metric_code)
    const id = metricEvidenceId(row)
    evidence.set(id, {
      id,
      claim: `${entityName} · ${definition?.label || row.metric_code}: ${metricStatus(row) === 'verified' ? String(row.value ?? 'N/D') : 'N/D'}. Calidad ${row.quality_status}; evaluación ${row.evaluation_status}; fórmula v${row.formula_version}.`,
      source: [row.source_name, row.source_reference].filter(Boolean).join(' · ') || 'Fuente canónica de gestión',
      status: metricStatus(row),
    })
  }

  const toKpi = (row: MetricRow | null, entityName: string, code: string, entityId: string): CeoKpi => {
    const definition = definitions.get(code)
    const status = metricStatus(row)
    if (row) addMetricEvidence(row, entityName)
    const previousRow = getMetric(entityId, code, previous.start, previous.end)
    const yoyRow = getMetric(entityId, code, previousYear.start, previousYear.end)
    if (previousRow) addMetricEvidence(previousRow, entityName)
    if (yoyRow) addMetricEvidence(yoyRow, entityName)
    return {
      id: row ? metricEvidenceId(row) : `metric:${entityId}:${code}:${periodStart}:${periodEnd}`,
      label: definition?.label || code,
      metricCode: code,
      value: status === 'verified' ? toNumber(row?.value) : null,
      unit: definition?.unit || 'value',
      status,
      periodStart,
      periodEnd,
      formulaVersion: row ? String(row.formula_version) : 'N/D',
      evidenceRefs: row ? [metricEvidenceId(row)] : [],
      momPct: comparableChange(row, previousRow),
      yoyPct: comparableChange(row, yoyRow),
    }
  }

  const headlineKpis = COMPANY_KPI_CODES.map((code) =>
    toKpi(getMetric(company.id, code, periodStart, periodEnd), company.name, code, company.id))
  const funnel = FUNNEL_CODES.map((code) =>
    toKpi(getMetric(company.id, code, periodStart, periodEnd), company.name, code, company.id))

  const officeEntities = entities.filter((entity) => entity.entity_type === 'office')
  const offices: CeoOfficeSnapshot[] = officeEntities.map((office) => ({
    id: office.id,
    name: office.name,
    metrics: OFFICE_CODES.map((code) => toKpi(getMetric(office.id, code, periodStart, periodEnd), office.name, code, office.id)),
  }))

  const monthlySeriesFor = (code: string): CeoMonthlyPoint[] => {
    const points = metrics
      .filter((row) => row.entity_id === company.id && row.metric_code === code && row.period_start >= '2026-01-01' && row.period_end <= periodEnd)
      .reduce((map, row) => {
        const key = `${row.period_start}:${row.period_end}`
        if (!map.has(key)) map.set(key, row)
        return map
      }, new Map<string, MetricRow>())
    return [...points.values()]
      .sort((a, b) => a.period_start.localeCompare(b.period_start))
      .map((row) => {
        addMetricEvidence(row, company.name)
        const status = metricStatus(row)
        return {
          period: row.period_start.slice(0, 7),
          value: status === 'verified' ? toNumber(row.value) : null,
          status,
          formulaVersion: String(row.formula_version),
          evidenceRefs: [metricEvidenceId(row)],
        }
      })
  }

  const polygons: CeoMarketPolygon[] = ((polygonsResult.data || []) as MarketPolygonRow[])
    .map((row) => {
      const geometry = normalizeGeometry(row.geometry)
      if (!geometry) return null
      const evidenceId = `kml:${row.barrio_id}:${row.version}`
      evidence.set(evidenceId, {
        id: evidenceId,
        claim: `Micromercado ${row.barrio_nombre} definido por geometría KML de Property Partners, versión ${row.version}.`,
        source: row.fuente || 'Property Partners',
        status: 'verified',
      })
      return {
        id: row.barrio_id,
        name: row.barrio_nombre,
        source: row.fuente,
        version: row.version,
        geometry,
        evidenceRefs: [evidenceId],
      }
    })
    .filter((row): row is CeoMarketPolygon => Boolean(row))

  const marketRows: CeoMarketRow[] = ((marketResult.data || []) as MarketIntelligenceRow[]).map((row) => {
    const evidenceId = `market:${row.id}`
    const status: CeoEvidenceStatus = row.confidence === 'high' ? 'verified' : 'partial'
    evidence.set(evidenceId, {
      id: evidenceId,
      claim: `${row.neighborhood_name} · ${row.property_type}: oferta ${row.portal_listings ?? 'N/D'}, transacciones CBRS ${row.cbrs_transactions ?? 'N/D'}, UF/m² oferta ${row.portal_median_uf_m2 ?? 'N/D'}, UF/m² transacción ${row.cbrs_median_uf_m2 ?? 'N/D'}, señal ${row.signal || 'N/D'}.`,
      source: `Portal ${isoDate(row.as_of_portal) || 'N/D'} · CBRS ${isoDate(row.as_of_cbrs) || 'N/D'}`,
      status,
    })
    return {
      neighborhood: row.neighborhood_name,
      propertyType: row.property_type,
      portalListings: row.portal_listings,
      cbrsTransactions: row.cbrs_transactions,
      portalMedianPriceUf: toNumber(row.portal_median_price_uf),
      cbrsMedianPriceUf: toNumber(row.cbrs_median_price_uf),
      portalMedianUfM2: toNumber(row.portal_median_uf_m2),
      cbrsMedianUfM2: toNumber(row.cbrs_median_uf_m2),
      gapPct: toNumber(row.uf_m2_gap_pct),
      supplyDepthRatio: toNumber(row.supply_depth_ratio),
      signal: row.signal || 'insufficient_data',
      confidence: row.confidence || 'low',
      asOfPortal: isoDate(row.as_of_portal),
      asOfCbrs: isoDate(row.as_of_cbrs),
      evidenceRefs: [evidenceId],
    }
  })

  const marketPortalCutoff = marketRows.map((row) => row.asOfPortal).filter((value): value is string => Boolean(value)).sort().at(-1) || null
  const marketCbrsCutoff = marketRows.map((row) => row.asOfCbrs).filter((value): value is string => Boolean(value)).sort().at(-1) || null

  const valuationRows = (valuationResult.data || []) as ValuationRow[]
  const valuationCounts = new Map<string, number>()
  for (const row of valuationRows) valuationCounts.set(row.status, (valuationCounts.get(row.status) || 0) + 1)
  const valuationEvidenceId = `valuation:${periodStart}:${periodEnd}`
  evidence.set(valuationEvidenceId, {
    id: valuationEvidenceId,
    claim: `${valuationRows.length} caso(s) de valorización con valuation_date dentro del período; desglose por estado preservado en el snapshot.`,
    source: 'Registro canónico de valorizaciones',
    status: 'verified',
  })

  const sourceCutoff = metrics
    .filter((row) => row.period_start === periodStart && row.period_end === periodEnd)
    .map((row) => isoDate(row.source_cutoff_at))
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || periodEnd

  const dependencies: string[] = []
  const pendingGoals = goals.filter((goal) => goal.status !== 'approved')
  if (pendingGoals.length) {
    dependencies.push(`Existe(n) ${pendingGoals.length} meta(s) del período sin aprobación formal; cumplimiento de metas debe permanecer N/D.`)
  }
  if (!marketPortalCutoff || !marketCbrsCutoff) dependencies.push('Cobertura de referencia de mercado incompleta; no inferir señales donde falte corte de Portal o CBRS.')
  if (marketPortalCutoff && marketPortalCutoff < periodStart) dependencies.push(`La referencia Portal disponible tiene corte ${marketPortalCutoff}, anterior al período comercial; usarla como benchmark, no como oferta de julio.`)
  if (marketCbrsCutoff && marketCbrsCutoff < periodStart) dependencies.push(`La referencia CBRS disponible tiene corte ${marketCbrsCutoff}, anterior al período comercial; usarla como benchmark, no como transacciones de julio.`)

  const sourceSnapshotId = `pp-ceo:${periodStart}_${periodEnd}:${sourceCutoff}:${evidence.size}`
  return {
    reportId: `ceo-intelligence:${periodStart}_${periodEnd}`,
    title: `Property Partners Vitacura · CEO Intelligence · ${periodStart.slice(0, 7)}`,
    client: 'Property Partners Vitacura',
    audience: 'CEO y dirección ejecutiva de Property Partners Vitacura',
    purpose: 'Sintetizar desempeño comercial, micromercados de Vitacura, conversión, oficinas, valorización y decisiones ejecutivas con evidencia canónica.',
    period: {
      start: periodStart,
      end: periodEnd,
      sourceCutoff,
      emittedAt: new Date().toISOString(),
    },
    evidence: [...evidence.values()],
    headlineKpis,
    monthlySeries: {
      sales: monthlySeriesFor('sales'),
      salesUf: monthlySeriesFor('sales_uf'),
    },
    funnel,
    offices,
    market: {
      polygons,
      rows: marketRows.filter((row) => polygons.some((polygon) => normalizeName(polygon.name) === normalizeName(row.neighborhood))),
      portalCutoff: marketPortalCutoff,
      cbrsCutoff: marketCbrsCutoff,
    },
    valuation: {
      totalCases: valuationRows.length,
      byStatus: [...valuationCounts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => a.status.localeCompare(b.status)),
      periodStart,
      periodEnd,
      evidenceRefs: [valuationEvidenceId],
    },
    dependencies,
    delivery: {
      recipient: null,
      status: 'draft',
      purpose: 'Revisión ejecutiva previa a cualquier entrega al Cliente.',
      paymentStatus: 'not_applicable',
      deliveredAt: null,
    },
    sourceSnapshotId,
  }
}
