export type AgentType =
  | 'ceo'
  | 'market'
  | 'risk'
  | 'board'
  | 'document'
  | 'data'

export type AgentTask = {
  question: string
  requiredAgent: AgentType
  reason: string
}

export function selectAgent(question: string): AgentTask {
  const text = question.toLowerCase()

  if (text.includes('mercado')) {
    return {
      question,
      requiredAgent: 'market',
      reason: 'Market intelligence required.',
    }
  }

  if (text.includes('riesgo')) {
    return {
      question,
      requiredAgent: 'risk',
      reason: 'Risk analysis required.',
    }
  }

  if (text.includes('documento')) {
    return {
      question,
      requiredAgent: 'document',
      reason: 'Document knowledge required.',
    }
  }

  return {
    question,
    requiredAgent: 'ceo',
    reason: 'Executive reasoning required.',
  }
}
