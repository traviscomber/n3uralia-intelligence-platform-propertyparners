import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability, requireMfaLevel2 } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

const RESOLUTION_KINDS = new Set(['match', 'external_identity', 'confirmed_component'])
const DECISIONS = new Set(['confirmed', 'rejected'])

async function scope() {
  return requireAnyCapability([
    'market.manage_sources',
    'properties.global.assign',
    'properties.office.assign',
  ])
}

export async function GET() {
  try {
    await scope()
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_market_live_identity_queue_v1')

    if (error) {
      return NextResponse.json({ error: 'No fue posible consultar la cola live de identidad.' }, { status: 500 })
    }

    return NextResponse.json(data ?? { summary: {}, rows: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    await scope()
    await requireMfaLevel2()

    const body = await request.json().catch(() => null)
    const listingId = String(body?.listingId || '')
    const resolutionKind = String(body?.resolutionKind || '')
    const decision = String(body?.decision || '')
    const candidatePropertyId = body?.candidatePropertyId ? String(body.candidatePropertyId) : null
    const matchId = body?.matchId ? String(body.matchId) : null
    const sourceReference = String(body?.sourceReference || '').trim()
    const notes = String(body?.notes || '').trim()

    if (!listingId || !RESOLUTION_KINDS.has(resolutionKind) || !DECISIONS.has(decision)) {
      return NextResponse.json({ error: 'Decisión de identidad inválida.' }, { status: 400 })
    }
    if (!sourceReference || sourceReference.length > 500) {
      return NextResponse.json({ error: 'Se requiere una referencia de evidencia.' }, { status: 400 })
    }
    if (notes.length > 1000) {
      return NextResponse.json({ error: 'Las notas exceden el máximo permitido.' }, { status: 400 })
    }
    if (resolutionKind !== 'match' && decision === 'rejected') {
      return NextResponse.json({ error: 'Sólo un candidato de match puede rechazarse.' }, { status: 400 })
    }
    if (!candidatePropertyId) {
      return NextResponse.json({ error: 'La propiedad candidata es obligatoria.' }, { status: 400 })
    }
    if (resolutionKind === 'match' && !matchId) {
      return NextResponse.json({ error: 'El match candidato es obligatorio.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('review_market_live_identity_v1', {
      p_listing_id: listingId,
      p_resolution_kind: resolutionKind,
      p_decision: decision,
      p_candidate_property_id: candidatePropertyId,
      p_match_id: matchId,
      p_source_reference: sourceReference,
      p_notes: notes || null,
    })

    if (error) {
      const message = error.message === 'MFA_REQUIRED'
        ? 'MFA_REQUIRED'
        : 'No fue posible registrar la decisión de identidad.'
      return NextResponse.json({ error: message }, { status: error.message === 'MFA_REQUIRED' ? 403 : 400 })
    }

    return NextResponse.json(data ?? { updated: true })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
