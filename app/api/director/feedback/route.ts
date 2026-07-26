import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { captureCopilotFeedback } from '@/lib/copilot-feedback'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['director'])
    if (!authorization.ok) return authorization.response

    const body = await request.json()
    const question = String(body.question ?? '').trim()
    const answerId = String(body.answerId ?? '').trim()

    if (!question || !answerId) {
      return NextResponse.json(
        { error: 'La pregunta y el identificador de respuesta son obligatorios' },
        { status: 400 },
      )
    }

    const result = await captureCopilotFeedback({
      question,
      answerId,
      rating: body.rating === 'up' ? 'up' : 'down',
      comment: typeof body.comment === 'string' ? body.comment.trim() || undefined : undefined,
      contextSources: Array.isArray(body.contextSources)
        ? body.contextSources.filter((source: unknown): source is string => typeof source === 'string')
        : [],
      role: authorization.value.role,
      userId: authorization.value.userId,
    })

    return NextResponse.json(result, { status: result.persisted ? 201 : 503 })
  } catch (error) {
    console.error('Director feedback route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error procesando feedback del Director' },
      { status: 500 },
    )
  }
}
