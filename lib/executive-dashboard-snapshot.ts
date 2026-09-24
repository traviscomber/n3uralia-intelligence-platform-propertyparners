import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

type MetricRow = {
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  quality_status: string | null
  evaluation_status: string | null
  formula_version: number
}

type HistoricalRow = {
  year: number
  transactions: number | string | null
  median_price_uf: number | string | null
  median_uf_m2: number | string | null
}

function numeric(value: number | string | null | undefined) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function monthKey(value: string) {
  return value.slice(0, 7)
}

function uniqueMetrics(rows: MetricRow[]) {
  const seen = new Map<string, MetricRow>()
  return rows.filter((row) => {
    const key = `${row.metric_code}:${row.period_start}:${row.period_end}`
    const earlier = seen.get(key)
    if (earlier && (numeric(earlier.value) !== numeric(row.value) || earlier.formula_version !== row.formula_version)) {
      throw new Error(`Existen valores verificados contradictorios para ${key}.`)
    }
    if (earlier) return false
    seen.set(key, row)
    return true
  })
}

function latestMonthlyByCode(rows: MetricRow[], code: string) {
  return rows
    .filter((row) => row.metric_code === code && row.period_start.slice(0, 7) === row.period_end.slice(0, 7))
    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0] ?? null
}

export async function getExecutiveDashboardSnapshot() {
  const service = createServiceClient()
  const lastCompleteYear = new Date().getFullYear() - 1

  const { data: company, error: companyError } = await service
    .from('management_entities')
    .select('id,name')
    .eq('entity_type', 'company')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const entityId = company?.id ?? null
  if (companyError) throw new Error('No fue posible consultar la entidad de gestión.')

  const [metricResult, historyResult, propertyResult] = await Promise.all([
    entityId
      ? service
          .from('management_metric_values')
          .select('metric_code,period_start,period_end,value,quality_status,evaluation_status,formula_version')
          .eq('entity_id', entityId)
          .in('metric_code', [
            'leads',
            'scheduled_visits',
            'realized_visits',
            'sales',
            'sales_uf',
            'canonical_management_score',
            'canonical_follow_up_score',
            'canonical_conversion_score',
          ])
          .eq('quality_status', 'verified')
          .eq('evaluation_status', 'evaluable')
          .order('period_end', { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [] as MetricRow[], error: null }),
    service
      .from('market_cbrs_reference_metrics')
      .select('year,transactions,median_price_uf,median_uf_m2')
      .eq('scope', 'year')
      .eq('property_type', 'Casa')
      .gte('year', lastCompleteYear - 3)
      .lte('year', lastCompleteYear)
      .order('year', { ascending: false })
      .limit(4),
    service
      .from('properties')
      .select('id,address,neighborhood,price_uf,days_on_market,source,created_at')
      .eq('status', 'available')
      .eq('property_type', 'casa')
      .not('days_on_market', 'is', null)
      .order('days_on_market', { ascending: false })
      .limit(30),
  ])

  if (metricResult.error || historyResult.error || propertyResult.error) {
    throw new Error('No fue posible consultar el control ejecutivo completo.')
  }

  // A legacy listing is actionable only when it resolves to a canonical
  // property with an active, observed listing in the current market.
  const candidates = propertyResult.data ?? []
  const keys = candidates.map((property) => `legacy-property:${property.id}`)
  const { data: canonical, error: canonicalError } = keys.length
    ? await service.from('market_properties').select('id,canonical_key').in('canonical_key', keys)
    : { data: [], error: null }
  if (canonicalError) throw new Error('No fue posible verificar las fichas canónicas.')
  const canonicalIds = (canonical ?? []).map((property) => property.id)
  const { data: activeListings, error: listingError } = canonicalIds.length
    ? await service.from('market_current_listings').select('property_id').in('property_id', canonicalIds).in('status', ['active', 'observed'])
    : { data: [], error: null }
  if (listingError) throw new Error('No fue posible verificar la vigencia de las propiedades.')
  const activeIds = new Set((activeListings ?? []).map((listing) => listing.property_id))
  const activeKeys = new Set((canonical ?? []).filter((property) => activeIds.has(property.id)).map((property) => property.canonical_key))

  const rows = uniqueMetrics((metricResult.data ?? []) as MetricRow[])
  const latestLeads = latestMonthlyByCode(rows, 'leads')
  const verifiedPeriodEnd = latestLeads?.period_end
    ?? rows.map((row) => row.period_end).sort().reverse()[0]
    ?? null
  const verifiedMonth = verifiedPeriodEnd ? monthKey(verifiedPeriodEnd) : null
  const nextMonth = verifiedMonth
    ? new Date(Date.UTC(Number(verifiedMonth.slice(0, 4)), Number(verifiedMonth.slice(5, 7)), 1)).toISOString().slice(0, 10)
    : null
  const alertResult = entityId && verifiedMonth
    ? await service
        .from('management_alerts')
        .select('id,severity,title,detail,metric_code,metric_value,threshold_value,period_start,period_end,created_at')
        .eq('entity_id', entityId)
        .eq('status', 'open')
        .gte('period_start', `${verifiedMonth}-01`)
        .lt('period_start', nextMonth!)
        .gte('period_end', `${verifiedMonth}-01`)
        .lt('period_end', nextMonth!)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [], error: null }
  if (alertResult.error) throw new Error('No fue posible consultar las alertas del período.')
  const currentMonthRows = verifiedMonth
    ? rows.filter((row) => monthKey(row.period_start) === verifiedMonth && monthKey(row.period_end) === verifiedMonth)
    : []

  const byCode = new Map(currentMonthRows.map((row) => [row.metric_code, row]))

  const monthly = rows
    .filter((row) => ['leads', 'realized_visits', 'sales', 'sales_uf'].includes(row.metric_code))
    .filter((row) => row.period_start.slice(0, 7) === row.period_end.slice(0, 7))
    .reduce<Record<string, Record<string, { value: number | null; formulaVersion: number }>>>((acc, row) => {
      const key = monthKey(row.period_start)
      acc[key] ??= {}
      acc[key][row.metric_code] ??= { value: numeric(row.value), formulaVersion: row.formula_version }
      return acc
    }, {})

  const months = Object.keys(monthly).sort().slice(-18)
  const evolution = months.map((period) => ({
    period,
    leads: monthly[period]?.leads?.value ?? null,
    visits: monthly[period]?.realized_visits?.value ?? null,
    sales: monthly[period]?.sales?.value ?? null,
    salesUf: monthly[period]?.sales_uf?.value ?? null,
    versions: {
      leads: monthly[period]?.leads?.formulaVersion ?? null,
      visits: monthly[period]?.realized_visits?.formulaVersion ?? null,
      sales: monthly[period]?.sales?.formulaVersion ?? null,
      salesUf: monthly[period]?.sales_uf?.formulaVersion ?? null,
    },
  }))

  const historyByYear = new Map(((historyResult.data ?? []) as HistoricalRow[]).map((row) => [row.year, row]))

  return {
    companyName: company?.name ?? 'Property Partners',
    verifiedPeriodEnd,
    latest: {
      leads: numeric(byCode.get('leads')?.value),
      scheduledVisits: numeric(byCode.get('scheduled_visits')?.value),
      realizedVisits: numeric(byCode.get('realized_visits')?.value),
      sales: numeric(byCode.get('sales')?.value),
      salesUf: numeric(byCode.get('sales_uf')?.value),
      managementScore: numeric(byCode.get('canonical_management_score')?.value),
      followUpScore: numeric(byCode.get('canonical_follow_up_score')?.value),
      conversionScore: numeric(byCode.get('canonical_conversion_score')?.value),
    },
    evolution,
    history: Array.from({ length: 4 }, (_, index) => {
      const year = lastCompleteYear - 3 + index
      const row = historyByYear.get(year)
      return {
        year,
        transactions: numeric(row?.transactions),
        medianPriceUf: numeric(row?.median_price_uf),
        medianUfM2: numeric(row?.median_uf_m2),
      }
    }),
    alerts: (alertResult.data ?? []).filter((alert) => verifiedMonth !== null && monthKey(alert.period_start) === verifiedMonth && monthKey(alert.period_end) === verifiedMonth),
    properties: candidates.filter((property) => activeKeys.has(`legacy-property:${property.id}`)).slice(0, 3),
    financeAvailable: false,
  }
}
