import { createClient } from '@/lib/supabase/server'

export type MarketFreshnessStatus = 'recent' | 'aging' | 'stale' | 'unknown'

export type OperationalMarketSnapshot = {
  connected: boolean
  canonicalProperties: number | null
  confirmedProperties: number | null
  missingNeighborhoods: number | null
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
  latestObservedAt: string | null
  observationAgeDays: number | null
  freshnessStatus: MarketFreshnessStatus
  error?: string
}

const emptySnapshot: OperationalMarketSnapshot = {
  connected: false,
  canonicalProperties: null,
  confirmedProperties: null,
  missingNeighborhoods: null,
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
  latestObservedAt: null,
  observationAgeDays: null,
  freshnessStatus: 'unknown',
}

function getObservationFreshness(value: string | null | undefined) {
  if (!value) return { ageDays: null, status: 'unknown' as const }

  const observedAt = new Date(value)
  if (Number.isNaN(observedAt.getTime())) return { ageDays: null, status: 'unknown' as const }

  const ageDays = Math.max(0, Math.floor((Date.now() - observedAt.getTime()) / 86_400_000))
  if (ageDays <= 3) return { ageDays, status: 'recent' as const }
  if (ageDays <= 7) return { ageDays, status: 'aging' as const }
  return { ageDays, status: 'stale' as const }
}

export async function getOperationalMarketSnapshot(): Promise<OperationalMarketSnapshot> {
  try {
    const supabase = await createClient()
    const [properties, confirmed, missingNeighborhoods, identityCandidates, activeListings, transactions, matchCandidates, latestMetric, latestIngestion, ingestionRuns, latestObservedListing] = await Promise.all([
      supabase.from('market_properties').select('id', { count: 'exact', head: true }),
      supabase.from('market_properties').select('id', { count: 'exact', head: true }).eq('identity_status', 'confirmed'),
      supabase.from('market_properties').select('id', { count: 'exact', head: true }).is('neighborhood_id', null),
      supabase.from('market_properties').select('id', { count: 'exact', head: true }).in('identity_status', ['candidate', 'needs_review']),
      supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
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
      supabase
        .from('market_current_listings')
        .select('observed_at')
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const errors = [
      properties.error,
      confirmed.error,
      missingNeighborhoods.error,
      identityCandidates.error,
      activeListings.error,
      transactions.error,
      matchCandidates.error,
      latestMetric.error,
      latestIngestion.error,
      ingestionRuns.error,
      latestObservedListing.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return { ...emptySnapshot, error: errors.map((error) => error?.message).join(' · ') }
    }

    const metric = latestMetric.data
    const ingestion = latestIngestion.data
    const latestObservedAt = latestObservedListing.data?.observed_at ?? null
    const freshness = getObservationFreshness(latestObservedAt)

    return {
      connected: true,
      canonicalProperties: properties.count ?? 0,
      confirmedProperties: confirmed.count ?? 0,
      missingNeighborhoods: missingNeighborhoods.count ?? 0,
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
      latestObservedAt,
      observationAgeDays: freshness.ageDays,
      freshnessStatus: freshness.status,
    }
  } catch (error) {
    return { ...emptySnapshot, error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.' }
  }
}
