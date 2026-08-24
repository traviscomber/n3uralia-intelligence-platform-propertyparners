import { createClient } from '@/lib/supabase/server'

export type MarketHouseDeliverySummary = {
  portalActiveHouses: number | null
  portalCurrentHouses: number | null
  portalPricedHouses: number | null
  portalPricedM2Houses: number | null
  portalExactKmlHouses: number | null
  territorySuggestions: number | null
  territoryAmbiguous: number | null
  territoryUnmatched: number | null
  territoryAcceptedReviews: number | null
  territoryRejectedReviews: number | null
  portalMedianPriceUf: number | null
  portalMedianUfM2: number | null
  portalAsOf: string | null
  referenceHouses: number | null
  referenceGeocodedHouses: number | null
  referencePricedHouses: number | null
  referenceMedianPriceUf: number | null
  referenceMedianUfM2: number | null
  referenceMedianAreaM2: number | null
  referenceAsOf: string | null
  cbrsHouseTransactions: number | null
  cbrsHouseWithNeighborhood: number | null
  cbrsMedianPriceUf: number | null
  cbrsMedianUfM2: number | null
  cbrsMedianBuiltAreaM2: number | null
  cbrsMedianLandAreaM2: number | null
  cbrsAsOf: string | null
  canonicalHouses: number | null
  confirmedHouses: number | null
  exactKmlHouses: number | null
  reviewHouses: number | null
  missingNeighborhoodHouses: number | null
  kmlNeighborhoods: number | null
}

export type MarketHouseNeighborhoodSales = {
  neighborhoodName: string
  cbrsTransactions: number
  cbrsMedianPriceUf: number | null
  cbrsMedianUfM2: number | null
  cbrsAsOf: string | null
}

export type MarketHouseIntelligence = {
  summary: MarketHouseDeliverySummary
  neighborhoods: MarketHouseNeighborhoodSales[]
  error?: string
}

export type MarketHouseSignals = {
  mostSales: MarketHouseNeighborhoodSales | null
  highestUfM2: MarketHouseNeighborhoodSales | null
  minimumSample: number
}

export type MarketHouseTerritoryQueueItem = {
  sourceId: string
  sourceListingId: string
  listingUrl: string | null
  listingAddress: string
  suggestedNeighborhoodId: string | null
  suggestedNeighborhoodName: string | null
  candidateCount: number
  reviewStatus: 'suggested' | 'ambiguous' | 'unmatched'
}

export const MARKET_HOUSE_SIGNAL_MINIMUM_SAMPLE = 30

type SummaryDbRow = {
  portal_active_houses: number | null
  portal_current_houses: number | null
  portal_priced_houses: number | null
  portal_priced_m2_houses: number | null
  portal_exact_kml_houses: number | null
  portal_median_price_uf: number | null
  portal_median_uf_m2: number | null
  portal_as_of: string | null
  reference_houses: number | null
  reference_geocoded_houses: number | null
  reference_priced_houses: number | null
  reference_median_price_uf: number | null
  reference_median_uf_m2: number | null
  reference_median_area_m2: number | null
  reference_as_of: string | null
  cbrs_house_transactions: number | null
  cbrs_house_with_neighborhood: number | null
  cbrs_median_price_uf: number | null
  cbrs_median_uf_m2: number | null
  cbrs_median_built_area_m2: number | null
  cbrs_median_land_area_m2: number | null
  cbrs_as_of: string | null
  canonical_houses: number | null
  confirmed_houses: number | null
  exact_kml_houses: number | null
  review_houses: number | null
  missing_neighborhood_houses: number | null
  kml_neighborhoods: number | null
}

type NeighborhoodDbRow = {
  neighborhood_name: string
  cbrs_transactions: number | null
  cbrs_median_price_uf: number | null
  cbrs_median_uf_m2: number | null
  cbrs_as_of: string | null
}

type TerritoryProgressDbRow = {
  portal_current_houses: number | null
  exact_kml_houses: number | null
  pending_unique_suggestions: number | null
  ambiguous_suggestions: number | null
  unmatched_houses: number | null
  accepted_reviews: number | null
  rejected_reviews: number | null
}

type TerritoryQueueDbRow = {
  source_id: string
  source_listing_id: string
  listing_url: string | null
  listing_address: string | null
  suggested_neighborhood_id: string | null
  suggested_neighborhood_name: string | null
  candidate_count: number | null
  review_status: 'suggested' | 'ambiguous' | 'unmatched'
}

