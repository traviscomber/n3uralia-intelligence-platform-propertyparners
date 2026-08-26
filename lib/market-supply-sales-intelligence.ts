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

export async function getSupplySalesIntelligence(): Promise<{ rows: SupplySalesRow[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_supply_sales_intelligence')
      .select('neighborhood_name,property_type,portal_listings,cbrs_transactions,portal_median_price_uf,cbrs_median_price_uf,price_gap_pct,portal_median_uf_m2,cbrs_median_uf_m2,uf_m2_gap_pct,supply_depth_ratio,signal,confidence')
      .order('uf_m2_gap_pct', { ascending: false, nullsFirst: false })

    if (error) return { rows: [], error: error.message }

    return {
      rows: (data ?? []).map((row) => ({
        neighborhoodName: row.neighborhood_name,
        propertyType: row.property_type as 'Departamento' | 'Casa',
        portalListings: Number(row.portal_listings ?? 0),
        cbrsTransactions: Number(row.cbrs_transactions ?? 0),
        portalMedianPriceUf: row.portal_median_price_uf == null ? null : Number(row.portal_median_price_uf),
        cbrsMedianPriceUf: row.cbrs_median_price_uf == null ? null : Number(row.cbrs_median_price_uf),
        priceGapPct: row.price_gap_pct == null ? null : Number(row.price_gap_pct),
        portalMedianUfM2: row.portal_median_uf_m2 == null ? null : Number(row.portal_median_uf_m2),
        cbrsMedianUfM2: row.cbrs_median_uf_m2 == null ? null : Number(row.cbrs_median_uf_m2),
        ufM2GapPct: row.uf_m2_gap_pct == null ? null : Number(row.uf_m2_gap_pct),
        supplyDepthRatio: row.supply_depth_ratio == null ? null : Number(row.supplyDepthRatio ?? row.supply_depth_ratio),
        signal: row.signal,
        confidence: row.confidence,
      })),
    }
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia oferta/ventas.' }
  }
}

export async function getMarketIntelligenceContext(): Promise<MarketIntelligenceContext> {
  try {
    const supabase = await createClient()
    const [geometryResult, historyResult, neighborhoodsResult] = await Promise.all([
      supabase
        .from('vitacura_market_neighborhoods')
        .select('barrio_nombre,geometry')
        .eq('fuente', 'Property Partners')
        .eq('version', '2026-08-12'),
      supabase
        .from('market_metric_snapshots')
        .select('period_start,period_end,neighborhood_id,property_type,active_inventory,confirmed_sales,absorption_rate,offer_to_sales_ratio,methodology_version')
        .order('period_start', { ascending: true }),
      supabase
        .from('market_neighborhoods')
        .select('id,name,micro_neighborhood'),
    ])

    const firstError = geometryResult.error || historyResult.error || neighborhoodsResult.error
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
      geometries: (geometryResult.data ?? []).map((row) => ({
        neighborhoodName: row.barrio_nombre,
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
