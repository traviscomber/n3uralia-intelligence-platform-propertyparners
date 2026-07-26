export type FeedbackSignal = {
  responseId: string
  rating: 'positive' | 'negative'
  comment?: string
}

export function storeCopilotFeedback(signal: FeedbackSignal) {
  return {
    ...signal,
    capturedAt: new Date().toISOString(),
  }
}

export function calculateAttentionScore(input: {
  impact: number
  urgency: number
  confidence: number
}) {
  return input.impact * 0.4 + input.urgency * 0.3 + input.confidence * 0.3
}

export function shouldInterrupt(score: number) {
  return score >= 8
}

export function buildContrarianReview(decision: string) {
  return {
    decision,
    questions: [
      '¿Qué evidencia podría contradecir esta decisión?',
      '¿Qué riesgo no está considerado?',
      '¿Qué información falta antes de actuar?',
    ],
  }
}

export function buildDecisionMemory(input: {
  decision: string
  outcome?: string
}) {
  return {
    ...input,
    learned: Boolean(input.outcome),
  }
}

export function createBoardSimulation(question: string) {
  return {
    question,
    scenarios: ['optimista', 'esperado', 'adverso'],
  }
}