export const emptyMarketHouseDeliverySummary: MarketHouseDeliverySummary = {
  portalActiveHouses: null,
  portalCurrentHouses: null,
  portalPricedHouses: null,
  portalPricedM2Houses: null,
  portalExactKmlHouses: null,
  territorySuggestions: null,
  territoryAmbiguous: null,
  territoryUnmatched: null,
  territoryAcceptedReviews: null,
  territoryRejectedReviews: null,
  portalMedianPriceUf: null,
  portalMedianUfM2: null,
  portalAsOf: null,
  referenceHouses: null,
  referenceGeocodedHouses: null,
  referencePricedHouses: null,
  referenceMedianPriceUf: null,
  referenceMedianUfM2: null,
  referenceMedianAreaM2: null,
  referenceAsOf: null,
  cbrsHouseTransactions: null,
  cbrsHouseWithNeighborhood: null,
  cbrsMedianPriceUf: null,
  cbrsMedianUfM2: null,
  cbrsMedianBuiltAreaM2: null,
  cbrsMedianLandAreaM2: null,
  cbrsAsOf: null,
  canonicalHouses: null,
  confirmedHouses: null,
  exactKmlHouses: null,
  reviewHouses: null,
  missingNeighborhoodHouses: null,
  kmlNeighborhoods: null,
}

function numberOrNull(value: number | null | undefined) {
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value)
}

function mapSummary(row: SummaryDbRow | undefined): MarketHouseDeliverySummary {
  if (!row) return emptyMarketHouseDeliverySummary
  return {
    portalActiveHouses: numberOrNull(row.portal_active_houses),
    portalCurrentHouses: numberOrNull(row.portal_current_houses),
    portalPricedHouses: numberOrNull(row.portal_priced_houses),
    portalPricedM2Houses: numberOrNull(row.portal_priced_m2_houses),
    portalExactKmlHouses: numberOrNull(row.portal_exact_kml_houses),
    territorySuggestions: null,
    territoryAmbiguous: null,
    territoryUnmatched: null,
    territoryAcceptedReviews: null,
    territoryRejectedReviews: null,
    portalMedianPriceUf: numberOrNull(row.portal_median_price_uf),
    portalMedianUfM2: numberOrNull(row.portal_median_uf_m2),
    portalAsOf: row.portal_as_of ?? null,
    referenceHouses: numberOrNull(row.reference_houses),
    referenceGeocodedHouses: numberOrNull(row.reference_geocoded_houses),
    referencePricedHouses: numberOrNull(row.reference_priced_houses),
    referenceMedianPriceUf: numberOrNull(row.reference_median_price_uf),
    referenceMedianUfM2: numberOrNull(row.reference_median_uf_m2),
    referenceMedianAreaM2: numberOrNull(row.reference_median_area_m2),
    referenceAsOf: row.reference_as_of ?? null,
    cbrsHouseTransactions: numberOrNull(row.cbrs_house_transactions),
    cbrsHouseWithNeighborhood: numberOrNull(row.cbrs_house_with_neighborhood),
    cbrsMedianPriceUf: numberOrNull(row.cbrs_median_price_uf),
    cbrsMedianUfM2: numberOrNull(row.cbrs_median_uf_m2),
    cbrsMedianBuiltAreaM2: numberOrNull(row.cbrs_median_built_area_m2),
    cbrsMedianLandAreaM2: numberOrNull(row.cbrs_median_land_area_m2),
    cbrsAsOf: row.cbrs_as_of ?? null,
    canonicalHouses: numberOrNull(row.canonical_houses),
    confirmedHouses: numberOrNull(row.confirmed_houses),
    exactKmlHouses: numberOrNull(row.exact_kml_houses),
    reviewHouses: numberOrNull(row.review_houses),
    missingNeighborhoodHouses: numberOrNull(row.missing_neighborhood_houses),
    kmlNeighborhoods: numberOrNull(row.kml_neighborhoods),
  }
}

function withTerritoryProgress(
  summary: MarketHouseDeliverySummary,
  row: TerritoryProgressDbRow | undefined,
): MarketHouseDeliverySummary {
  if (!row) return summary
  return {
    ...summary,
    portalCurrentHouses: numberOrNull(row.portal_current_houses) ?? summary.portalCurrentHouses,
    portalExactKmlHouses: numberOrNull(row.exact_kml_houses),
    territorySuggestions: numberOrNull(row.pending_unique_suggestions),
    territoryAmbiguous: numberOrNull(row.ambiguous_suggestions),
    territoryUnmatched: numberOrNull(row.unmatched_houses),
    territoryAcceptedReviews: numberOrNull(row.accepted_reviews),
    territoryRejectedReviews: numberOrNull(row.rejected_reviews),
  }
}

export function missingExactPortalNeighborhoods(summary: MarketHouseDeliverySummary) {
  if (summary.portalCurrentHouses === null || summary.portalExactKmlHouses === null) return null
  return Math.max(summary.portalCurrentHouses - summary.portalExactKmlHouses, 0)
}

