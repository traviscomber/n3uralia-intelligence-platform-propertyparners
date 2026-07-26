import { NextResponse } from 'next/server'
import { requireCopilotRole } from '@/lib/copilot-authorization'
import { captureCopilotFeedback } from '@/lib/copilot-feedback'
import {
  copilotFeedbackServerError,
  parseCopilotFeedbackRequest,
} from '@/lib/copilot-feedback-request'

export async function POST(request: Request) {
  try {
    const authorization = await requireCopilotRole(['ceo'])
    if (!authorization.ok) return authorization.response

    const parsedRequest = await parseCopilotFeedbackRequest(request)
    if (!parsedRequest.ok) return parsedRequest.response

    const result = await captureCopilotFeedback({
      ...parsedRequest.value,
      role: authorization.value.role,
      userId: authorization.value.userId,
    })

    return NextResponse.json(result, { status: result.persisted ? 201 : 503 })
  } catch (error) {
    console.error('CEO feedback route error:', error)
    return copilotFeedbackServerError('No fue posible procesar el feedback del CEO.')
  }
}
