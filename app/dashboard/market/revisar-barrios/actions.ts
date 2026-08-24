'use server'

import { revalidatePath } from 'next/cache'
import { requireCapability, requirePageMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

const REVIEW_PATH = '/dashboard/market/revisar-barrios'
const REVIEW_DECISIONS = new Set(['accepted', 'discarded'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function reviewNeighborhoodAction(formData: FormData) {
  const reviewId = String(formData.get('reviewId') || '')
  const decision = String(formData.get('decision') || '')

  if (!UUID_PATTERN.test(reviewId) || !REVIEW_DECISIONS.has(decision)) {
    throw new Error('Invalid neighborhood review request')
  }

  const scope = await requireCapability('market.manage_sources')
  await requirePageMfaLevel2(REVIEW_PATH)

  const supabase = await createClient()
  const { data: item, error: itemError } = await supabase
    .from('market_neighborhood_review_items')
    .select('id,classification')
    .eq('id', reviewId)
    .maybeSingle()

  if (itemError) throw new Error(`Unable to load neighborhood review: ${itemError.message}`)
  if (!item || item.classification !== 'clear') throw new Error('Neighborhood review is not eligible for this action')

  const { error: updateError } = await supabase
    .from('market_neighborhood_review_items')
    .update({
      decision,
      reviewer_id: scope.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('classification', 'clear')

  if (updateError) throw new Error(`Unable to save neighborhood review: ${updateError.message}`)

  revalidatePath(REVIEW_PATH)
  revalidatePath('/dashboard/market')
}
