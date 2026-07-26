import { createClient } from '@/lib/supabase/server'

export type CopilotFeedback = {
  question: string
  answerId: string
  rating: 'up' | 'down'
  comment?: string
  contextSources: string[]
  role?: string
  userId?: string
}

export type LearningSignal = {
  signal: string
  category: 'quality' | 'relevance' | 'accuracy' | 'style'
}

export async function captureCopilotFeedback(feedback: CopilotFeedback) {
  const supabase = await createClient()

  const { error } = await supabase.from('copilot_feedback').insert({
    question: feedback.question,
    answer_id: feedback.answerId,
    rating: feedback.rating,
    comment: feedback.comment ?? null,
    context_sources: feedback.contextSources,
    role: feedback.role ?? 'ceo',
    user_id: feedback.userId ?? null,
  })

  return {
    ...feedback,
    timestamp: new Date().toISOString(),
    persisted: !error,
    error: error?.message ?? null,
  }
}

export function classifyFeedback(feedback: CopilotFeedback): LearningSignal[] {
  if (feedback.rating === 'up') {
    return [{ signal: 'respuesta útil', category: 'quality' }]
  }
  return [{ signal: feedback.comment ?? 'requiere mejora', category: 'relevance' }]
}
