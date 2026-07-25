import { NextResponse } from 'next/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'

export async function POST(request: Request) {
  const body = await request.json()

  const result = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: body.question ?? '¿Qué debo saber hoy?',
    context: {
      source: 'CEO Assistant Widget',
      requestedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json(result)
}
