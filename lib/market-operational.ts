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
  historicalIdentityCandidates: number | null
  liveLinkedHouses: number | null
  identityCollisions: number | null
  newLiveIdentityCases: number | null
  highConfidenceIdentityCandidates: number | null
  latestIngestionAt: string | null
  latestIngestionStatus: string | null
  latestIngestionAccepted: number | null
  latestIngestionRejected: number | null
  ingestionRuns: number | null
  latestObservedAt: string | null
  observationAgeDays: number | null
  freshnessStatus: MarketFreshnessStatus
  liveHouseCount: number | null
  exactKmlLiveHouses: number | null
  pendingUniqueTerritorySuggestions: number | null
  ambiguousTerritorySuggestions: number | null
  unmatchedTerritoryHouses: number | null
  acceptedTerritoryReviews: number | null
  rejectedTerritoryReviews: number | null
  cbrsHouseTransactions: number | null
  latestCbrsHouseSaleDate: string | null
  error?: string
}

type HouseDeliverySummary = {
  portal_active_houses: number | null
  portal_as_of: string | null
  canonical_houses: number | null
  confirmed_houses: number | null
  missing_neighborhood_houses: number | null
}

type HouseTerritoryProgress = {
  portal_current_houses: number | null
  exact_kml_houses: number | null
  pending_unique_suggestions: number | null
  ambiguous_suggestions: number | null
  unmatched_houses: number | null
  accepted_reviews: number | null
  rejected_reviews: number | null
}

