import type { SupabaseClient } from '@supabase/supabase-js'

export type MarketSnapshotRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
}

export type NeighborhoodMarketSnapshot = MarketSnapshotRow & {
  snapshot_date: string
  opportunity_score: number
  data_points: number
  source: 'market_data'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function scoreNeighborhoodMarket(row: MarketSnapshotRow) {
  const absorption = row.absorption_rate || 0
  const inventory = row.inventory_count || 0
  const price = row.avg_price_m2_uf || 0
  const days = row.avg_days_on_market || 0

  const absorptionScore = absorption > 0.85 ? 30 : absorption > 0.75 ? 24 : absorption > 0.6 ? 18 : 10
  const inventoryScore = inventory <= 10 ? 30 : inventory <= 20 ? 24 : inventory <= 40 ? 16 : 8
  const priceScore = price > 0 ? clamp(25 - price / 8, 5, 25) : 10
  const velocityScore = days > 0 ? clamp(20 - days / 4, 5, 20) : 8

  return Math.round(clamp(absorptionScore + inventoryScore + priceScore + velocityScore, 0, 100))
}

export function buildNeighborhoodSnapshotRows(rows: MarketSnapshotRow[], snapshotDate = new Date().toISOString().slice(0, 10)) {
  return rows.map<NeighborhoodMarketSnapshot>((row) => ({
    ...row,
    snapshot_date: snapshotDate,
    opportunity_score: scoreNeighborhoodMarket(row),
    data_points: 1,
    source: 'market_data',
  }))
}

export async function persistNeighborhoodMarketSnapshot(supabase: SupabaseClient, rows: MarketSnapshotRow[]) {
  const snapshotRows = buildNeighborhoodSnapshotRows(rows)
  if (!snapshotRows.length) {
    return []
  }

  const { error } = await supabase.from('neighborhood_market_data').upsert(snapshotRows, {
    onConflict: 'snapshot_date,neighborhood',
  })

  if (error) throw error
  return snapshotRows
}
