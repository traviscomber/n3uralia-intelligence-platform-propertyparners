import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  accessErrorResponse,
  assertProfileVisible,
  requireAnyCapability,
  requireMfaLevel2,
} from '@/lib/access-guards'

const allowedTargets = new Set(['draft', 'review', 'approved', 'issued'])

function logWorkflowFailure(stage: string, error: unknown) {
  console.error(stage, {
    code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN',
  })
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

    if (!allowedTargets.has(target)) {
      return NextResponse.json({ error: 'Estado de destino inválido' }, { status: 400 })
    }

    if (target === 'approved' || target === 'issued') await requireMfaLevel2()

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .select('id,status,requested_by,address,version_number')
      .eq('id', id)
      .maybeSingle()

    if (caseError) {
      logWorkflowFailure('VALUATION_WORKFLOW_CASE_LOAD_FAILED', caseError)
      return NextResponse.json({ error: 'No pudimos cargar la valorización.' }, { status: 500 })
    }
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    const { data, error: transitionError } = await supabase.rpc('transition_valuation_case_atomic', {
      target_case_id: id,
      target_status: target,
      transition_reason: reason,
    })

    if (transitionError) {
      logWorkflowFailure('VALUATION_WORKFLOW_ATOMIC_TRANSITION_FAILED', transitionError)
      return NextResponse.json({ error: transitionError.message || 'No pudimos actualizar la valorización.' }, { status: 400 })
    }

    const result = (data || {}) as {
      updated?: boolean
      status?: string
      versionNumber?: number
      acceptedComparableCount?: number
    }
    const now = new Date().toISOString()

    if (target === 'review') {
      await supabase
        .from('management_tasks')
        .update({
          status: 'done',
          completed_at: now,
          resolution_note: reason || 'Corrección realizada y valorización enviada a revisión.',
          updated_by: scope.profileId,
        })
        .eq('source_key', `valuation-return:${id}`)
        .eq('assigned_to', scope.profileId)
        .in('status', ['open', 'in_progress'])
    }

    if (target === 'draft') {
      const due = new Date()
      due.setDate(due.getDate() + 3)
      const { data: requester } = await supabase
        .from('profiles')
        .select('team')
        .eq('id', valuationCase.requested_by)
        .maybeSingle()

      await supabase.from('management_tasks').upsert({
        source_key: `valuation-return:${id}`,
        title: `Corregir valorización · ${valuationCase.address || id.slice(0, 8)}`,
        detail: reason,
        severity: 'warning',
        priority: 'high',
        status: 'open',
        office: requester?.team || scope.team,
        subject_profile_id: valuationCase.requested_by,
        assigned_to: valuationCase.requested_by,
        created_by: scope.profileId,
        updated_by: scope.profileId,
        due_date: due.toISOString().slice(0, 10),
        completed_at: null,
        resolution_note: null,
      }, { onConflict: 'source_key' })
    }

    if (target === 'approved') {
      await supabase
        .from('management_tasks')
        .update({
          status: 'done',
          completed_at: now,
          resolution_note: 'Valorización aprobada por CEO con MFA.',
          updated_by: scope.profileId,
        })
        .eq('source_key', `valuation-return:${id}`)
        .in('status', ['open', 'in_progress'])
    }

    return NextResponse.json({
      updated: result.updated === true,
      status: result.status || target,
      versionNumber: result.versionNumber ?? null,
      acceptedComparableCount: result.acceptedComparableCount ?? null,
      atomic: true,
      mfaVerified: target === 'approved' || target === 'issued',
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
