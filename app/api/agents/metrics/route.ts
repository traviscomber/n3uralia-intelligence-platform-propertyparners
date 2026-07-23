import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const supabase = await createClient()
    const [{ data: metrics, error: metricsError }, { data: evaluations, error: evaluationsError }] = await Promise.all([
      supabase.from('agent_performance_metrics').select('*').order('agent_key'),
      supabase
        .from('agent_evaluations')
        .select('id,run_id,finding_id,usefulness,correctness,actionability,outcome,correction_notes,created_at,agent_runs(agent_key,title)')
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    if (metricsError) throw metricsError
    if (evaluationsError) throw evaluationsError

    const rows = metrics || []
    const totals = rows.reduce((acc, row) => {
      acc.runs += Number(row.total_runs) || 0
      acc.approved += Number(row.approved_runs) || 0
      acc.failed += Number(row.failed_runs) || 0
      acc.evaluations += Number(row.evaluation_count) || 0
      return acc
    }, { runs: 0, approved: 0, failed: 0, evaluations: 0 })

    return NextResponse.json({
      metrics: rows,
      evaluations: evaluations || [],
      totals: {
        ...totals,
        successRate: totals.runs ? (totals.runs - totals.failed) / totals.runs : 0,
        approvalRate: totals.runs ? totals.approved / totals.runs : 0,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar las métricas.' }, { status: 500 })
  }
}