type HouseIdentityProgress = {
  portal_current_houses: number | null
  linked_houses: number | null
  unlinked_houses: number | null
  external_identity_collisions: number | null
  unlinked_without_existing_external_identity: number | null
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
  historicalIdentityCandidates: null,
  liveLinkedHouses: null,
  identityCollisions: null,
  newLiveIdentityCases: null,
  highConfidenceIdentityCandidates: null,
  latestIngestionAt: null,
  latestIngestionStatus: null,
  latestIngestionAccepted: null,
  latestIngestionRejected: null,
  ingestionRuns: null,
  latestObservedAt: null,
  observationAgeDays: null,
  freshnessStatus: 'unknown',
  liveHouseCount: null,
  exactKmlLiveHouses: null,
  pendingUniqueTerritorySuggestions: null,
  ambiguousTerritorySuggestions: null,
  unmatchedTerritoryHouses: null,
  acceptedTerritoryReviews: null,
  rejectedTerritoryReviews: null,
  cbrsHouseTransactions: null,
  latestCbrsHouseSaleDate: null,
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
    const [houseSummaryResult, territoryProgressResult, identityProgressResult, historicalIdentityCandidates, highIdentityCandidates, confirmedSalesResult, cbrsHouseReferenceResult, latestMetric, latestIngestion, ingestionRuns] = await Promise.all([
      supabase.rpc('get_market_house_delivery_summary_v1').maybeSingle(),
      supabase.rpc('get_market_house_territory_progress_v1').maybeSingle(),
      supabase.rpc('get_market_house_identity_progress_v1').maybeSingle(),
      supabase
        .from('market_properties')
        .select('id', { count: 'exact', head: true })
        .eq('property_type', 'Casa')
        .in('identity_status', ['candidate', 'needs_review']),
      supabase
        .from('market_property_matches')
        .select('id', { count: 'exact', head: true })
        .eq('left_entity_type', 'listing')
        .eq('right_entity_type', 'property')
        .eq('status', 'candidate_high'),
      supabase
        .from('market_transactions')
        .select('id,market_properties!inner(property_type)', { count: 'exact', head: true })
        .eq('market_properties.property_type', 'Casa'),
      supabase
        .from('market_cbrs_reference_transactions')
        .select('transaction_date', { count: 'exact' })
        .eq('property_type', 'Casa')
        .order('transaction_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('market_metric_snapshots')
        .select('period_start,period_end,active_inventory,confirmed_sales,median_days_on_market,absorption_rate,offer_to_sales_ratio')
        .is('neighborhood_id', null)
        .eq('property_type', 'Casa')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('market_ingestion_runs')
        .select('status,accepted_rows,rejected_rows,completed_at,started_at')
        .eq('dataset_kind', 'portal_houses')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('market_ingestion_runs')
        .select('id', { count: 'exact', head: true })
        .eq('dataset_kind', 'portal_houses'),
    ])

    const errors = [
      houseSummaryResult.error,
      territoryProgressResult.error,
      identityProgressResult.error,
      historicalIdentityCandidates.error,
      highIdentityCandidates.error,
      confirmedSalesResult.error,
      cbrsHouseReferenceResult.error,
      latestMetric.error,
      latestIngestion.error,
      ingestionRuns.error,
    ].filter(Boolean)

    const house = houseSummaryResult.data as HouseDeliverySummary | null
    const territoryProgress = territoryProgressResult.data as HouseTerritoryProgress | null
    const identityProgress = identityProgressResult.data as HouseIdentityProgress | null
    const metric = latestMetric.data
    const ingestion = latestIngestion.data
    const latestObservedAt = house?.portal_as_of ?? null
    const freshness = getObservationFreshness(latestObservedAt)
    const operationalHouseSales = confirmedSalesResult.error ? null : confirmedSalesResult.count ?? 0

    return {
      connected: errors.length === 0,
      canonicalProperties: houseSummaryResult.error ? null : house?.canonical_houses ?? 0,
      confirmedProperties: houseSummaryResult.error ? null : house?.confirmed_houses ?? 0,
      missingNeighborhoods: houseSummaryResult.error ? null : house?.missing_neighborhood_houses ?? 0,
      activeInventory: latestMetric.error
        ? (houseSummaryResult.error ? null : house?.portal_active_houses ?? 0)
        : metric?.active_inventory ?? (houseSummaryResult.error ? null : house?.portal_active_houses ?? 0),
      confirmedSales: latestMetric.error
        ? (operationalHouseSales && operationalHouseSales > 0 ? operationalHouseSales : null)
        : metric
          ? metric.confirmed_sales
          : operationalHouseSales && operationalHouseSales > 0
            ? operationalHouseSales
            : null,
      medianDaysOnMarket: latestMetric.error ? null : metric?.median_days_on_market ?? null,
      absorptionRate: latestMetric.error ? null : metric?.absorption_rate ?? null,
      offerToSalesRatio: latestMetric.error ? null : metric?.offer_to_sales_ratio ?? null,
      latestPeriod: !latestMetric.error && metric ? `${metric.period_start} / ${metric.period_end}` : null,
      pendingMatches: identityProgressResult.error ? null : identityProgress?.unlinked_houses ?? 0,
      historicalIdentityCandidates: historicalIdentityCandidates.error ? null : historicalIdentityCandidates.count ?? 0,
      liveLinkedHouses: identityProgressResult.error ? null : identityProgress?.linked_houses ?? 0,
      identityCollisions: identityProgressResult.error ? null : identityProgress?.external_identity_collisions ?? 0,
      newLiveIdentityCases: identityProgressResult.error ? null : identityProgress?.unlinked_without_existing_external_identity ?? 0,
      highConfidenceIdentityCandidates: highIdentityCandidates.error ? null : highIdentityCandidates.count ?? 0,
      latestIngestionAt: latestIngestion.error ? null : ingestion?.completed_at ?? ingestion?.started_at ?? null,
      latestIngestionStatus: latestIngestion.error ? null : ingestion?.status ?? null,
      latestIngestionAccepted: latestIngestion.error ? null : ingestion?.accepted_rows ?? null,
      latestIngestionRejected: latestIngestion.error ? null : ingestion?.rejected_rows ?? null,
      ingestionRuns: ingestionRuns.error ? null : ingestionRuns.count ?? 0,
      latestObservedAt: houseSummaryResult.error ? null : latestObservedAt,
      observationAgeDays: houseSummaryResult.error ? null : freshness.ageDays,
      freshnessStatus: houseSummaryResult.error ? 'unknown' : freshness.status,
      liveHouseCount: identityProgressResult.error
        ? (territoryProgressResult.error ? null : territoryProgress?.portal_current_houses ?? 0)
        : identityProgress?.portal_current_houses ?? 0,
      exactKmlLiveHouses: territoryProgressResult.error ? null : territoryProgress?.exact_kml_houses ?? 0,
      pendingUniqueTerritorySuggestions: territoryProgressResult.error ? null : territoryProgress?.pending_unique_suggestions ?? 0,
      ambiguousTerritorySuggestions: territoryProgressResult.error ? null : territoryProgress?.ambiguous_suggestions ?? 0,
      unmatchedTerritoryHouses: territoryProgressResult.error ? null : territoryProgress?.unmatched_houses ?? 0,
      acceptedTerritoryReviews: territoryProgressResult.error ? null : territoryProgress?.accepted_reviews ?? 0,
      rejectedTerritoryReviews: territoryProgressResult.error ? null : territoryProgress?.rejected_reviews ?? 0,
      cbrsHouseTransactions: cbrsHouseReferenceResult.error ? null : cbrsHouseReferenceResult.count ?? 0,
      latestCbrsHouseSaleDate: cbrsHouseReferenceResult.error ? null : cbrsHouseReferenceResult.data?.transaction_date ?? null,
      error: errors.length ? errors.map((error) => error?.message).join(' · ') : undefined,
    }
  } catch (error) {
    return { ...emptySnapshot, error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.' }
  }
}
