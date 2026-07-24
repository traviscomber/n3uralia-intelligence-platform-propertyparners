export type OpportunityAssessment = {
  signal: string
  opportunity: string
  evidence: string[]
  confidence: number
  recommendation: string
}

export function assessOpportunity(input: {
  signals: string[]
  evidence: string[]
  confidence: number
}): OpportunityAssessment {
  return {
    signal: input.signals[0] || 'No dominant opportunity signal detected',
    opportunity:
      'Potential opportunity identified from company signals and validated intelligence.',
    evidence: input.evidence,
    confidence: input.confidence,
    recommendation:
      'Validate opportunity against current strategy, resources and risk profile before execution.',
  }
}
