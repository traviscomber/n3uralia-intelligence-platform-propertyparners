export type RiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type RiskAssessment = {
  signal: string
  level: RiskLevel
  evidence: string[]
  confidence: number
  recommendation: string
}

export function assessRisk(input: {
  signal: string
  evidence: string[]
  confidence: number
  impact: 'low' | 'medium' | 'high'
}): RiskAssessment {
  const level: RiskLevel =
    input.impact === 'high' && input.confidence >= 80
      ? 'high'
      : input.impact === 'high'
        ? 'medium'
        : 'low'

  return {
    signal: input.signal,
    level,
    evidence: input.evidence,
    confidence: input.confidence,
    recommendation:
      'Monitor the signal, validate additional evidence, and avoid decisions based on isolated indicators.',
  }
}
