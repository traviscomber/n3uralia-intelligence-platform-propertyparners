import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { parseCopilotQuestionRequest } from '@/lib/copilot-question-request'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['director'])
    if (!authorization.ok) return authorization.response

    const parsedRequest = await parseCopilotQuestionRequest(request, {
      question: '¿Qué debo saber de mi región hoy?',
      importance: 'high',
      requiresDecision: true,
    })
    if (!parsedRequest.ok) return parsedRequest.response

    const { question, importance, requiresDecision } = parsedRequest.value
    const reasoningMode = selectReasoningMode({
      question,
      importance,
      requiresDecision,
    })

    const intelligenceContext = buildN3uraliaIntelligenceContext('director')

    const result = await runExecutiveReasoningPipeline({
      role: 'directorio',
      question,
      reasoningMode,
      context: {
        source: 'Director de Cuenta Assistant Widget',
        requestedAt: new Date().toISOString(),
        intelligence: intelligenceContext,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Director de Cuenta question route error:', error)
    return NextResponse.json(
      { error: 'No fue posible procesar la pregunta del Director de Cuenta' },
      { status: 500 },
    )
  }
}
