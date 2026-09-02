import { createClient } from '@/lib/supabase/server'

export type SupplySalesRow = {
  neighborhoodName: string
  propertyType: 'Departamento' | 'Casa'
  portalListings: number
  cbrsTransactions: number
  portalMedianPriceUf: number | null
  cbrsMedianPriceUf: number | null
  priceGapPct: number | null
  portalMedianUfM2: number | null
  cbrsMedianUfM2: number | null
  ufM2GapPct: number | null
  supplyDepthRatio: number | null
  signal: string
  confidence: string
}

export type HouseSupplySalesLiveRow = {
  neighborhoodName: string
  portalListings: number
  cbrsTransactions: number
  portalMedianPriceUf: number | null
  cbrsMedianPriceUf: number | null
  priceGapPct: number | null
  portalMedianUfM2: number | null
  cbrsMedianUfM2: number | null
  ufM2GapPct: number | null
  supplyDepthRatio: number | null
  asOfPortal: string | null
  asOfCbrs: string | null
}

function supplySalesRow(row: Record<string, unknown>): SupplySalesRow {
  return {
    neighborhoodName: String(row.neighborhood_name ?? ''),
    propertyType: row.property_type as 'Departamento' | 'Casa',
    portalListings: Number(row.portal_listings ?? 0),
    cbrsTransactions: Number(row.cbrs_transactions ?? 0),
    portalMedianPriceUf: row.portal_median_price_uf == null ? null : Number(row.portal_median_price_uf),
    cbrsMedianPriceUf: row.cbrs_median_price_uf == null ? null : Number(row.cbrs_median_price_uf),
    priceGapPct: row.price_gap_pct == null ? null : Number(row.price_gap_pct),
    portalMedianUfM2: row.portal_median_uf_m2 == null ? null : Number(row.portal_median_uf_m2),
    cbrsMedianUfM2: row.cbrs_median_uf_m2 == null ? null : Number(row.cbrs_median_uf_m2),
    ufM2GapPct: row.uf_m2_gap_pct == null ? null : Number(row.uf_m2_gap_pct),
    supplyDepthRatio: row.supply_depth_ratio == null ? null : Number(row.supply_depth_ratio),
    signal: String(row.signal ?? 'insufficient_data'),
    confidence: String(row.confidence ?? 'low'),
  }
}

export async function getSupplySalesIntelligence(): Promise<{ rows: SupplySalesRow[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_market_supply_sales_intelligence_v1')

    if (error) return { rows: [], error: error.message }

    const rows = (data ?? []) as Record<string, unknown>[]
    return { rows: rows.map(supplySalesRow) }
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia oferta/ventas.' }
  }
}

export async function getHouseSupplySalesLive(): Promise<{ rows: HouseSupplySalesLiveRow[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_market_house_supply_sales_live_v1')

    if (error) return { rows: [], error: error.message }

    const rows = (data ?? []) as Record<string, unknown>[]
    return {
      rows: rows.map((row) => ({
        neighborhoodName: String(row.neighborhood_name ?? ''),
        portalListings: Number(row.portal_listings ?? 0),
        cbrsTransactions: Number(row.cbrs_transactions ?? 0),
        portalMedianPriceUf: row.portal_median_price_uf == null ? null : Number(row.portal_median_price_uf),
        cbrsMedianPriceUf: row.cbrs_median_price_uf == null ? null : Number(row.cbrs_median_price_uf),
        priceGapPct: row.price_gap_pct == null ? null : Number(row.price_gap_pct),
        portalMedianUfM2: row.portal_median_uf_m2 == null ? null : Number(row.portal_median_uf_m2),
        cbrsMedianUfM2: row.cbrs_median_uf_m2 == null ? null : Number(row.cbrs_median_uf_m2),
        ufM2GapPct: row.uf_m2_gap_pct == null ? null : Number(row.uf_m2_gap_pct),
        supplyDepthRatio: row.supply_depth_ratio == null ? null : Number(row.supply_depth_ratio),
        asOfPortal: row.as_of_portal == null ? null : String(row.as_of_portal),
        asOfCbrs: row.as_of_cbrs == null ? null : String(row.as_of_cbrs),
      })),
    }
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'No fue posible consultar la oferta activa de casas.' }
  }
}

export type MarketGeometryRow = {
  neighborhoodName: string
  geometry: unknown
}

export type MarketHistoryRow = {
  periodStart: string
  periodEnd: string
  neighborhoodId: string | null
  neighborhoodName: string | null
  propertyType: string | null
  activeInventory: number | null
  confirmedSales: number | null
  absorptionRate: number | null
  offerToSalesRatio: number | null
  methodologyVersion: string | null
}

export type MarketIntelligenceContext = {
  geometries: MarketGeometryRow[]
  history: MarketHistoryRow[]
  historyPeriods: string[]
  error?: string
}

export async function getMarketIntelligenceContext(): Promise<MarketIntelligenceContext> {
  try {
    const supabase = await createClient()
    const [historyResult, neighborhoodsResult] = await Promise.all([
      supabase
        .from('market_metric_snapshots')
        .select('period_start,period_end,neighborhood_id,property_type,active_inventory,confirmed_sales,absorption_rate,offer_to_sales_ratio,methodology_version')
        .order('period_start', { ascending: true }),
      supabase
        .from('market_neighborhoods')
        .select('id,name,micro_neighborhood,geometry'),
    ])

    const firstError = historyResult.error || neighborhoodsResult.error
    if (firstError) return { geometries: [], history: [], historyPeriods: [], error: firstError.message }

    const nameById = new Map<string, string>()
    for (const row of neighborhoodsResult.data ?? []) {
      nameById.set(row.id, row.micro_neighborhood || row.name)
    }

    const history: MarketHistoryRow[] = (historyResult.data ?? []).map((row) => ({
      periodStart: row.period_start,
      periodEnd: row.period_end,
      neighborhoodId: row.neighborhood_id,
      neighborhoodName: row.neighborhood_id ? nameById.get(row.neighborhood_id) ?? null : null,
      propertyType: row.property_type,
      activeInventory: row.active_inventory == null ? null : Number(row.active_inventory),
      confirmedSales: row.confirmed_sales == null ? null : Number(row.confirmed_sales),
      absorptionRate: row.absorption_rate == null ? null : Number(row.absorption_rate),
      offerToSalesRatio: row.offer_to_sales_ratio == null ? null : Number(row.offer_to_sales_ratio),
      methodologyVersion: row.methodology_version,
    }))

    return {
      geometries: (neighborhoodsResult.data ?? [])
        .filter((row) => row.geometry)
        .map((row) => ({
          neighborhoodName: row.micro_neighborhood || row.name,
          geometry: row.geometry,
        })),
      history,
      historyPeriods: [...new Set(history.map((row) => row.periodStart))],
    }
  } catch (error) {
    return {
      geometries: [],
      history: [],
      historyPeriods: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar el contexto territorial e histórico de mercado.',
    }
  }
}
