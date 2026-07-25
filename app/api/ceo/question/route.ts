import { NextResponse } from 'next/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'
import { selectReasoningMode } from '@/lib/copilot-reasoning-router'

export async function POST(request: Request) {
  const body = await request.json()
  const question: string = body.question ?? '¿Qué debo saber hoy?'

  // Select reasoning depth based on question characteristics
  const reasoningMode = selectReasoningMode({
    question,
    importance: body.importance ?? 'high',
    requiresDecision: body.requiresDecision ?? true,
  })

  // Build complete N3uralia intelligence context with all evidence domains
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
}
