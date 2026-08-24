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
  knownAddresses: number
  learnedFromReviews: number
  reuseHits: number
  approveRecommended: number
  quickReview: number
  mandatoryReview: number
  error: string | null
}

type UatSnapshot = {
  known_addresses?: number
  learned_from_reviews?: number
  reuse_hits?: number
  approve_recommended?: number
  quick_review?: number
  mandatory_review?: number
}

export async function getNeighborhoodReviewSnapshot(): Promise<NeighborhoodReviewSnapshot> {
  const supabase = await createClient()
  const [{ data, error }, { data: uatData, error: uatError }] = await Promise.all([
    supabase
      .from('market_neighborhood_review_items')
      .select('classification,decision'),
    supabase.rpc('market_neighborhood_uat_snapshot'),
  ])

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
      knownAddresses: 0,
      learnedFromReviews: 0,
      reuseHits: 0,
      approveRecommended: 0,
      quickReview: 0,
      mandatoryReview: 0,
      error: error.message,
    }
  }

  const rows = data || []
  const clearRows = rows.filter((row) => row.classification === 'clear')
  const accepted = clearRows.filter((row) => row.decision === 'accepted').length
  const discarded = clearRows.filter((row) => row.decision === 'discarded').length
  const pending = clearRows.filter((row) => row.decision === 'pending').length
  const reviewed = accepted + discarded
  const uat = (uatData || {}) as UatSnapshot

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
    knownAddresses: Number(uat.known_addresses || 0),
    learnedFromReviews: Number(uat.learned_from_reviews || 0),
    reuseHits: Number(uat.reuse_hits || 0),
    approveRecommended: Number(uat.approve_recommended || 0),
    quickReview: Number(uat.quick_review || 0),
    mandatoryReview: Number(uat.mandatory_review || 0),
    error: uatError ? uatError.message : null,
  }
}
