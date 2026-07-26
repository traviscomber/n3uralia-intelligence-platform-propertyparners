import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { parseCopilotQuestionRequest } from '@/lib/copilot-question-request'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['partner'])
    if (!authorization.ok) return authorization.response

    const parsedRequest = await parseCopilotQuestionRequest(request, {
      question: '¿Cuál es mi estado actual de leads y cartera?',
      importance: 'medium',
      requiresDecision: false,
    })
    if (!parsedRequest.ok) return parsedRequest.response

    const { question, importance, requiresDecision } = parsedRequest.value
    const reasoningMode = selectReasoningMode({
      question,
      importance,
      requiresDecision,
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
      { error: 'No fue posible procesar la consulta del partner' },
      { status: 500 },
    )
  }
}
