export type CommunicationLevel =
  | 'confirmed'
  | 'high_confidence'
  | 'indication'
  | 'hypothesis'

export function createExecutiveMessage(input: {
  summary: string
  evidence: string[]
  confidence: number
  recommendation: string
}) {
  const level: CommunicationLevel =
    input.confidence >= 85
      ? 'confirmed'
      : input.confidence >= 70
        ? 'high_confidence'
        : input.confidence >= 50
          ? 'indication'
          : 'hypothesis'

  return {
    summary: input.summary,
    evidence: input.evidence,
    confidence: input.confidence,
    confidenceLevel: level,
    recommendation: input.recommendation,
    tone:
      'Executive, precise, humanized and transparent. Avoid unsupported conclusions.',
  }
}
