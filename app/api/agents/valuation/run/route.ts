import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { addAgentFindings, addAgentSources, createAgentArtifact, failAgentRun, finishAgentRun, startAgentRun } from '@/lib/agents/engine'
import { runValuationAnalysis } from '@/lib/agents/valuation'
import type { ValuationInput } from '@/lib/valuation-model'

export const dynamic = 'force-dynamic'

function isValuationInput(value: unknown): value is ValuationInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  if (input.propertyType === 'Departamento') {
    return Number(input.usefulAreaM2) > 0 && Number(input.appliedUsefulUfM2) > 0
  }
  if (input.propertyType === 'Casa') {
    return Number(input.builtAreaM2) > 0 && Number(input.builtUfM2) > 0
  }
  return false
}

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst'])
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !isValuationInput(body.valuation)) {
    return NextResponse.json({ error: 'Datos de valorización inválidos.' }, { status: 400 })
  }

  const valuation = body.valuation
  const propertyType = valuation.propertyType
  const propertyId = typeof body.propertyId === 'string' && body.propertyId ? body.propertyId : undefined
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood : undefined
  const comparableLimit = Number.isFinite(Number(body.comparableLimit)) ? Number(body.comparableLimit) : undefined
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined

  const run = await startAgentRun({
    agentKey: 'valuation',
    title: `Valorización IA${neighborhood ? ` · ${neighborhood}` : ''}`,
    instructions: 'Estimar valor con metodología determinística, comparables trazables y revisión humana obligatoria.',
    input: { propertyId, neighborhood, propertyType, valuation, comparableLimit },
    idempotencyKey,
  })

  const runId = run.id as string

  try {
    const analysis = await runValuationAnalysis({
      propertyId,
      neighborhood,
      propertyType,
      valuation,
      comparableLimit,
    })

    await addAgentSources(runId, analysis.sources)
    const findings = await addAgentFindings(runId, analysis.findings)
    const artifact = await createAgentArtifact(runId, {
      artifactType: 'valuation',
      title: `Valorización ${analysis.subject?.address || neighborhood || propertyType}`,
      version: 1,
      content: {
        valuation: analysis.valuation,
        comparableSummary: analysis.comparableSummary,
        comparables: analysis.comparables,
        approvedMarketFindings: analysis.approvedMarketFindings,
        limitations: analysis.limitations,
      },
    })

    const completed = await finishAgentRun(runId, {
      status: 'needs_review',
      confidence: analysis.confidence,
      output: {
        commercialValueUf: analysis.valuation.commercialValueUf,
        scenarios: analysis.valuation.scenarios,
        comparableSummary: analysis.comparableSummary,
        findingCount: findings.length,
        artifactId: artifact.id,
        limitationCount: analysis.limitations.length,
      },
    })

    return NextResponse.json({
      run: completed,
      valuation: analysis.valuation,
      comparableSummary: analysis.comparableSummary,
      comparables: analysis.comparables,
      confidence: analysis.confidence,
      findings,
      artifact,
      limitations: analysis.limitations,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar el Valorizador IA.'
    await failAgentRun(runId, message).catch(() => undefined)
    return NextResponse.json({ error: message, runId }, { status: 500 })
  }
}
