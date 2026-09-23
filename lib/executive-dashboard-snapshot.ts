import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

type MetricRow = {
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  quality_status: string | null
  evaluation_status: string | null
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
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${row.metric_code}:${row.period_start}:${row.period_end}`
    if (seen.has(key)) return false
    seen.add(key)
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

  const { data: company } = await service
    .from('management_entities')
    .select('id,name')
    .eq('entity_type', 'company')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const entityId = company?.id ?? null

  const [metricResult, historyResult, alertResult, propertyResult] = await Promise.all([
    entityId
      ? service
          .from('management_metric_values')
          .select('metric_code,period_start,period_end,value,quality_status,evaluation_status')
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
      .lte('year', lastCompleteYear)
      .order('year', { ascending: false })
      .limit(4),
    entityId
      ? service
          .from('management_alerts')
          .select('id,severity,title,detail,metric_code,metric_value,threshold_value,period_start,period_end,created_at')
          .eq('entity_id', entityId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
    service
      .from('properties')
      .select('id,address,neighborhood,price_uf,days_on_market,source,created_at')
      .not('days_on_market', 'is', null)
      .order('days_on_market', { ascending: false })
      .limit(3),
  ])

  const rows = uniqueMetrics((metricResult.data ?? []) as MetricRow[])
  const latestLeads = latestMonthlyByCode(rows, 'leads')
  const verifiedPeriodEnd = latestLeads?.period_end
    ?? rows.map((row) => row.period_end).sort().reverse()[0]
    ?? null
  const verifiedMonth = verifiedPeriodEnd ? monthKey(verifiedPeriodEnd) : null
  const currentMonthRows = verifiedMonth
    ? rows.filter((row) => monthKey(row.period_start) === verifiedMonth && monthKey(row.period_end) === verifiedMonth)
    : []

  const byCode = new Map(currentMonthRows.map((row) => [row.metric_code, row]))

  const monthly = rows
    .filter((row) => ['leads', 'realized_visits', 'sales', 'sales_uf'].includes(row.metric_code))
    .filter((row) => row.period_start.slice(0, 7) === row.period_end.slice(0, 7))
    .reduce<Record<string, Record<string, number | null>>>((acc, row) => {
      const key = monthKey(row.period_start)
      acc[key] ??= {}
      acc[key][row.metric_code] = numeric(row.value)
      return acc
    }, {})

  const months = Object.keys(monthly).sort().slice(-18)
  const evolution = months.map((period) => ({
    period,
    leads: monthly[period]?.leads ?? null,
    visits: monthly[period]?.realized_visits ?? null,
    sales: monthly[period]?.sales ?? null,
    salesUf: monthly[period]?.sales_uf ?? null,
  }))

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
    history: ((historyResult.data ?? []) as HistoricalRow[])
      .map((row) => ({
        year: row.year,
        transactions: numeric(row.transactions),
        medianPriceUf: numeric(row.median_price_uf),
        medianUfM2: numeric(row.median_uf_m2),
      }))
      .sort((a, b) => a.year - b.year),
    alerts: alertResult.data ?? [],
    properties: propertyResult.data ?? [],
    financeAvailable: false,
  }
}
