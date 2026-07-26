import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['director'])
    if (!authorization.ok) return authorization.response

    const body = await request.json()
    const question: string = body.question ?? '¿Qué debo saber de mi región hoy?'

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'La pregunta es obligatoria' }, { status: 400 })
    }

    const reasoningMode = selectReasoningMode({
      question,
      importance: body.importance ?? 'high',
      requiresDecision: body.requiresDecision ?? true,
    })

    const intelligenceContext = buildN3uraliaIntelligenceContext('director')

    const result = await runExecutiveReasoningPipeline({
      role: 'directorio',
      question,
      reasoningMode,
      context: {
        source: 'Director Assistant Widget',
        requestedAt: new Date().toISOString(),
        intelligence: intelligenceContext,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Director question route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error procesando pregunta del director' },
      { status: 500 },
    )
  }
}
