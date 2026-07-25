export type CEOQuestionAnswer = {
  question: string
  executiveSummary: string
  currentData: string[]
  historicalMemory: string[]
  patterns: string[]
  risks: string[]
  opportunities: string[]
  predictions: string[]
  documents: string[]
  decisions: string[]
  confidence: number
}

export function answerCEOQuestion(input: {
  question: string
  currentData: string[]
  historicalMemory: string[]
  patterns: string[]
  risks: string[]
  opportunities: string[]
  predictions: string[]
  documents?: string[]
  decisions?: string[]
  confidence: number
}): CEOQuestionAnswer {
  return {
    question: input.question,
    executiveSummary:
      'Respuesta ejecutiva generada combinando datos actuales, conocimiento empresarial, memoria histórica y decisiones previas.',
    currentData: input.currentData,
    historicalMemory: input.historicalMemory,
    patterns: input.patterns,
    risks: input.risks,
    opportunities: input.opportunities,
    predictions: input.predictions,
    documents: input.documents || [],
    decisions: input.decisions || [],
    confidence: input.confidence,
  }
}
