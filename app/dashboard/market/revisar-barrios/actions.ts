'use server'

import { revalidatePath } from 'next/cache'
import { requireAnyCapability, requirePageMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

const REVIEW_PATH = '/dashboard/market/revisar-barrios'
const REVIEW_DECISIONS = new Set(['accepted', 'discarded'])
const BATCH_KINDS = new Set(['direct_kml', 'unique_kml_candidate', 'territorial_evidence'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type QueueRow = {
  review_id: string | null
  proposed_neighborhood_id: string | null
  can_decide: boolean
}

function revalidateNeighborhoodViews() {
  revalidatePath(REVIEW_PATH)
  revalidatePath('/dashboard/market')
  revalidatePath('/dashboard/ceo')
}

export async function reviewNeighborhoodBatchAction(formData: FormData) {
  const resolutionKind = String(formData.get('resolutionKind') || '')
  if (!BATCH_KINDS.has(resolutionKind)) throw new Error('Invalid neighborhood batch')

  await requireAnyCapability(['market.manage_sources', 'management.global.read'])
  await requirePageMfaLevel2(REVIEW_PATH)

  const supabase = await createClient()
  const { error } = await supabase.rpc('approve_ceo_market_neighborhood_batch_v1', {
    p_resolution_kind: resolutionKind,
  })
  if (error) throw new Error(`Unable to approve neighborhood batch: ${error.message}`)

  revalidateNeighborhoodViews()
}

export async function reviewNeighborhoodAction(formData: FormData) {
  const reviewId = String(formData.get('reviewId') || '')
  const decision = String(formData.get('decision') || '')

  if (!UUID_PATTERN.test(reviewId) || !REVIEW_DECISIONS.has(decision)) {
    throw new Error('Invalid neighborhood review request')
  }

  const scope = await requireAnyCapability(['market.manage_sources', 'management.global.read'])
  await requirePageMfaLevel2(REVIEW_PATH)

  const supabase = await createClient()
  const { data: item, error: itemError } = await supabase
    .from('market_neighborhood_review_items')
    .select('id,classification,candidate_neighborhoods,suggested_neighborhood_id,decision')
    .eq('id', reviewId)
    .maybeSingle()

  if (itemError) throw new Error(`Unable to load neighborhood review: ${itemError.message}`)
  if (!item) throw new Error('Neighborhood review no longer exists')
  if (item.decision !== 'pending') throw new Error('Neighborhood review has already been decided')

  const update: Record<string, string> = {
    decision,
    reviewer_id: scope.user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (decision === 'accepted') {
    if (item.classification === 'clear' && item.suggested_neighborhood_id) {
      // Direct KML recommendation: no additional resolution needed.
    } else {
      const { data: queueData, error: queueError } = await supabase.rpc('get_ceo_market_neighborhood_queue_v1')
      if (queueError) throw new Error(`Unable to resolve canonical neighborhood: ${queueError.message}`)

      const queueRow = ((queueData ?? []) as QueueRow[]).find((row) => row.review_id === reviewId)
      if (!queueRow?.can_decide || !queueRow.proposed_neighborhood_id) {
        throw new Error('Neighborhood review still requires more evidence')
      }

      update.classification = 'clear'
      update.suggested_neighborhood_id = queueRow.proposed_neighborhood_id
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('market_neighborhood_review_items')
    .update(update)
    .eq('id', reviewId)
    .eq('decision', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) throw new Error(`Unable to save neighborhood review: ${updateError.message}`)
  if (!updated) throw new Error('Neighborhood review changed before the decision could be saved')

  revalidateNeighborhoodViews()
}
