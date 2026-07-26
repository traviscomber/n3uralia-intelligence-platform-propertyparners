export type EvidenceItem = {
  source: string
  statement: string
  confidence: number
  validated: boolean
}

export type TruthAssessment = {
  conclusion: string
  evidence: EvidenceItem[]
  confidence: number
  status: 'validated' | 'needs_validation'
}

export function createTruthAssessment(input: {
  conclusion: string
  evidence: EvidenceItem[]
}): TruthAssessment {
  const validatedEvidence = input.evidence.filter(
    (item) => item.validated
  )

  const confidence = validatedEvidence.length
    ? Math.round(
        validatedEvidence.reduce(
          (total, item) => total + item.confidence,
          0
        ) / validatedEvidence.length
      )
    : 0

  return {
    conclusion: input.conclusion,
    evidence: input.evidence,
    confidence,
    status:
      validatedEvidence.length === input.evidence.length
        ? 'validated'
        : 'needs_validation',
  }
}
