import { NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { createServiceClient } from '@/lib/supabase/service'

type AssignmentInput = {
  neighborhoodId?: unknown
  groupKey?: unknown
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
    groupKey: text(item.groupKey),
  }))

  if (assignments.some((item) => !item.neighborhoodId || !item.groupKey)) {
    return NextResponse.json({ error: 'Cada barrio debe pertenecer a un grupo territorial.' }, { status: 400 })
  }

  const uniqueNeighborhoods = new Set(assignments.map((item) => item.neighborhoodId))
  if (uniqueNeighborhoods.size !== assignments.length) {
    return NextResponse.json({ error: 'Un barrio no puede aparecer más de una vez en la misma confirmación.' }, { status: 400 })
  }

  const db = createServiceClient()
  const neighborhoodIds = assignments.map((item) => item.neighborhoodId)
  const groupKeys = [...new Set(assignments.map((item) => item.groupKey))]

  const [neighborhoodsResult, groupsResult] = await Promise.all([
    db.from('market_neighborhoods').select('id,name,micro_neighborhood').in('id', neighborhoodIds),
    db.from('property_territory_groups').select('group_key,name,active').in('group_key', groupKeys).eq('active', true),
  ])

  if (neighborhoodsResult.error || groupsResult.error) {
    return NextResponse.json({ error: 'No fue posible validar la matriz territorial.' }, { status: 500 })
  }
  if ((neighborhoodsResult.data ?? []).length !== neighborhoodIds.length) {
    return NextResponse.json({ error: 'Uno o más barrios no existen en el catálogo canónico.' }, { status: 409 })
  }
  if ((groupsResult.data ?? []).length !== groupKeys.length) {
    return NextResponse.json({ error: 'Uno o más grupos territoriales no están activos.' }, { status: 409 })
  }

  const { data, error } = await db.rpc('assign_property_neighborhood_groups_bulk_v1', {
    p_assignments: assignments,
    p_actor_id: scope.profileId,
    p_reason: 'Matriz barrio → grupo territorial confirmada desde Prospección',
    p_source: 'prospect-territory-groups',
  })

  if (error) {
    console.error('PROSPECT_TERRITORY_GROUP_ASSIGNMENT_FAILED', {
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