export function hasComparablePortalTerritory(summary: MarketHouseDeliverySummary) {
  if (!summary.portalCurrentHouses || summary.portalExactKmlHouses === null) return false
  return summary.portalExactKmlHouses >= 3 && summary.portalExactKmlHouses / summary.portalCurrentHouses >= 0.8
}

export function buildMarketHouseSignals(
  neighborhoods: MarketHouseNeighborhoodSales[],
  minimumSample = MARKET_HOUSE_SIGNAL_MINIMUM_SAMPLE,
): MarketHouseSignals {
  const eligible = neighborhoods.filter((row) => row.cbrsTransactions >= minimumSample)
  const mostSales = [...eligible].sort((left, right) =>
    right.cbrsTransactions - left.cbrsTransactions
      || left.neighborhoodName.localeCompare(right.neighborhoodName, 'es'),
  )[0] ?? null
  const highestUfM2 = eligible
    .filter((row) => row.cbrsMedianUfM2 !== null)
    .sort((left, right) =>
      (right.cbrsMedianUfM2 ?? 0) - (left.cbrsMedianUfM2 ?? 0)
        || right.cbrsTransactions - left.cbrsTransactions
        || left.neighborhoodName.localeCompare(right.neighborhoodName, 'es'),
    )[0] ?? null

  return { mostSales, highestUfM2, minimumSample }
}

export async function getMarketHouseDeliverySummary(): Promise<{ summary: MarketHouseDeliverySummary; error?: string }> {
  try {
    const supabase = await createClient()
    const [summaryResult, territoryResult] = await Promise.all([
      supabase.rpc('get_market_house_delivery_summary_v1'),
      supabase.rpc('get_market_house_territory_progress_v1'),
    ])
    const errors = [summaryResult.error?.message, territoryResult.error?.message].filter(
      (message): message is string => Boolean(message),
    )
    const summary = summaryResult.error
      ? emptyMarketHouseDeliverySummary
      : mapSummary(((summaryResult.data ?? []) as SummaryDbRow[])[0])
    return {
      summary: territoryResult.error
        ? summary
        : withTerritoryProgress(summary, ((territoryResult.data ?? []) as TerritoryProgressDbRow[])[0]),
      error: errors.length ? errors.join(' · ') : undefined,
    }
  } catch (error) {
    return {
      summary: emptyMarketHouseDeliverySummary,
      error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia de casas.',
    }
  }
}

export async function getMarketHouseIntelligence(): Promise<MarketHouseIntelligence> {
  try {
    const supabase = await createClient()
    const [summaryResult, neighborhoodsResult, territoryResult] = await Promise.all([
      supabase.rpc('get_market_house_delivery_summary_v1'),
      supabase.rpc('get_market_house_neighborhood_sales_v1'),
      supabase.rpc('get_market_house_territory_progress_v1'),
    ])

    const errors = [summaryResult.error?.message, neighborhoodsResult.error?.message, territoryResult.error?.message].filter(
      (message): message is string => Boolean(message),
    )

    const neighborhoods = neighborhoodsResult.error
      ? []
      : ((neighborhoodsResult.data ?? []) as NeighborhoodDbRow[]).map((row) => ({
          neighborhoodName: row.neighborhood_name,
          cbrsTransactions: Number(row.cbrs_transactions ?? 0),
          cbrsMedianPriceUf: numberOrNull(row.cbrs_median_price_uf),
          cbrsMedianUfM2: numberOrNull(row.cbrs_median_uf_m2),
          cbrsAsOf: row.cbrs_as_of ?? null,
        }))

    const summary = summaryResult.error
        ? emptyMarketHouseDeliverySummary
        : mapSummary(((summaryResult.data ?? []) as SummaryDbRow[])[0])

    return {
      summary: territoryResult.error
        ? summary
        : withTerritoryProgress(summary, ((territoryResult.data ?? []) as TerritoryProgressDbRow[])[0]),
      neighborhoods,
      error: errors.length ? errors.join(' · ') : undefined,
    }
  } catch (error) {
    return {
      summary: emptyMarketHouseDeliverySummary,
      neighborhoods: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia de casas.',
    }
  }
}

export async function getMarketHouseTerritoryQueue(): Promise<{
  rows: MarketHouseTerritoryQueueItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_market_house_territory_queue_v1')
    if (error) return { rows: [], error: error.message }
    return {
      rows: ((data ?? []) as TerritoryQueueDbRow[]).map((row) => ({
        sourceId: row.source_id,
        sourceListingId: row.source_listing_id,
        listingUrl: row.listing_url,
        listingAddress: row.listing_address ?? 'Sin dirección',
        suggestedNeighborhoodId: row.suggested_neighborhood_id,
        suggestedNeighborhoodName: row.suggested_neighborhood_name,
        candidateCount: Number(row.candidate_count ?? 0),
        reviewStatus: row.review_status,
      })),
    }
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar las sugerencias.',
    }
  }
}
