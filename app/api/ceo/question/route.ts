import { NextResponse } from 'next/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'

export async function POST(request: Request) {
  const body = await request.json()

  const intelligenceContext = buildN3uraliaIntelligenceContext('ceo')

  const result = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: body.question ?? '¿Qué debo saber hoy?',
    context: {
      source: 'N3uralia Intelligence Engine',
      intelligenceContext,
      requestedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json(result)
}
