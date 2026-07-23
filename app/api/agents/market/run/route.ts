import { NextResponse, type NextRequest } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { addAgentFindings, addAgentSources, createAgentArtifact, failAgentRun, finishAgentRun, startAgentRun } from '@/lib/agents/engine'
import { runMarketIntelligence, type MarketAgentRequest } from '@/lib/agents/market-intelligence'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst'])
  if (!access.allowed) {
    return NextResponse.json({ error: 'No autorizado para ejecutar agentes.' }, { status: access.status })
  }

  let runId: string | null = null

  try {
    const body = (await request.json().catch(() => ({}))) as MarketAgentRequest & { idempotencyKey?: string }
    const run = await startAgentRun({
      agentKey: 'market_intelligence',
      title: body.neighborhood ? `Análisis de mercado: ${body.neighborhood}` : 'Análisis de mercado Vitacura',
      instructions: 'Comparar períodos, detectar variaciones relevantes y conservar fuentes verificables.',
      input: {
        neighborhood: body.neighborhood ?? null,
        dateFrom: body.dateFrom ?? null,
        dateTo: body.dateTo ?? null,
      },
      idempotencyKey: body.idempotencyKey,
    })

    runId = run.id
    const analysis = await runMarketIntelligence(body)
    const [sources, findings] = await Promise.all([
      addAgentSources(run.id, analysis.sources),
      addAgentFindings(run.id, analysis.findings),
    ])

    const artifact = await createAgentArtifact(run.id, {
      artifactType: 'json',
      title: 'Resultado de Market Intelligence',
      content: analysis.output,
    })

    const completed = await finishAgentRun(run.id, {
      status: findings.length ? 'needs_review' : 'completed',
      output: analysis.output,
      confidence: analysis.confidence,
    })

    return NextResponse.json({ run: completed, findings, sources, artifact }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar Market Intelligence.'
    if (runId) {
      try {
        await failAgentRun(runId, message)
      } catch (finishError) {
        console.error('[agents/market] failed to persist terminal error', finishError)
      }
    }
    console.error('[agents/market] execution failed', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
