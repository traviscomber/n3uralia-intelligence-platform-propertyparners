import { NextResponse } from 'next/server'
import { runExecutiveReasoningPipeline } from '@/lib/executive-reasoning-pipeline'
import { buildCEOLiveContext } from '@/lib/ceo-live-context'

export async function POST(request: Request) {
  const body = await request.json()
  const context = await buildCEOLiveContext()

  const result = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: body.question ?? '¿Qué debo saber hoy?',
    context,
  })

  return NextResponse.json(result)
}
