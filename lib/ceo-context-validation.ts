export type ContextSource =
  | 'crm'
  | 'targets'
  | 'market'
  | 'valuation'
  | 'documents'
  | 'memory'

export function validateCEOContext(sources: ContextSource[]) {
  const required: ContextSource[] = [
    'crm',
    'targets',
    'market',
    'valuation',
    'documents',
    'memory',
  ]

  const missing = required.filter(
    (source) => !sources.includes(source)
  )

  return {
    valid: missing.length === 0,
    missing,
    available: sources,
  }
}

export function buildCEOQuestionContext(question: string) {
  return {
    question,
    requiredSources: [
      'crm',
      'targets',
      'market',
      'valuation',
      'documents',
      'memory',
    ],
  }
}
