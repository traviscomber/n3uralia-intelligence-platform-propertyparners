import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { addAgentFindings, addAgentSources, createAgentArtifact, failAgentRun, finishAgentRun, startAgentRun } from '@/lib/agents/engine'
import { buildExecutiveReport } from '@/lib/agents/executive-reports'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  let runId: string | null = null

  try {
    const body = await request.json()
    const audience = body.audience
    if (!['ceo', 'director', 'partner'].includes(audience)) {
      return NextResponse.json({ error: 'Audiencia inválida.' }, { status: 400 })
    }

    const run = await startAgentRun({
      agentKey: 'executive_reports',
      title: body.title || `Reporte ejecutivo ${audience}`,
      instructions: 'Sintetizar únicamente hallazgos aprobados y reportes de gestión trazables.',
      input: {
        audience,
        periodType: body.periodType || 'weekly',
        dateFrom: body.dateFrom || null,
        dateTo: body.dateTo || null,
        directorId: body.directorId || null,
      },
      idempotencyKey: body.idempotencyKey || null,
    })

    runId = run.id

    const result = await buildExecutiveReport({
      audience,
      periodType: body.periodType || 'weekly',
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      directorId: body.directorId,
      title: body.title,
    })

    await addAgentSources(run.id, result.sources)
    await addAgentFindings(run.id, result.findings)
    const artifact = await createAgentArtifact(run.id, {
      artifactType: 'report',
      title: result.report.title,
      version: 1,
      content: result.report,
    })

    const finished = await finishAgentRun(run.id, {
      status: 'needs_review',
      confidence: result.confidence,
      output: {
        report: result.report,
        artifactId: artifact.id,
        sourceCount: result.sources.length,
        generatedFindingCount: result.findings.length,
      },
    })

    return NextResponse.json({ run: finished, report: result.report, confidence: result.confidence, artifact })
  } catch (error) {
    if (runId) {
      try {
        await failAgentRun(runId, error instanceof Error ? error.message : 'Error desconocido')
      } catch {}
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No pudimos generar el reporte ejecutivo.' },
      { status: 500 },
    )
  }
}
