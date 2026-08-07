import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability, requireMfaLevel2 } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireAnyCapability([
      'market.manage_sources',
      'properties.global.assign',
      'properties.office.assign',
    ])
    await requireMfaLevel2()

    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const sourceReference = String(body?.sourceReference || '').trim()
    const notes = String(body?.notes || '').trim()
    const confidence = Number(body?.confidence)

    if (!sourceReference || sourceReference.length > 500) {
      return NextResponse.json({ error: 'Se requiere una referencia de evidencia válida.' }, { status: 400 })
    }
    if (!Number.isFinite(confidence) || confidence < 0.8 || confidence > 1) {
      return NextResponse.json({ error: 'La confianza humana debe estar entre 0,8 y 1,0.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: property, error: lookupError } = await admin
      .from('market_properties')
      .select('id,identity_status,identity_confidence,identity_evidence,normalized_address')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) return NextResponse.json({ error: 'No fue posible consultar la propiedad.' }, { status: 500 })
    if (!property) return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 })

    const decidedAt = new Date().toISOString()
    const evidence = {
      sourceReference,
      notes: notes || null,
      decisionMethod: 'human_verified',
      decidedBy: scope.profileId,
      decidedAt,
      previousEvidence: property.identity_evidence || {},
    }

    const { error: updateError } = await admin
      .from('market_properties')
      .update({
        identity_status: 'confirmed',
        identity_confidence: confidence,
        identity_evidence: evidence,
        updated_at: decidedAt,
      })
      .eq('id', id)

    if (updateError) return NextResponse.json({ error: 'No fue posible confirmar la identidad.' }, { status: 400 })

    const { error: auditError } = await admin.from('market_identity_decisions').insert({
      property_id: id,
      previous_status: property.identity_status,
      new_status: 'confirmed',
      confidence,
      evidence,
      decided_by: scope.profileId,
    })

    if (auditError) {
      await admin.from('market_properties').update({
        identity_status: property.identity_status,
        identity_confidence: property.identity_confidence,
        identity_evidence: property.identity_evidence,
      }).eq('id', id)
      return NextResponse.json({ error: 'La confirmación fue revertida porque falló su trazabilidad.' }, { status: 500 })
    }

    return NextResponse.json({
      updated: true,
      propertyId: id,
      address: property.normalized_address,
      identityStatus: 'confirmed',
      confidence,
      mfaVerified: true,
      decidedAt,
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
