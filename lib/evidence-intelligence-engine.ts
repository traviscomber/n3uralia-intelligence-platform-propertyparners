export type EvidenceItem = {
  id: string
  source: string
  statement: string
  confidence: number
}

export type EvidenceDecisionContext = {
  evidence: EvidenceItem[]
  strongestEvidence: EvidenceItem[]
  confidenceScore: number
}

export function buildEvidenceContext(
  evidence: EvidenceItem[]
): EvidenceDecisionContext {
  const strongestEvidence = [...evidence]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  const confidenceScore = evidence.length
    ? Math.round(
        evidence.reduce((sum, item) => sum + item.confidence, 0) /
          evidence.length
      )
    : 0

  return {
    evidence,
    strongestEvidence,
    confidenceScore,
  }
}
