import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability, requireMfaLevel2 } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

const REVIEWABLE = new Set(['candidate_high', 'candidate_medium'])
const DECISIONS = new Set(['confirmed', 'rejected'])

async function scope() {
  return requireAnyCapability([
    'market.manage_sources',
    'properties.global.assign',
    'properties.office.assign',
  ])
}

export async function GET(request: Request) {
  try {
    await scope()
    const admin = createAdminClient()
    const url = new URL(request.url)
    const status = String(url.searchParams.get('status') || 'candidate_high')
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100)
    const allowedStatus = ['candidate_high', 'candidate_medium', 'confirmed', 'rejected'].includes(status) ? status : 'candidate_high'

    const { data: matches, error } = await admin
      .from('market_property_matches')
      .select('id,left_entity_id,right_entity_id,score,status,evidence,contradictions,reviewed_by,reviewed_at,created_at')
      .eq('left_entity_type', 'property')
      .eq('right_entity_type', 'property')
      .eq('status', allowedStatus)
      .order('score', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: 'No fue posible consultar candidatos de identidad.' }, { status: 500 })

    const ids = [...new Set((matches ?? []).flatMap((item) => [item.left_entity_id, item.right_entity_id]))]
    const { data: properties, error: propertyError } = ids.length
      ? await admin.from('market_properties').select('id,canonical_key,normalized_address,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces,identity_status,identity_confidence,last_seen_at').in('id', ids)
      : { data: [], error: null }
    if (propertyError) return NextResponse.json({ error: 'No fue posible consultar las propiedades candidatas.' }, { status: 500 })

    const propertyById = new Map((properties ?? []).map((property) => [property.id, property]))
    return NextResponse.json({
      status: allowedStatus,
      rows: (matches ?? []).map((match) => ({
        ...match,
        left: propertyById.get(match.left_entity_id) ?? null,
        right: propertyById.get(match.right_entity_id) ?? null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await scope()
    await requireMfaLevel2()
    const body = await request.json().catch(() => null)
    const id = String(body?.id || '')
    const decision = String(body?.decision || '')
    const sourceReference = String(body?.sourceReference || '').trim()
    const notes = String(body?.notes || '').trim()

    if (!id || !DECISIONS.has(decision)) return NextResponse.json({ error: 'Decisión inválida.' }, { status: 400 })
    if (!sourceReference || sourceReference.length > 500) return NextResponse.json({ error: 'Se requiere referencia de evidencia.' }, { status: 400 })
    if (notes.length > 1000) return NextResponse.json({ error: 'Las notas exceden el máximo permitido.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: before, error: lookupError } = await admin.from('market_property_matches').select('*').eq('id', id).maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'No fue posible consultar el candidato.' }, { status: 500 })
    if (!before) return NextResponse.json({ error: 'Candidato no encontrado.' }, { status: 404 })
    if (!REVIEWABLE.has(before.status)) return NextResponse.json({ error: 'El candidato ya fue revisado.' }, { status: 409 })

    const reviewedAt = new Date().toISOString()
    const evidence = Array.isArray(before.evidence) ? [...before.evidence] : [before.evidence].filter(Boolean)
    evidence.push({
      signal: 'human_review',
      decision,
      sourceReference,
      notes: notes || null,
      reviewedBy: access.profileId,
      reviewedAt,
      previousStatus: before.status,
    })

    const { data, error } = await admin
      .from('market_property_matches')
      .update({ status: decision, evidence, reviewed_by: access.profileId, reviewed_at: reviewedAt })
      .eq('id', id)
      .eq('status', before.status)
      .select('id,left_entity_id,right_entity_id,score,status,evidence,contradictions,reviewed_by,reviewed_at')
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'No fue posible registrar la decisión.' }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'El candidato cambió durante la revisión. Recargue la vista.' }, { status: 409 })

    return NextResponse.json({ updated: true, match: data, mfaVerified: true })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
