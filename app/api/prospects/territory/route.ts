import { NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'

type AssignmentInput = {
  neighborhoodId?: unknown
  directorKey?: unknown
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  let scope: Awaited<ReturnType<typeof requireCapability>>
  try {
    scope = await requireCapability('properties.global.assign')
  } catch (error) {
    return accessErrorResponse(error)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const rawAssignments = Array.isArray(body.assignments) ? body.assignments as AssignmentInput[] : []
  if (!rawAssignments.length || rawAssignments.length > 100) {
    return NextResponse.json({ error: 'Selecciona al menos un barrio y no más de 100 asignaciones.' }, { status: 400 })
  }

  const assignments = rawAssignments.map((item) => ({
    neighborhoodId: text(item.neighborhoodId),
    directorKey: text(item.directorKey),
  }))

  if (assignments.some((item) => !item.neighborhoodId || !item.directorKey)) {
    return NextResponse.json({ error: 'Cada barrio debe tener un director/a seleccionado.' }, { status: 400 })
  }

  const uniqueNeighborhoods = new Set(assignments.map((item) => item.neighborhoodId))
  if (uniqueNeighborhoods.size !== assignments.length) {
    return NextResponse.json({ error: 'Un barrio no puede aparecer más de una vez en la misma confirmación.' }, { status: 400 })
  }

  const db = createServiceClient()
  const neighborhoodIds = assignments.map((item) => item.neighborhoodId)
  const directorKeys = [...new Set(assignments.map((item) => item.directorKey))]

  const [neighborhoodsResult, directorsResult] = await Promise.all([
    db.from('market_neighborhoods').select('id,name,micro_neighborhood').in('id', neighborhoodIds),
    db.from('property_director_directory').select('director_key,full_name,office_name,active').in('director_key', directorKeys).eq('active', true),
  ])

  if (neighborhoodsResult.error || directorsResult.error) {
    return NextResponse.json({ error: 'No fue posible validar la matriz territorial.' }, { status: 500 })
  }
  if ((neighborhoodsResult.data ?? []).length !== neighborhoodIds.length) {
    return NextResponse.json({ error: 'Uno o más barrios no existen en el catálogo canónico.' }, { status: 409 })
  }
  if ((directorsResult.data ?? []).length !== directorKeys.length) {
    return NextResponse.json({ error: 'Uno o más directores/as no están activos.' }, { status: 409 })
  }

  const { data, error } = await db.rpc('assign_property_neighborhood_directors_bulk_v1', {
    p_assignments: assignments,
    p_actor_id: scope.profileId,
    p_reason: 'Matriz territorial confirmada desde Prospección',
    p_source: 'prospect-territory-bulk',
  })

  if (error) {
    console.error('PROSPECT_TERRITORY_BULK_ASSIGNMENT_FAILED', {
      code: error.code,
      count: assignments.length,
    })
    return NextResponse.json({ error: 'No fue posible guardar la matriz territorial de forma atómica.' }, { status: 422 })
  }

  return NextResponse.json({
    ok: true,
    result: data,
    assignments: assignments.length,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
