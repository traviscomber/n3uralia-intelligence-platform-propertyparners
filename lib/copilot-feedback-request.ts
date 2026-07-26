import { NextResponse } from 'next/server'

const MAX_QUESTION_LENGTH = 2_000
const MAX_ANSWER_ID_LENGTH = 200
const MAX_COMMENT_LENGTH = 2_000
const MAX_CONTEXT_SOURCES = 25
const MAX_CONTEXT_SOURCE_LENGTH = 500

export type CopilotFeedbackRequest = {
  question: string
  answerId: string
  rating: 'up' | 'down'
  comment?: string
  contextSources: string[]
}

type ParseResult =
  | { ok: true; value: CopilotFeedbackRequest }
  | { ok: false; response: NextResponse }

function errorResponse(code: string, message: string, details?: string[]) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status: 400 },
  )
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength)
}

export async function parseCopilotFeedbackRequest(request: Request): Promise<ParseResult> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return {
      ok: false,
      response: errorResponse('INVALID_JSON', 'El cuerpo de la solicitud debe contener JSON válido.'),
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      response: errorResponse('INVALID_PAYLOAD', 'El cuerpo de la solicitud debe ser un objeto JSON.'),
    }
  }

  const payload = body as Record<string, unknown>
  const question = normalizeText(payload.question, MAX_QUESTION_LENGTH)
  const answerId = normalizeText(payload.answerId, MAX_ANSWER_ID_LENGTH)
  const comment = normalizeText(payload.comment, MAX_COMMENT_LENGTH)
  const details: string[] = []

  if (!question) details.push('question es obligatorio y debe ser texto no vacío.')
  if (!answerId) details.push('answerId es obligatorio y debe ser texto no vacío.')
  if (payload.rating !== 'up' && payload.rating !== 'down') {
    details.push('rating debe ser exactamente "up" o "down".')
  }
  if (payload.comment !== undefined && typeof payload.comment !== 'string') {
    details.push('comment debe ser texto cuando se incluye.')
  }
  if (payload.contextSources !== undefined && !Array.isArray(payload.contextSources)) {
    details.push('contextSources debe ser un arreglo cuando se incluye.')
  }

  if (details.length > 0) {
    return {
      ok: false,
      response: errorResponse('VALIDATION_ERROR', 'El feedback contiene campos inválidos.', details),
    }
  }

  const contextSources = Array.isArray(payload.contextSources)
    ? Array.from(
        new Set(
          payload.contextSources
            .map((source) => normalizeText(source, MAX_CONTEXT_SOURCE_LENGTH))
            .filter((source) => source.length > 0),
        ),
      ).slice(0, MAX_CONTEXT_SOURCES)
    : []

  return {
    ok: true,
    value: {
      question,
      answerId,
      rating: payload.rating as 'up' | 'down',
      ...(comment ? { comment } : {}),
      contextSources,
    },
  }
}

export function copilotFeedbackServerError(message: string) {
  return NextResponse.json(
    {
      error: {
        code: 'FEEDBACK_PROCESSING_FAILED',
        message,
      },
    },
    { status: 500 },
  )
}
