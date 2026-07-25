export type CopilotFeedback = {
  question: string
  answerId: string
  rating: 'up' | 'down'
  comment?: string
  contextSources: string[]
}

export type LearningSignal = {
  signal: string
  category: 'quality' | 'relevance' | 'accuracy' | 'style'
}

export function captureCopilotFeedback(
  feedback: CopilotFeedback
) {
  return {
    ...feedback,
    timestamp: new Date().toISOString(),
    learningReady: true,
  }
}

export function classifyFeedback(
  feedback: CopilotFeedback
): LearningSignal[] {
  if (feedback.rating === 'up') {
    return [
      {
        signal: 'respuesta útil',
        category: 'quality',
      },
    ]
  }

  return [
    {
      signal: feedback.comment ?? 'requiere mejora',
      category: 'relevance',
    },
  ]
}
