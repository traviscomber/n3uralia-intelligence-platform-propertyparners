export type DecisionRecommendation = {
  title: string
  confidence: number
  evidence: string[]
  recommendedAction: string
}

export function generateDecisionRecommendations(input: {
  decisions: string[]
  evidence: string[]
  forecastConfidence: number
}): DecisionRecommendation[] {
  return input.decisions.map((decision) => ({
    title: decision,
    confidence: input.forecastConfidence,
    evidence: input.evidence,
    recommendedAction: `Execute review workflow for ${decision}`,
  }))
}
