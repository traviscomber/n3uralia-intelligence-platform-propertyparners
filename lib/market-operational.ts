import { getMarketHouseDeliverySummary } from '@/lib/market-house-intelligence'
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
    const [delivery, latestIngestion, ingestionRuns] = await Promise.all([
      getMarketHouseDeliverySummary(),
      supabase
        .from('market_ingestion_runs')
        .select('status,accepted_rows,rejected_rows,completed_at,started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('market_ingestion_runs').select('id', { count: 'exact', head: true }),
    ])

    const ingestion = latestIngestion.data
    const summary = delivery.summary
    const freshness = getObservationFreshness(summary.portalAsOf)

    return {
      connected: !delivery.error,
      canonicalProperties: summary.canonicalHouses,
      confirmedProperties: summary.confirmedHouses,
      missingNeighborhoods: summary.missingNeighborhoodHouses,
      activeInventory: summary.portalActiveHouses,
      confirmedSales: summary.cbrsHouseTransactions,
      medianDaysOnMarket: null,
      absorptionRate: null,
      offerToSalesRatio: null,
      latestPeriod: summary.cbrsAsOf,
      pendingMatches: summary.reviewHouses,
      latestIngestionAt: latestIngestion.error ? null : ingestion?.completed_at ?? ingestion?.started_at ?? null,
      latestIngestionStatus: latestIngestion.error ? null : ingestion?.status ?? null,
      latestIngestionAccepted: latestIngestion.error ? null : ingestion?.accepted_rows ?? null,
      latestIngestionRejected: latestIngestion.error ? null : ingestion?.rejected_rows ?? null,
      ingestionRuns: ingestionRuns.error ? null : ingestionRuns.count ?? 0,
      latestObservedAt: summary.portalAsOf,
      observationAgeDays: delivery.error ? null : freshness.ageDays,
      freshnessStatus: delivery.error ? 'unknown' : freshness.status,
      error: delivery.error,
    }
  } catch (error) {
    return { ...emptySnapshot, error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.' }
  }
}
