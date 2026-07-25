import { NextResponse } from 'next/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from '@/lib/n3uralia-intelligence-engine'

export async function POST(request: Request) {
  const body = await request.json()
  
  // Build complete N3uralia intelligence context with all evidence
  const intelligenceContext = buildN3uraliaIntelligenceContext('ceo')

  const result = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: body.question ?? '¿Qué debo saber hoy?',
    context: {
      source: 'CEO Assistant Widget',
      requestedAt: new Date().toISOString(),
      intelligence: intelligenceContext,
    },
  })

  return NextResponse.json(result)
}
