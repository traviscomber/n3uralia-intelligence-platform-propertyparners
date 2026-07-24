export type KnowledgeSource =
  | 'company_data'
  | 'evidence_intelligence'
  | 'executive_memory'
  | 'forecast_engine'
  | 'decision_engine'
  | 'external_signals'

export const knowledgePriority: KnowledgeSource[] = [
  'company_data',
  'evidence_intelligence',
  'executive_memory',
  'forecast_engine',
  'decision_engine',
  'external_signals',
]

export function createKnowledgeContext(question: string) {
  return {
    question,
    priority: knowledgePriority,
    rule:
      'Use company data and N3uralia intelligence layers first. Do not generate unsupported conclusions.',
    requiresEvidence: true,
  }
}

export function validateCopilotResponse(response: {
  evidenceCount: number
  sources: KnowledgeSource[]
}) {
  return {
    valid: response.evidenceCount > 0 || response.sources.includes('company_data'),
    reason:
      response.evidenceCount > 0
        ? 'Response backed by intelligence evidence.'
        : 'Requires additional internal data before recommendation.',
  }
}
