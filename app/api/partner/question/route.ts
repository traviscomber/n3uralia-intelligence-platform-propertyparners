import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['partner'])
    if (!authorization.ok) return authorization.response

    const body = await request.json()
    const question: string = body.question ?? '¿Cuál es mi estado actual de leads y cartera?'

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'La pregunta es obligatoria' }, { status: 400 })
    }

    const reasoningMode = selectReasoningMode({
      question,
      importance: body.importance ?? 'medium',
      requiresDecision: body.requiresDecision ?? false,
    })

    const intelligenceContext = buildN3uraliaIntelligenceContext('seller')

    const result = await runExecutiveReasoningPipeline({
      role: 'partner',
      question,
      reasoningMode,
      context: {
        source: 'Partner Assistant Widget',
        requestedAt: new Date().toISOString(),
        intelligence: intelligenceContext,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Partner question route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error procesando consulta del partner' },
      { status: 500 },
    )
  }
}
