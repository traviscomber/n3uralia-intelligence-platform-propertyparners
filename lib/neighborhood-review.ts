import { createClient } from '@/lib/supabase/server'

export type NeighborhoodReviewSnapshot = {
  clear: number
  pending: number
  accepted: number
  discarded: number
  ambiguous: number
  noMatch: number
  reviewed: number
  reviewedRate: number | null
  acceptanceRate: number | null
  error: string | null
}

export async function getNeighborhoodReviewSnapshot(): Promise<NeighborhoodReviewSnapshot> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('market_neighborhood_review_items')
    .select('classification,decision')

  if (error) {
    return {
      clear: 0,
      pending: 0,
      accepted: 0,
      discarded: 0,
      ambiguous: 0,
      noMatch: 0,
      reviewed: 0,
      reviewedRate: null,
      acceptanceRate: null,
      error: error.message,
    }
  }

  const rows = data || []
  const clearRows = rows.filter((row) => row.classification === 'clear')
  const accepted = clearRows.filter((row) => row.decision === 'accepted').length
  const discarded = clearRows.filter((row) => row.decision === 'discarded').length
  const pending = clearRows.filter((row) => row.decision === 'pending').length
  const reviewed = accepted + discarded

  return {
    clear: clearRows.length,
    pending,
    accepted,
    discarded,
    ambiguous: rows.filter((row) => row.classification === 'ambiguous').length,
    noMatch: rows.filter((row) => row.classification === 'no_match').length,
    reviewed,
    reviewedRate: clearRows.length > 0 ? reviewed / clearRows.length : null,
    acceptanceRate: reviewed > 0 ? accepted / reviewed : null,
    error: null,
  }
}
