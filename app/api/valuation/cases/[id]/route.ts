import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }
type ActionPayload = { action: 'review' | 'approve' | 'issue' | 'reopen'; justification?: string }

const transitions: Record<ActionPayload['action'], { from: string[]; to: 'draft' | 'review' | 'approved' | 'issued' }> = {
  review: { from: ['draft'], to: 'review' },
  approve: { from: ['review'], to: 'approved' },
  issue: { from: ['approved'], to: 'issued' },
  reopen: { from: ['review', 'approved'], to: 'draft' },
}

export async function GET(_: Request, context: Params) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('valuation_cases')
    .select('*,valuation_comparables(*),valuation_case_versions(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ case: data })
}

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let payload: ActionPayload
  try {
    payload = await request.json() as ActionPayload
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const transition = transitions[payload.action]
  if (!transition) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  const reviewer = ['ceo', 'admin', 'director', 'subdirector'].includes(role)
  if (['approve', 'issue', 'reopen'].includes(payload.action) && !reviewer) {
    return NextResponse.json({ error: 'Esta acción requiere perfil de revisión.' }, { status: 403 })
  }

  const { data: current, error: currentError } = await supabase
    .from('valuation_cases')
    .select('*')
    .eq('id', id)
    .single()
  if (currentError || !current) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
  if (!transition.from.includes(current.status)) {
    return NextResponse.json({ error: `No se puede ejecutar ${payload.action} desde estado ${current.status}.` }, { status: 409 })
  }

  const nextVersion = Number(current.version_number ?? 1) + 1
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: transition.to,
    version_number: nextVersion,
    updated_at: now,
  }
  if (payload.justification) updates.justification = payload.justification
  if (payload.action === 'approve') {
    updates.approved_by = user.id
    updates.approved_at = now
  }
  if (payload.action === 'issue') updates.issued_at = now
  if (payload.action === 'reopen') {
    updates.approved_by = null
    updates.approved_at = null
    updates.issued_at = null
  }

  const snapshot = {
    ...(current.report_payload ?? {}),
    workflow: {
      status: transition.to,
      action: payload.action,
      actorId: user.id,
      actedAt: now,
      versionNumber: nextVersion,
    },
    justification: payload.justification ?? current.justification,
  }

  updates.report_payload = snapshot

  const { data: updated, error: updateError } = await supabase
    .from('valuation_cases')
    .update(updates)
    .eq('id', id)
    .select('id,status,version_number,approved_at,issued_at')
    .single()
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 422 })

  const { error: versionError } = await supabase.from('valuation_case_versions').insert({
    valuation_case_id: id,
    version_number: nextVersion,
    status: transition.to,
    snapshot,
    created_by: user.id,
  })
  if (versionError) return NextResponse.json({ error: versionError.message, case: updated }, { status: 422 })

  return NextResponse.json({ case: updated })
}
