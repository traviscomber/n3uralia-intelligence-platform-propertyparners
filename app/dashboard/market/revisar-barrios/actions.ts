'use server'

import { revalidatePath } from 'next/cache'
import { requireAnyCapability, requirePageMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

const REVIEW_PATH = '/dashboard/market/revisar-barrios'
const KML_SOURCE_CODE = 'kml_vitacura_barrios_2026_08_12'
const REVIEW_DECISIONS = new Set(['accepted', 'discarded'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
    if (item.classification === 'clear') {
      if (!item.suggested_neighborhood_id) throw new Error('Neighborhood review has no canonical neighborhood suggestion')
    } else if (item.classification === 'ambiguous') {
      const candidates = Array.isArray(item.candidate_neighborhoods)
        ? item.candidate_neighborhoods.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []

      const { data: source, error: sourceError } = await supabase
        .from('market_sources')
        .select('id')
        .eq('code', KML_SOURCE_CODE)
        .maybeSingle()

      if (sourceError || !source) throw new Error(sourceError?.message ?? 'Canonical KML source is unavailable')

      const { data: neighborhoods, error: neighborhoodError } = await supabase
        .from('market_neighborhoods')
        .select('id,name')
        .eq('geometry_source_id', source.id)
        .in('name', candidates)

      if (neighborhoodError) throw new Error(`Unable to resolve canonical neighborhood: ${neighborhoodError.message}`)
      if ((neighborhoods ?? []).length !== 1) throw new Error('Neighborhood review still requires more evidence')

      update.classification = 'clear'
      update.suggested_neighborhood_id = neighborhoods![0].id
    } else {
      throw new Error('Neighborhood review is not eligible for approval')
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

  revalidatePath(REVIEW_PATH)
  revalidatePath('/dashboard/market')
  revalidatePath('/dashboard/ceo')
}
