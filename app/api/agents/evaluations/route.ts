import { NextResponse, type NextRequest } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function score(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null
}

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst', 'seller'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const body = await request.json()
    const runId = typeof body?.runId === 'string' ? body.runId : ''
    const findingId = typeof body?.findingId === 'string' && body.findingId ? body.findingId : null
    const usefulness = score(body?.usefulness)
    const correctness = score(body?.correctness)
    const actionability = score(body?.actionability)
    const outcome = typeof body?.outcome === 'string' ? body.outcome : 'reviewed'
    const correctionNotes = typeof body?.correctionNotes === 'string' && body.correctionNotes.trim() ? body.correctionNotes.trim() : null
    const correctedOutput = body?.correctedOutput && typeof body.correctedOutput === 'object' ? body.correctedOutput : null

    if (!runId || usefulness === null || correctness === null || actionability === null || !['reviewed', 'used', 'ignored', 'corrected'].includes(outcome)) {
      return NextResponse.json({ error: 'Evaluación inválida.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

    const { data: run, error: runError } = await supabase.from('agent_runs').select('id,agent_key,title').eq('id', runId).maybeSingle()
    if (runError) throw runError
    if (!run) return NextResponse.json({ error: 'Ejecución no encontrada.' }, { status: 404 })

    const { data, error } = await supabase
      .from('agent_evaluations')
      .upsert({
        run_id: runId,
        finding_id: findingId,
        evaluator_id: user.id,
        usefulness,
        correctness,
        actionability,
        outcome,
        correction_notes: correctionNotes,
        corrected_output: correctedOutput,
      }, { onConflict: 'run_id,finding_id,evaluator_id' })
      .select('*')
      .single()
    if (error) throw error

    if (outcome === 'corrected' && correctionNotes) {
      await supabase.from('agent_notifications').insert({
        recipient_id: user.id,
        run_id: runId,
        finding_id: findingId,
        notification_type: 'evaluation_recorded',
        title: 'Corrección registrada',
        message: `La corrección para ${run.title} quedó registrada para análisis de aprendizaje.`,
        action_url: '/dashboard/agents',
        metadata: { agentKey: run.agent_key, evaluationId: data.id },
      })
    }

    return NextResponse.json({ evaluation: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar la evaluación.' }, { status: 500 })
  }
}
