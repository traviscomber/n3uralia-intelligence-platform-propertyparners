import { createClient } from '@/lib/supabase/server'
import { buildMarketContractSnapshot, type ContractMetric } from '@/lib/market-contract'

type MetricSnapshotRow = {
  period_start: string
  period_end: string
  neighborhood_id: string | null
  property_type: string | null
  active_inventory: number | null
  new_listings: number | null
  removed_listings: number | null
  confirmed_sales: number | null
  median_days_on_market: number | null
  absorption_rate: number | null
  offer_to_sales_ratio: number | null
  methodology_version: string
  generated_at: string
}

function replaceMetric(metrics: ContractMetric[], key: string, patch: Partial<ContractMetric>) {
  return metrics.map((metric) => metric.key === key ? { ...metric, ...patch } : metric)
}

export async function buildLiveMarketSnapshot() {
  const base = buildMarketContractSnapshot()

  try {
    const supabase = await createClient()
    const [{ count: propertyCount }, { data: latestSnapshot }, { count: listingCount }, { count: transactionCount }] = await Promise.all([
      supabase.from('market_properties').select('*', { count: 'exact', head: true }).eq('identity_status', 'confirmed'),
      supabase
        .from('market_metric_snapshots')
        .select('*')
        .is('neighborhood_id', null)
        .is('property_type', null)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('market_listings').select('*', { count: 'exact', head: true }),
      supabase.from('market_transactions').select('*', { count: 'exact', head: true }),
    ])

    let metrics = base.metrics
    metrics = replaceMetric(metrics, 'canonical_properties', {
      value: propertyCount ?? 0,
      status: propertyCount && propertyCount > 0 ? 'available' : 'pending_source',
      period: propertyCount && propertyCount > 0 ? 'Base operativa actual' : 'Pendiente de importación',
      limitation: propertyCount && propertyCount > 0 ? undefined : 'El esquema está listo, pero aún no existen propiedades confirmadas en la base operativa.',
    })

    const row = latestSnapshot as MetricSnapshotRow | null
    if (row) {
      metrics = replaceMetric(metrics, 'sales_velocity', {
        value: row.median_days_on_market,
        status: row.median_days_on_market === null ? 'partial' : 'available',
        period: `${row.period_start} a ${row.period_end}`,
        limitation: row.median_days_on_market === null ? 'No existen suficientes propiedades con publicación y venta confirmada.' : undefined,
      })
      metrics = replaceMetric(metrics, 'absorption', {
        value: row.absorption_rate,
        status: row.absorption_rate === null ? 'partial' : 'available',
        period: `${row.period_start} a ${row.period_end}`,
        limitation: row.absorption_rate === null ? 'No existe inventario activo suficiente para el período.' : undefined,
      })
    }

    return {
      ...base,
      metrics,
      live: {
        connected: true,
        confirmedProperties: propertyCount ?? 0,
        listingRows: listingCount ?? 0,
        transactionRows: transactionCount ?? 0,
        latestMetricSnapshot: row,
      },
    }
  } catch (error) {
    return {
      ...base,
      live: {
        connected: false,
        confirmedProperties: 0,
        listingRows: 0,
        transactionRows: 0,
        latestMetricSnapshot: null,
        error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.',
      },
    }
  }
}
