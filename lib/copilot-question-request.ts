import { NextResponse } from 'next/server'
import type { CopilotRequestContext } from '@/lib/copilot-reasoning-router'

type CopilotQuestionDefaults = Omit<CopilotRequestContext, 'question'> & {
  question: string
}

type CopilotQuestionRequestResult =
  | { ok: true; value: CopilotRequestContext }
  | { ok: false; response: NextResponse }

const VALID_IMPORTANCE = new Set<CopilotRequestContext['importance']>([
  'low',
  'medium',
  'high',
])

function badRequest(error: string): CopilotQuestionRequestResult {
  return {
    ok: false,
    response: NextResponse.json({ error }, { status: 400 }),
  }
}

export async function parseCopilotQuestionRequest(
  request: Request,
  defaults: CopilotQuestionDefaults,
): Promise<CopilotQuestionRequestResult> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return badRequest('El cuerpo de la solicitud debe contener JSON válido')
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('El cuerpo de la solicitud debe ser un objeto JSON')
  }

  const input = body as Record<string, unknown>
  const rawQuestion = input.question ?? defaults.question

  if (typeof rawQuestion !== 'string') {
    return badRequest('La pregunta debe ser un texto')
  }

  const question = rawQuestion.trim()
  if (!question) {
    return badRequest('La pregunta es obligatoria')
  }

  const rawImportance = input.importance ?? defaults.importance
  if (
    typeof rawImportance !== 'string'
    || !VALID_IMPORTANCE.has(rawImportance as CopilotRequestContext['importance'])
  ) {
    return badRequest('La importancia debe ser low, medium o high')
  }

  const rawRequiresDecision = input.requiresDecision ?? defaults.requiresDecision
  if (typeof rawRequiresDecision !== 'boolean') {
    return badRequest('requiresDecision debe ser un valor booleano')
  }

  return {
    ok: true,
    value: {
      question,
      importance: rawImportance as CopilotRequestContext['importance'],
      requiresDecision: rawRequiresDecision,
    },
  }
}
