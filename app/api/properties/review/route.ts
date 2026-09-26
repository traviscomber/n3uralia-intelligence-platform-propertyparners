import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability, requireMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

type ReviewBody = {
  reviewId?: unknown
  proposedNeighborhoodId?: unknown
}

function value(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability(['properties.global.assign', 'properties.office.assign'])
    await requireMfaLevel2()
  } catch (error) {
    return accessErrorResponse(error)
  }

  let body: ReviewBody
  try {
    body = await request.json() as ReviewBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const reviewId = value(body.reviewId)
  const proposedNeighborhoodId = value(body.proposedNeighborhoodId)
  if (!reviewId || !proposedNeighborhoodId) {
    return NextResponse.json({ error: 'Falta la revisión o el barrio propuesto.' }, { status: 400 })
  }

  const db = await createClient()
  const { data: queue, error: queueError } = await db.rpc('get_ceo_market_neighborhood_queue_v1')
  if (queueError) {
    return NextResponse.json({ error: 'No fue posible validar la cola actual.' }, { status: 422 })
  }

  const row = (queue ?? []).find((item: Record<string, unknown>) => String(item.review_id ?? '') === reviewId)
  if (!row || row.can_decide !== true || String(row.proposed_neighborhood_id ?? '') !== proposedNeighborhoodId) {
    return NextResponse.json({ error: 'La evidencia cambió o el caso ya no es confirmable.' }, { status: 409 })
  }

  const { data: review, error: reviewError } = await db
    .from('market_neighborhood_review_items')
    .select('id,classification,suggested_neighborhood_id,decision')
    .eq('id', reviewId)
    .maybeSingle()

  if (reviewError || !review || review.decision !== 'pending') {
    return NextResponse.json({ error: 'La revisión ya no está pendiente.' }, { status: 409 })
  }

  const update = review.classification === 'clear' && review.suggested_neighborhood_id
    ? { decision: 'accepted' }
    : {
        classification: 'clear',
        suggested_neighborhood_id: proposedNeighborhoodId,
        decision: 'accepted',
      }

  const { error: updateError } = await db
    .from('market_neighborhood_review_items')
    .update(update)
    .eq('id', reviewId)
    .eq('decision', 'pending')

  if (updateError) {
    const message = updateError.message?.includes('AAL2')
      ? 'MFA_REQUIRED'
      : 'No fue posible confirmar el barrio.'
    return NextResponse.json({ error: message }, { status: message === 'MFA_REQUIRED' ? 403 : 422 })
  }

  return NextResponse.json({
    ok: true,
    reviewId,
    neighborhoodId: proposedNeighborhoodId,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
