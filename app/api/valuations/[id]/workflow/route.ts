import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  accessErrorResponse,
  assertProfileVisible,
  requireAnyCapability,
} from '@/lib/access-guards'

const transitions: Record<string, string[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['review', 'issued'],
  issued: [],
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireAnyCapability([
      'valuations.self.create',
      'valuations.office.review',
      'valuations.global.approve',
    ])
    const supabase = await createClient()
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const target = String(body?.status || '')
    const reason = String(body?.reason || '').trim() || null

    const { data: valuationCase, error } = await supabase
      .from('valuation_cases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    const ownsCase = valuationCase.requested_by === scope.profileId
    const canReview = scope.capabilities.includes('valuations.office.review')
    const canApprove = scope.capabilities.includes('valuations.global.approve') || canReview

    if (!ownsCase && !canReview && !scope.capabilities.includes('valuations.global.read')) {
      return NextResponse.json({ error: 'No puede operar valorizaciones fuera de su alcance' }, { status: 403 })
    }

    if (!(transitions[valuationCase.status] || []).includes(target)) {
      return NextResponse.json({ error: `Transición ${valuationCase.status} → ${target} no permitida` }, { status: 400 })
    }

    if (valuationCase.status === 'draft' && target === 'review') {
      if (!ownsCase && !canReview) return NextResponse.json({ error: 'Sin permiso para solicitar revisión' }, { status: 403 })
      const { data, error: rpcError } = await supabase.rpc('submit_valuation_for_review', {
        target_case_id: id,
        reason,
      })
      if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })
      return NextResponse.json({ updated: true, status: data?.status ?? 'review', versionNumber: data?.version_number ?? null })
    }

    if (!canApprove) return NextResponse.json({ error: 'Sólo dirección puede ejecutar esta transición' }, { status: 403 })
    if (target === 'draft' && !reason) return NextResponse.json({ error: 'Se requiere un motivo para devolver el caso a borrador' }, { status: 400 })

    const { data: comparables, error: compError } = await supabase
      .from('valuation_comparables')
      .select('*')
      .eq('valuation_case_id', id)
      .order('rank')
    if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })
    const accepted = (comparables || []).filter((item) => item.selected && item.match_status === 'accepted')

    if (target === 'approved') {
      if (accepted.length < 2) return NextResponse.json({ error: 'No se puede aprobar sin al menos 2 comparables aceptados' }, { status: 400 })
      if (!valuationCase.estimated_value_uf || !valuationCase.low_value_uf || !valuationCase.high_value_uf) {
        return NextResponse.json({ error: 'La valorización no tiene rango calculado' }, { status: 400 })
      }
      if (!String(valuationCase.justification || '').trim() && !reason) {
        return NextResponse.json({ error: 'Se requiere justificación de aprobación' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status: target, updated_at: now }
    let action = 'status_changed'
    if (target === 'draft') action = 'rejected'
    if (target === 'approved') {
      action = 'approved'
      patch.reviewed_by = scope.profileId
      patch.reviewed_at = now
      patch.approved_by = scope.profileId
      patch.approved_at = now
      patch.justification = reason || valuationCase.justification
    }
    if (target === 'issued') {
      action = 'issued'
      patch.issued_at = now
    }

    const nextVersion = Number(valuationCase.version_number || 1) + 1
    patch.version_number = nextVersion
    const snapshot = {
      valuationCase: { ...valuationCase, ...patch },
      comparables,
      acceptedComparableCount: accepted.length,
      workflow: { from: valuationCase.status, to: target, actorId: scope.profileId, reason, at: now },
    }

    const { error: updateError } = await supabase.from('valuation_cases').update(patch).eq('id', id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const { error: versionError } = await supabase.from('valuation_case_versions').insert({
      valuation_case_id: id,
      version_number: nextVersion,
      status: target,
      snapshot,
      created_by: scope.profileId,
    })
    if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })

    const { error: logError } = await supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action,
      actor_id: scope.profileId,
      previous_state: { status: valuationCase.status, versionNumber: valuationCase.version_number },
      new_state: { status: target, versionNumber: nextVersion, acceptedComparableCount: accepted.length },
      reason,
    })
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

    return NextResponse.json({ updated: true, status: target, versionNumber: nextVersion, acceptedComparableCount: accepted.length })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
