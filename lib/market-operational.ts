import { createClient } from '@/lib/supabase/server'

export type OperationalMarketSnapshot = {
  connected: boolean
  canonicalProperties: number | null
  confirmedProperties: number | null
  activeInventory: number | null
  confirmedSales: number | null
  medianDaysOnMarket: number | null
  absorptionRate: number | null
  offerToSalesRatio: number | null
  latestPeriod: string | null
  pendingMatches: number | null
  latestIngestionAt: string | null
  latestIngestionStatus: string | null
  latestIngestionAccepted: number | null
  latestIngestionRejected: number | null
  ingestionRuns: number | null
  error?: string
}

const emptySnapshot: OperationalMarketSnapshot = {
  connected: false,
  canonicalProperties: null,
  confirmedProperties: null,
  activeInventory: null,
  confirmedSales: null,
  medianDaysOnMarket: null,
  absorptionRate: null,
  offerToSalesRatio: null,
  latestPeriod: null,
  pendingMatches: null,
  latestIngestionAt: null,
  latestIngestionStatus: null,
  latestIngestionAccepted: null,
  latestIngestionRejected: null,
  ingestionRuns: null,
}

export async function getOperationalMarketSnapshot(): Promise<OperationalMarketSnapshot> {
  try {
    const supabase = await createClient()
    const [properties, confirmed, identityCandidates, activeListings, transactions, matchCandidates, latestMetric, latestIngestion, ingestionRuns] = await Promise.all([
      supabase.from('market_properties').select('id', { count: 'exact', head: true }),
      supabase.from('market_properties').select('id', { count: 'exact', head: true }).eq('identity_status', 'confirmed'),
      supabase.from('market_properties').select('id', { count: 'exact', head: true }).in('identity_status', ['candidate', 'needs_review']),
      supabase.from('market_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('market_transactions').select('id', { count: 'exact', head: true }),
      supabase.from('market_property_matches').select('id', { count: 'exact', head: true }).in('status', ['candidate_high', 'candidate_medium']),
      supabase
        .from('market_metric_snapshots')
        .select('period_start,period_end,active_inventory,confirmed_sales,median_days_on_market,absorption_rate,offer_to_sales_ratio')
        .is('neighborhood_id', null)
        .is('property_type', null)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('market_ingestion_runs')
        .select('status,accepted_rows,rejected_rows,completed_at,started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('market_ingestion_runs').select('id', { count: 'exact', head: true }),
    ])

    const errors = [
      properties.error,
      confirmed.error,
      identityCandidates.error,
      activeListings.error,
      transactions.error,
      matchCandidates.error,
      latestMetric.error,
      latestIngestion.error,
      ingestionRuns.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return { ...emptySnapshot, error: errors.map((error) => error?.message).join(' · ') }
    }

    const metric = latestMetric.data
    const ingestion = latestIngestion.data
    return {
      connected: true,
      canonicalProperties: properties.count ?? 0,
      confirmedProperties: confirmed.count ?? 0,
      activeInventory: metric?.active_inventory ?? activeListings.count ?? 0,
      confirmedSales: metric?.confirmed_sales ?? transactions.count ?? 0,
      medianDaysOnMarket: metric?.median_days_on_market ?? null,
      absorptionRate: metric?.absorption_rate ?? null,
      offerToSalesRatio: metric?.offer_to_sales_ratio ?? null,
      latestPeriod: metric ? `${metric.period_start} / ${metric.period_end}` : null,
      pendingMatches: (identityCandidates.count ?? 0) + (matchCandidates.count ?? 0),
      latestIngestionAt: ingestion?.completed_at ?? ingestion?.started_at ?? null,
      latestIngestionStatus: ingestion?.status ?? null,
      latestIngestionAccepted: ingestion?.accepted_rows ?? null,
      latestIngestionRejected: ingestion?.rejected_rows ?? null,
      ingestionRuns: ingestionRuns.count ?? 0,
    }
  } catch (error) {
    return { ...emptySnapshot, error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.' }
  }
}
