import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const transitions: Record<string, string[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['issued', 'review'],
  issued: [],
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const nextStatus = typeof body?.status === 'string' ? body.status : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '').toLowerCase()
  const { data: valuation, error: fetchError } = await supabase.from('valuation_cases').select('*').eq('id', id).single()
  if (fetchError || !valuation) return NextResponse.json({ error: fetchError?.message || 'Valorización no encontrada' }, { status: 404 })

  if (!transitions[valuation.status]?.includes(nextStatus)) return NextResponse.json({ error: `Transición ${valuation.status} → ${nextStatus} no permitida` }, { status: 400 })
  if (['approved', 'issued'].includes(nextStatus) && !['admin', 'ceo', 'director', 'subdirector'].includes(role)) return NextResponse.json({ error: 'La aprobación y emisión requieren rol ejecutivo' }, { status: 403 })

  const { data: comparables } = await supabase.from('valuation_comparables').select('*').eq('valuation_case_id', id).eq('selected', true)
  if (['review', 'approved', 'issued'].includes(nextStatus) && (!comparables || comparables.length < 3)) return NextResponse.json({ error: 'Se requieren al menos tres comparables seleccionados' }, { status: 400 })
  if (['review', 'approved', 'issued'].includes(nextStatus) && !valuation.justification) return NextResponse.json({ error: 'La valorización requiere justificación metodológica' }, { status: 400 })

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: nextStatus, updated_at: now }
  if (nextStatus === 'review') { patch.reviewed_by = user.id; patch.reviewed_at = now }
  if (nextStatus === 'approved') { patch.approved_by = user.id; patch.approved_at = now }
  if (nextStatus === 'issued') patch.issued_at = now

  const { data: updated, error: updateError } = await supabase.from('valuation_cases').update(patch).eq('id', id).select('*').single()
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const versionNumber = Number(valuation.version_number || 1) + 1
  await supabase.from('valuation_case_versions').upsert({
    valuation_case_id: id,
    version_number: versionNumber,
    status: nextStatus,
    snapshot: { valuation: updated, comparables },
    created_by: user.id,
  }, { onConflict: 'valuation_case_id,version_number' })
  await supabase.from('valuation_cases').update({ version_number: versionNumber }).eq('id', id)
  await supabase.from('valuation_decision_log').insert({
    valuation_case_id: id,
    action: nextStatus === 'review' ? 'submitted_for_review' : nextStatus,
    actor_id: user.id,
    previous_state: { status: valuation.status },
    new_state: { status: nextStatus, versionNumber },
    reason: reason || null,
  })

  return NextResponse.json({ valuation: { ...updated, version_number: versionNumber } })
}
