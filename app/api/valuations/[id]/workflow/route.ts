import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const transitions: Record<string, string[]> = {
  draft: ['review'],
  review: ['draft','approved'],
  approved: ['review','issued'],
  issued: [],
}

async function access() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error:'No autorizado' },{ status:401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
  const role = String(profile?.role || '').toLowerCase()
  if (!['admin','ceo','director','subdirector','broker'].includes(role)) return { response:NextResponse.json({ error:'Sin permisos' },{ status:403 }) }
  return { supabase,user,role }
}

export async function POST(request:Request, context:{ params:Promise<{id:string}> }) {
  const auth = await access()
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const target = String(body?.status || '')
  const reason = String(body?.reason || '').trim() || null

  const { data: valuationCase, error } = await auth.supabase.from('valuation_cases').select('*').eq('id',id).maybeSingle()
  if (error) return NextResponse.json({ error:error.message },{ status:500 })
  if (!valuationCase) return NextResponse.json({ error:'Valorización no encontrada' },{ status:404 })
  if (!(transitions[valuationCase.status] || []).includes(target)) return NextResponse.json({ error:`Transición ${valuationCase.status} → ${target} no permitida` },{ status:400 })

  const elevated = ['admin','ceo','director','subdirector'].includes(auth.role)
  if (target === 'approved' && !elevated) return NextResponse.json({ error:'Solo dirección puede aprobar' },{ status:403 })
  if (target === 'issued' && !elevated) return NextResponse.json({ error:'Solo dirección puede emitir' },{ status:403 })

  const { data: comparables, error: compError } = await auth.supabase.from('valuation_comparables').select('*').eq('valuation_case_id',id).order('rank')
  if (compError) return NextResponse.json({ error:compError.message },{ status:500 })
  const accepted = (comparables || []).filter((item) => item.selected && item.match_status === 'accepted')

  if (target === 'review' && valuationCase.status === 'draft' && accepted.length < 3) {
    return NextResponse.json({ error:'Se requieren al menos 3 comparables aceptados para enviar a revisión' },{ status:400 })
  }
  if (target === 'approved') {
    if (accepted.length < 3) return NextResponse.json({ error:'No se puede aprobar sin al menos 3 comparables aceptados' },{ status:400 })
    if (!valuationCase.estimated_value_uf || !valuationCase.low_value_uf || !valuationCase.high_value_uf) return NextResponse.json({ error:'La valorización no tiene rango calculado' },{ status:400 })
    if (!String(valuationCase.justification || '').trim() && !reason) return NextResponse.json({ error:'Se requiere justificación de aprobación' },{ status:400 })
  }

  const now = new Date().toISOString()
  const patch: Record<string,unknown> = { status:target, updated_at:now }
  let action = 'submitted_for_review'
  if (target === 'draft') action = 'rejected'
  if (target === 'approved') {
    action = 'approved'
    patch.reviewed_by = auth.user.id
    patch.reviewed_at = now
    patch.approved_by = auth.user.id
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
    valuationCase:{ ...valuationCase,...patch },
    comparables,
    acceptedComparableCount:accepted.length,
    workflow:{ from:valuationCase.status,to:target,actorId:auth.user.id,reason,at:now },
  }

  const { error:updateError } = await auth.supabase.from('valuation_cases').update(patch).eq('id',id)
  if (updateError) return NextResponse.json({ error:updateError.message },{ status:500 })
  const { error:versionError } = await auth.supabase.from('valuation_case_versions').insert({
    valuation_case_id:id,
    version_number:nextVersion,
    status:target,
    snapshot,
    created_by:auth.user.id,
  })
  if (versionError) return NextResponse.json({ error:versionError.message },{ status:500 })
  await auth.supabase.from('valuation_decision_log').insert({
    valuation_case_id:id,
    action,
    actor_id:auth.user.id,
    previous_state:{ status:valuationCase.status,versionNumber:valuationCase.version_number },
    new_state:{ status:target,versionNumber:nextVersion,acceptedComparableCount:accepted.length },
    reason,
  })

  return NextResponse.json({ updated:true,status:target,versionNumber:nextVersion,acceptedComparableCount:accepted.length })
}
