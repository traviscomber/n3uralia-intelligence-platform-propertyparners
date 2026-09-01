import { createClient } from '@/lib/supabase/server'

export type NeighborhoodReviewSnapshot = {
  clear: number
  pending: number
  accepted: number
  discarded: number
  ambiguous: number
  noMatch: number
  reviewed: number
  resolvedBySystem: number
  reviewedRate: number | null
  acceptanceRate: number | null
  knownAddresses: number
  learnedFromReviews: number
  learnedFromSystem: number
  reuseHits: number
  approveRecommended: number
  quickReview: number
  mandatoryReview: number
  unassessed: number
  error: string | null
}

type UatSnapshot = {
  current_houses?: number
  clear?: number
  pending?: number
  accepted?: number
  discarded?: number
  ambiguous?: number
  no_match?: number
  reviewed?: number
  resolved_by_system?: number
  known_addresses?: number
  learned_from_reviews?: number
  learned_from_system?: number
  reuse_hits?: number
  approve_recommended?: number
  quick_review?: number
  mandatory_review?: number
}

const emptySnapshot: NeighborhoodReviewSnapshot = {
  clear: 0,
  pending: 0,
  accepted: 0,
  discarded: 0,
  ambiguous: 0,
  noMatch: 0,
  reviewed: 0,
  resolvedBySystem: 0,
  reviewedRate: null,
  acceptanceRate: null,
  knownAddresses: 0,
  learnedFromReviews: 0,
  learnedFromSystem: 0,
  reuseHits: 0,
  approveRecommended: 0,
  quickReview: 0,
  mandatoryReview: 0,
  unassessed: 0,
  error: null,
}

export async function getNeighborhoodReviewSnapshot(): Promise<NeighborhoodReviewSnapshot> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('market_neighborhood_uat_snapshot')

  if (error) return { ...emptySnapshot, error: error.message }

  const uat = (data || {}) as UatSnapshot
  const clear = Number(uat.clear || 0)
  const pending = Number(uat.pending || 0)
  const accepted = Number(uat.accepted || 0)
  const discarded = Number(uat.discarded || 0)
  const reviewed = Number(uat.reviewed || 0)
  const resolvedBySystem = Number(uat.resolved_by_system || 0)
  const currentHouses = Number(uat.current_houses || 0)
  const humanDecisions = accepted + discarded
  const approveRecommended = Number(uat.approve_recommended || 0)
  const quickReview = Number(uat.quick_review || 0)
  const mandatoryReview = Number(uat.mandatory_review || 0)

  return {
    clear,
    pending,
    accepted,
    discarded,
    ambiguous: Number(uat.ambiguous || 0),
    noMatch: Number(uat.no_match || 0),
    reviewed,
    resolvedBySystem,
    reviewedRate: currentHouses > 0 ? reviewed / currentHouses : null,
    acceptanceRate: humanDecisions > 0 ? accepted / humanDecisions : null,
    knownAddresses: Number(uat.known_addresses || 0),
    learnedFromReviews: Number(uat.learned_from_reviews || 0),
    learnedFromSystem: Number(uat.learned_from_system || 0),
    reuseHits: Number(uat.reuse_hits || 0),
    approveRecommended,
    quickReview,
    mandatoryReview,
    unassessed: Math.max(0, pending - approveRecommended - quickReview - mandatoryReview),
    error: null,
  }
}
