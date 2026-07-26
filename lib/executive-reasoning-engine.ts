export type ReasoningFramework =
  | 'strategy'
  | 'risk'
  | 'investment'
  | 'operations'
  | 'market'
  | 'general'

export type ExecutiveReasoning = {
  framework: ReasoningFramework
  questions: string[]
  factors: string[]
  requiredEvidence: string[]
}

export function selectExecutiveReasoningFramework(
  question: string
): ExecutiveReasoning {
  const text = question.toLowerCase()

  if (text.includes('invert') || text.includes('comprar')) {
    return {
      framework: 'investment',
      questions: [
        'Expected return?',
        'Downside risk?',
        'Alternative uses of capital?',
      ],
      factors: ['financial impact', 'risk', 'scenarios'],
      requiredEvidence: ['financial data', 'market data'],
    }
  }

  if (text.includes('riesgo')) {
    return {
      framework: 'risk',
      questions: [
        'Probability?',
        'Impact?',
        'Mitigation options?',
      ],
      factors: ['evidence', 'confidence', 'impact'],
      requiredEvidence: ['validated signals'],
    }
  }

  return {
    framework: 'general',
    questions: [
      'What changed?',
      'Why does it matter?',
      'What decision is required?',
    ],
    factors: ['context', 'evidence', 'history'],
    requiredEvidence: ['company intelligence'],
  }
}
