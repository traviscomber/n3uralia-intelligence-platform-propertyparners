import { createClient } from '@/lib/supabase/server'
import { latestCutoff } from '@/lib/market-intelligence-cutoffs'

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
  portalAsOf: string | null
  cbrsAsOf: string | null
}

export type SupplySalesSnapshot = {
  rows: SupplySalesRow[]
  portalAsOf: string | null
  cbrsAsOf: string | null
  error?: string
}

type SupplySalesDbRow = {
  neighborhood_name: string
  property_type: string
  portal_listings: number | null
  cbrs_transactions: number | null
  portal_median_price_uf: number | null
  cbrs_median_price_uf: number | null
  price_gap_pct: number | null
  portal_median_uf_m2: number | null
  cbrs_median_uf_m2: number | null
  uf_m2_gap_pct: number | null
  supply_depth_ratio: number | null
  signal: string
  confidence: string
  as_of_portal: string | null
  as_of_cbrs: string | null
}

export async function getSupplySalesIntelligence(): Promise<SupplySalesSnapshot> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_market_supply_sales_intelligence_v1')

    if (error) return { rows: [], portalAsOf: null, cbrsAsOf: null, error: error.message }

    const rows: SupplySalesRow[] = ((data ?? []) as SupplySalesDbRow[]).map((row) => ({
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
      supplyDepthRatio: row.supply_depth_ratio == null ? null : Number(row.supply_depth_ratio),
      signal: row.signal,
      confidence: row.confidence,
      portalAsOf: row.as_of_portal ?? null,
      cbrsAsOf: row.as_of_cbrs ?? null,
    }))

    return {
      rows,
      portalAsOf: latestCutoff(rows.map((row) => row.portalAsOf)),
      cbrsAsOf: latestCutoff(rows.map((row) => row.cbrsAsOf)),
    }
  } catch (error) {
    return {
      rows: [],
      portalAsOf: null,
      cbrsAsOf: null,
      error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia oferta/ventas.',
    }
  }
}
