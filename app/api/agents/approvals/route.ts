import { NextResponse, type NextRequest } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'No autorizado para aprobar resultados.' }, { status: access.status })

  try {
    const body = await request.json()
    const runId = String(body?.runId || '')
    const findingId = body?.findingId ? String(body.findingId) : null
    const decision = String(body?.decision || '')
    const notes = body?.notes ? String(body.notes) : null

    if (!runId || !['approved', 'rejected', 'changes_requested'].includes(decision)) {
      return NextResponse.json({ error: 'Solicitud de aprobación inválida.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

    const { data: approval, error: approvalError } = await supabase
      .from('agent_approvals')
      .insert({
        run_id: runId,
        finding_id: findingId,
        decision,
        notes,
        decided_by: user.id,
      })
      .select('*')
      .single()

    if (approvalError) throw approvalError

    if (findingId) {
      const findingStatus = decision === 'approved' ? 'approved' : 'rejected'
      const { error: findingError } = await supabase
        .from('agent_findings')
        .update({
          approval_status: findingStatus,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', findingId)
        .eq('run_id', runId)
      if (findingError) throw findingError
    } else {
      const runStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'needs_review'
      const { error: runError } = await supabase
        .from('agent_runs')
        .update({ status: runStatus, reviewed_by: user.id })
        .eq('id', runId)
      if (runError) throw runError
    }

    return NextResponse.json({ approval }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la aprobación.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
