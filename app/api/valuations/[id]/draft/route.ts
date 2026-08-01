import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'

type DraftPatch = {
  address?: string
  neighborhood?: string
  propertyType?: string
  justification?: string
  usefulAreaM2?: number | null
  builtAreaM2?: number | null
  landAreaM2?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  parkingSpaces?: number | null
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCapability('valuations.self.create')
    const supabase = await createClient()
    const { id } = await context.params
    const body = await request.json().catch(() => null) as DraftPatch | null
    if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })

    const { data: valuation, error: readError } = await supabase
      .from('valuation_cases')
      .select('id,status,requested_by,version_number')
      .eq('id', id)
      .maybeSingle()

    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
    if (!valuation) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    if (valuation.requested_by !== scope.profileId) return NextResponse.json({ error: 'Sólo la ejecutiva responsable puede corregir el borrador' }, { status: 403 })
    if (valuation.status !== 'draft') return NextResponse.json({ error: 'La valorización sólo puede editarse mientras está en borrador' }, { status: 409 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.address !== undefined) patch.address = body.address.trim()
    if (body.neighborhood !== undefined) patch.neighborhood = body.neighborhood.trim()
    if (body.propertyType !== undefined) patch.property_type = body.propertyType.trim()
    if (body.justification !== undefined) patch.justification = body.justification.trim()
    if (body.usefulAreaM2 !== undefined) patch.useful_area_m2 = body.usefulAreaM2
    if (body.builtAreaM2 !== undefined) patch.built_area_m2 = body.builtAreaM2
    if (body.landAreaM2 !== undefined) patch.land_area_m2 = body.landAreaM2
    if (body.bedrooms !== undefined) patch.bedrooms = body.bedrooms
    if (body.bathrooms !== undefined) patch.bathrooms = body.bathrooms
    if (body.parkingSpaces !== undefined) patch.parking_spaces = body.parkingSpaces

    const { data: updated, error: updateError } = await supabase
      .from('valuation_cases')
      .update(patch)
      .eq('id', id)
      .eq('requested_by', scope.profileId)
      .eq('status', 'draft')
      .select('id,status,address,neighborhood,property_type,version_number,updated_at')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 422 })

    await supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'draft_corrected',
      actor_id: scope.profileId,
      previous_state: { status: 'draft', versionNumber: valuation.version_number },
      new_state: { status: 'draft', versionNumber: valuation.version_number, changedFields: Object.keys(patch).filter((key) => key !== 'updated_at') },
      reason: body.justification?.trim() || 'Corrección de ficha antes de reenviar a revisión.',
    })

    return NextResponse.json({ valuation: updated })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
