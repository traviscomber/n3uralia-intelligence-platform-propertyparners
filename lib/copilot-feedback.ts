import { createClient } from '@/lib/supabase/server'
import type { CopilotRole } from '@/lib/copilot-authorization'

const MAX_QUESTION_LENGTH = 2_000
const MAX_ANSWER_ID_LENGTH = 200
const MAX_COMMENT_LENGTH = 2_000
const MAX_CONTEXT_SOURCES = 25
const MAX_CONTEXT_SOURCE_LENGTH = 500
const COPILOT_ROLES: readonly CopilotRole[] = ['ceo', 'director', 'partner']

export type CopilotFeedback = {
  question: string
  answerId: string
  rating: 'up' | 'down'
  comment?: string
  contextSources: string[]
  role: CopilotRole
  userId: string
}

export type LearningSignal = {
  signal: string
  category: 'quality' | 'relevance' | 'accuracy' | 'style'
}

type FeedbackPersistenceError = 'INVALID_FEEDBACK' | 'PERSISTENCE_FAILED' | null

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength)
}

function normalizeFeedback(feedback: CopilotFeedback): CopilotFeedback | null {
  const question = normalizeText(feedback.question, MAX_QUESTION_LENGTH)
  const answerId = normalizeText(feedback.answerId, MAX_ANSWER_ID_LENGTH)
  const userId = normalizeText(feedback.userId, 200)
  const comment = normalizeText(feedback.comment, MAX_COMMENT_LENGTH)

  if (
    !question ||
    !answerId ||
    !userId ||
    (feedback.rating !== 'up' && feedback.rating !== 'down') ||
    !COPILOT_ROLES.includes(feedback.role)
  ) {
    return null
  }

  const contextSources = Array.from(
    new Set(
      (Array.isArray(feedback.contextSources) ? feedback.contextSources : [])
        .map((source) => normalizeText(source, MAX_CONTEXT_SOURCE_LENGTH))
        .filter((source) => source.length > 0),
    ),
  ).slice(0, MAX_CONTEXT_SOURCES)

  return {
    question,
    answerId,
    rating: feedback.rating,
    ...(comment ? { comment } : {}),
    contextSources,
    role: feedback.role,
    userId,
  }
}

function auditFeedbackPersistence(
  feedback: Pick<CopilotFeedback, 'role' | 'rating' | 'contextSources' | 'comment'>,
  outcome: 'persisted' | 'rejected' | 'failed',
  errorCode: FeedbackPersistenceError,
) {
  console.info('copilot_feedback_persistence', {
    event: 'copilot_feedback_persistence',
    outcome,
    errorCode,
    role: feedback.role,
    rating: feedback.rating,
    contextSourceCount: feedback.contextSources.length,
    hasComment: Boolean(feedback.comment),
    timestamp: new Date().toISOString(),
  })
}

export async function captureCopilotFeedback(feedback: CopilotFeedback) {
  const timestamp = new Date().toISOString()
  const normalizedFeedback = normalizeFeedback(feedback)

  if (!normalizedFeedback) {
    auditFeedbackPersistence(
      {
        role: feedback.role,
        rating: feedback.rating,
        contextSources: Array.isArray(feedback.contextSources) ? feedback.contextSources : [],
        comment: feedback.comment,
      },
      'rejected',
      'INVALID_FEEDBACK',
    )

    return {
      ...feedback,
      timestamp,
      persisted: false,
      error: 'INVALID_FEEDBACK' as const,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('copilot_feedback').insert({
    question: normalizedFeedback.question,
    answer_id: normalizedFeedback.answerId,
    rating: normalizedFeedback.rating,
    comment: normalizedFeedback.comment ?? null,
    context_sources: normalizedFeedback.contextSources,
    role: normalizedFeedback.role,
    user_id: normalizedFeedback.userId,
  })

  if (error) {
    console.error('Copilot feedback persistence failed:', {
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    auditFeedbackPersistence(normalizedFeedback, 'failed', 'PERSISTENCE_FAILED')
  } else {
    auditFeedbackPersistence(normalizedFeedback, 'persisted', null)
  }

  return {
    ...normalizedFeedback,
    timestamp,
    persisted: !error,
    error: error ? ('PERSISTENCE_FAILED' as const) : null,
  }
}

export function classifyFeedback(feedback: CopilotFeedback): LearningSignal[] {
  if (feedback.rating === 'up') {
    return [{ signal: 'respuesta útil', category: 'quality' }]
  }

  return [{ signal: feedback.comment ?? 'requiere mejora', category: 'relevance' }]
}
