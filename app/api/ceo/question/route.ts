import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { parseCopilotQuestionRequest } from '@/lib/copilot-question-request'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['ceo'])
    if (!authorization.ok) return authorization.response

    const parsedRequest = await parseCopilotQuestionRequest(request, {
      question: '¿Qué debo saber hoy?',
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

    const intelligenceContext = buildN3uraliaIntelligenceContext('ceo')

    const result = await runExecutiveReasoningPipeline({
      role: 'ceo',
      question,
      reasoningMode,
      context: {
        source: 'CEO Assistant Widget',
        requestedAt: new Date().toISOString(),
        intelligence: intelligenceContext,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('CEO question route error:', error)
    return NextResponse.json(
      { error: 'No fue posible procesar la pregunta del CEO' },
      { status: 500 },
    )
  }
}
