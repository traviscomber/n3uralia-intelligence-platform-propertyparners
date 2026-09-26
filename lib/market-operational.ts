import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { propertyPartnersCalendarDayAge } from '@/lib/property-partners-time'

export type MarketFreshnessStatus = 'recent' | 'aging' | 'stale' | 'unknown'

export type OperationalMarketSnapshot = {
  connected: boolean
  canonicalProperties: number | null
  confirmedProperties: number | null
  missingNeighborhoods: number | null
  physicalHouseRows: number | null
  outOfScopeLegacyHouses: number | null
  logicalHouseComponents: number | null
  confirmedDuplicateRows: number | null
  duplicateComponents: number | null
  logicalComponentsWithNeighborhood: number | null
  conflictingNeighborhoodComponents: number | null
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
  clientSaleSignals: number | null
  latestClientSaleSignalAt: string | null
  latestClientSaleSourcePeriodEnd: string | null
  clientSaleSignalSourceFiles: number | null
  latestIngestionAt: string | null
  latestIngestionStatus: string | null
  latestIngestionAccepted: number | null
  latestIngestionRejected: number | null
  latestIngestionFullSnapshot: boolean | null
  latestIngestionNew: number | null
  latestIngestionUpdated: number | null
  latestIngestionUnchanged: number | null
  latestIngestionRemoved: number | null
  latestDiscoveryRawCandidates: number | null
  latestDiscoveryUniqueListings: number | null
  latestDiscoveryDuplicateCandidates: number | null
  latestDiscoveryPages: number | null
  latestPortalReportedCount: number | null
  latestInventoryCoverageRatio: number | null
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
  cbrs_house_transactions: number | null
  cbrs_as_of: string | null
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

type HouseScopeSummary = {
  physical_house_rows: number | null
  v1_house_rows: number | null
  explicit_out_of_scope_rows: number | null
  v1_confirmed_rows: number | null
  v1_missing_neighborhood_rows: number | null
  v1_identity_candidates: number | null
  logical_house_components: number | null
  confirmed_duplicate_rows: number | null
  duplicate_components: number | null
  logical_components_with_neighborhood: number | null
  conflicting_neighborhood_components: number | null
}

type ClientSaleSignalSummary = {
  accepted_house_signals: number | null
  latest_observed_at: string | null
  latest_source_period_end: string | null
  source_files: number | null
}

const emptySnapshot: OperationalMarketSnapshot = {
  connected: false,
  canonicalProperties: null,
  confirmedProperties: null,
  missingNeighborhoods: null,
  physicalHouseRows: null,
  outOfScopeLegacyHouses: null,
  logicalHouseComponents: null,
  confirmedDuplicateRows: null,
  duplicateComponents: null,
  logicalComponentsWithNeighborhood: null,
  conflictingNeighborhoodComponents: null,
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
  clientSaleSignals: null,
  latestClientSaleSignalAt: null,
  latestClientSaleSourcePeriodEnd: null,
  clientSaleSignalSourceFiles: null,
  latestIngestionAt: null,
  latestIngestionStatus: null,
  latestIngestionAccepted: null,
  latestIngestionRejected: null,
  latestIngestionFullSnapshot: null,
  latestIngestionNew: null,
  latestIngestionUpdated: null,
  latestIngestionUnchanged: null,
  latestIngestionRemoved: null,
  latestDiscoveryRawCandidates: null,
  latestDiscoveryUniqueListings: null,
  latestDiscoveryDuplicateCandidates: null,
  latestDiscoveryPages: null,
  latestPortalReportedCount: null,
  latestInventoryCoverageRatio: null,
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

  const ageDays = propertyPartnersCalendarDayAge(value)
  if (ageDays === null) return { ageDays: null, status: 'unknown' as const }
  if (ageDays <= 3) return { ageDays, status: 'recent' as const }
  if (ageDays <= 7) return { ageDays, status: 'aging' as const }
  return { ageDays, status: 'stale' as const }
}

export async function getOperationalMarketSnapshot(): Promise<OperationalMarketSnapshot> {
  try {
    const supabase = await createClient()
    const service = createServiceClient()
    const [houseSummaryResult, territoryProgressResult, identityProgressResult, scopeSummaryResult, highIdentityCandidates, clientSaleSignalsResult, confirmedSalesResult, latestMetric, latestInventoryRunResult, latestDetailRunResult, ingestionRuns] = await Promise.all([
      supabase.rpc('get_market_house_delivery_summary_v1').maybeSingle(),
      supabase.rpc('get_market_house_territory_progress_v1').maybeSingle(),
      supabase.rpc('get_market_house_identity_progress_v1').maybeSingle(),
      supabase.rpc('get_market_house_scope_summary_v1').maybeSingle(),
      supabase
        .from('market_property_matches')
        .select('id', { count: 'exact', head: true })
        .eq('left_entity_type', 'listing')
        .eq('right_entity_type', 'property')
        .eq('status', 'candidate_high'),
      supabase.rpc('get_market_client_sale_signal_summary_v1').maybeSingle(),
      supabase
        .from('market_transactions')
        .select('id,market_properties!inner(property_type)', { count: 'exact', head: true })
        .eq('market_properties.property_type', 'Casa'),
      supabase
        .from('market_metric_snapshots')
        .select('period_start,period_end,active_inventory,confirmed_sales,median_days_on_market,absorption_rate,offer_to_sales_ratio')
        .is('neighborhood_id', null)
        .eq('property_type', 'Casa')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('market_ingestion_runs')
        .select('id,status,accepted_rows,rejected_rows,completed_at,started_at,metadata')
        .eq('dataset_kind', 'portal_houses')
        .contains('metadata', { pipeline: 'portal_inventory_discovery_v1', full_snapshot: true })
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('market_ingestion_runs')
        .select('id,status,accepted_rows,rejected_rows,completed_at,started_at,metadata')
        .eq('dataset_kind', 'portal_houses')
        .contains('metadata', { pipeline: 'unit_portal_listing_v2' })
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from('market_ingestion_runs')
        .select('id', { count: 'exact', head: true })
        .eq('dataset_kind', 'portal_houses'),
    ])

    const errors = [
      houseSummaryResult.error,
      territoryProgressResult.error,
      identityProgressResult.error,
      scopeSummaryResult.error,
      highIdentityCandidates.error,
      clientSaleSignalsResult.error,
      confirmedSalesResult.error,
      latestMetric.error,
      latestInventoryRunResult.error,
      latestDetailRunResult.error,
      ingestionRuns.error,
    ].filter(Boolean)

    const house = houseSummaryResult.data as HouseDeliverySummary | null
    const territoryProgress = territoryProgressResult.data as HouseTerritoryProgress | null
    const identityProgress = identityProgressResult.data as HouseIdentityProgress | null
    const scopeSummary = scopeSummaryResult.data as HouseScopeSummary | null
    const clientSaleSignals = clientSaleSignalsResult.data as ClientSaleSignalSummary | null
    const metric = latestMetric.data
    const inventoryRun = latestInventoryRunResult.data ?? null
    const detailRun = latestDetailRunResult.data ?? null
    const inventoryMetadata = inventoryRun?.metadata && typeof inventoryRun.metadata === 'object'
      ? inventoryRun.metadata as Record<string, unknown>
      : null
    const detailMetadata = detailRun?.metadata && typeof detailRun.metadata === 'object'
      ? detailRun.metadata as Record<string, unknown>
      : null
    const inventoryCount = inventoryMetadata?.discovery_unique_listings == null
      ? null
      : Number(inventoryMetadata.discovery_unique_listings)
    const latestObservedAt = inventoryRun?.completed_at ?? inventoryRun?.started_at ?? house?.portal_as_of ?? null
    const freshness = getObservationFreshness(latestObservedAt)
    const operationalHouseSales = confirmedSalesResult.error ? null : confirmedSalesResult.count ?? 0

    return {
      connected: errors.length === 0,
      canonicalProperties: scopeSummaryResult.error ? (houseSummaryResult.error ? null : house?.canonical_houses ?? 0) : scopeSummary?.v1_house_rows ?? 0,
      confirmedProperties: scopeSummaryResult.error ? (houseSummaryResult.error ? null : house?.confirmed_houses ?? 0) : scopeSummary?.v1_confirmed_rows ?? 0,
      missingNeighborhoods: scopeSummaryResult.error ? (houseSummaryResult.error ? null : house?.missing_neighborhood_houses ?? 0) : scopeSummary?.v1_missing_neighborhood_rows ?? 0,
      physicalHouseRows: scopeSummaryResult.error ? null : scopeSummary?.physical_house_rows ?? 0,
      outOfScopeLegacyHouses: scopeSummaryResult.error ? null : scopeSummary?.explicit_out_of_scope_rows ?? 0,
      logicalHouseComponents: scopeSummaryResult.error ? null : scopeSummary?.logical_house_components ?? 0,
      confirmedDuplicateRows: scopeSummaryResult.error ? null : scopeSummary?.confirmed_duplicate_rows ?? 0,
      duplicateComponents: scopeSummaryResult.error ? null : scopeSummary?.duplicate_components ?? 0,
      logicalComponentsWithNeighborhood: scopeSummaryResult.error ? null : scopeSummary?.logical_components_with_neighborhood ?? 0,
      conflictingNeighborhoodComponents: scopeSummaryResult.error ? null : scopeSummary?.conflicting_neighborhood_components ?? 0,
      // The canonical live Portal house universe is owned by the dedicated
      // Vitacura house source. The legacy Portal source remains historical
      // evidence and must never inflate today's available inventory.
      activeInventory: inventoryRun && inventoryCount != null && Number.isFinite(inventoryCount)
        ? inventoryCount
        : null,
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
      historicalIdentityCandidates: scopeSummaryResult.error ? null : scopeSummary?.v1_identity_candidates ?? 0,
      liveLinkedHouses: identityProgressResult.error ? null : identityProgress?.linked_houses ?? 0,
      identityCollisions: identityProgressResult.error ? null : identityProgress?.external_identity_collisions ?? 0,
      newLiveIdentityCases: identityProgressResult.error ? null : identityProgress?.unlinked_without_existing_external_identity ?? 0,
      highConfidenceIdentityCandidates: highIdentityCandidates.error ? null : highIdentityCandidates.count ?? 0,
      clientSaleSignals: clientSaleSignalsResult.error ? null : clientSaleSignals?.accepted_house_signals ?? 0,
      latestClientSaleSignalAt: clientSaleSignalsResult.error ? null : clientSaleSignals?.latest_observed_at ?? null,
      latestClientSaleSourcePeriodEnd: clientSaleSignalsResult.error ? null : clientSaleSignals?.latest_source_period_end ?? null,
      clientSaleSignalSourceFiles: clientSaleSignalsResult.error ? null : clientSaleSignals?.source_files ?? 0,
      latestIngestionAt: (latestInventoryRunResult.error || latestDetailRunResult.error) ? null : inventoryRun?.completed_at ?? inventoryRun?.started_at ?? detailRun?.completed_at ?? detailRun?.started_at ?? null,
      latestIngestionStatus: (latestInventoryRunResult.error || latestDetailRunResult.error) ? null : inventoryRun?.status ?? detailRun?.status ?? null,
      latestIngestionAccepted: (latestInventoryRunResult.error || latestDetailRunResult.error) ? null : inventoryRun?.accepted_rows ?? detailRun?.accepted_rows ?? null,
      latestIngestionRejected: (latestInventoryRunResult.error || latestDetailRunResult.error) ? null : inventoryRun?.rejected_rows ?? detailRun?.rejected_rows ?? null,
      latestIngestionFullSnapshot: (latestInventoryRunResult.error || latestDetailRunResult.error)
        ? null
        : typeof inventoryMetadata?.full_snapshot === 'boolean'
          ? inventoryMetadata.full_snapshot
          : null,
      latestIngestionNew: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.new_listings == null ? null : Number(inventoryMetadata.new_listings),
      latestIngestionUpdated: (latestInventoryRunResult.error || latestDetailRunResult.error) || detailMetadata?.updated_listings == null ? null : Number(detailMetadata.updated_listings),
      latestIngestionUnchanged: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.unchanged_listings == null ? null : Number(inventoryMetadata.unchanged_listings),
      latestIngestionRemoved: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.removed_listings == null ? null : Number(inventoryMetadata.removed_listings),
      latestDiscoveryRawCandidates: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.discovery_raw_candidates == null
        ? null
        : Number(inventoryMetadata.discovery_raw_candidates),
      latestDiscoveryUniqueListings: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.discovery_unique_listings == null
        ? null
        : Number(inventoryMetadata.discovery_unique_listings),
      latestDiscoveryDuplicateCandidates: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.discovery_duplicate_candidates == null
        ? null
        : Number(inventoryMetadata.discovery_duplicate_candidates),
      latestDiscoveryPages: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.discovery_pages == null
        ? null
        : Number(inventoryMetadata.discovery_pages),
      latestPortalReportedCount: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.portal_reported_result_count == null
        ? null
        : Number(inventoryMetadata.portal_reported_result_count),
      latestInventoryCoverageRatio: (latestInventoryRunResult.error || latestDetailRunResult.error) || inventoryMetadata?.inventory_coverage_ratio == null
        ? null
        : Number(inventoryMetadata.inventory_coverage_ratio),
      ingestionRuns: ingestionRuns.error ? null : ingestionRuns.count ?? 0,
      latestObservedAt: houseSummaryResult.error ? null : latestObservedAt,
      observationAgeDays: houseSummaryResult.error ? null : freshness.ageDays,
      freshnessStatus: houseSummaryResult.error ? 'unknown' : freshness.status,
      liveHouseCount: inventoryRun && inventoryCount != null && Number.isFinite(inventoryCount)
        ? inventoryCount
        : null,
      exactKmlLiveHouses: territoryProgressResult.error ? null : territoryProgress?.exact_kml_houses ?? 0,
      pendingUniqueTerritorySuggestions: territoryProgressResult.error ? null : territoryProgress?.pending_unique_suggestions ?? 0,
      ambiguousTerritorySuggestions: territoryProgressResult.error ? null : territoryProgress?.ambiguous_suggestions ?? 0,
      unmatchedTerritoryHouses: territoryProgressResult.error ? null : territoryProgress?.unmatched_houses ?? 0,
      acceptedTerritoryReviews: territoryProgressResult.error ? null : territoryProgress?.accepted_reviews ?? 0,
      rejectedTerritoryReviews: territoryProgressResult.error ? null : territoryProgress?.rejected_reviews ?? 0,
      cbrsHouseTransactions: houseSummaryResult.error ? null : house?.cbrs_house_transactions ?? 0,
      latestCbrsHouseSaleDate: houseSummaryResult.error ? null : house?.cbrs_as_of ?? null,
      error: errors.length ? errors.map((error) => error?.message).join(' · ') : undefined,
    }
  } catch (error) {
    return { ...emptySnapshot, error: error instanceof Error ? error.message : 'No fue posible consultar la base operativa.' }
  }
}
