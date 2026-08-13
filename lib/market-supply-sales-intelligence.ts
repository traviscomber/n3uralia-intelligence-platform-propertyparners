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
        supplyDepthRatio: row.supply_depth_ratio == null ? null : Number(row.supply_depth_ratio),
        signal: row.signal,
        confidence: row.confidence,
      })),
    }
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'No fue posible consultar la inteligencia oferta/ventas.' }
  }
}
