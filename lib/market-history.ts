import type { SupabaseClient } from '@supabase/supabase-js'

export type MarketSnapshotRow = {
  neighborhood: string
  avg_price_uf: number | null
  avg_price_m2_uf: number | null
  absorption_rate: number | null
  inventory_count: number
  avg_days_on_market: number | null
  source: string
  source_url: string | null
  recorded_at: string
  snapshot_date: string
}

export type NeighborhoodMarketSnapshot = MarketSnapshotRow & {
  data_points: number
}

export function buildNeighborhoodSnapshotRows(rows: MarketSnapshotRow[]) {
  return rows.map<NeighborhoodMarketSnapshot>((row) => ({
    ...row,
    data_points: 1,
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
