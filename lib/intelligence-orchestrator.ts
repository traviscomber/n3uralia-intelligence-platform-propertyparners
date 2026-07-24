import { buildEvidenceContext, type EvidenceItem } from './evidence-intelligence-engine'
import { buildExecutiveReasoning } from './reasoning-core-engine'
import { generateDecisionRecommendations } from './decision-automation-engine'

export function orchestrateExecutiveIntelligence(input: {
  evidence: EvidenceItem[]
  forecastConfidence: number
  decisions: string[]
  risks: string[]
}) {
  const evidenceContext = buildEvidenceContext(input.evidence)

  const reasoning = buildExecutiveReasoning({
    evidenceConfidence: evidenceContext.confidenceScore,
    forecastConfidence: input.forecastConfidence,
    decisionConfidence: evidenceContext.confidenceScore,
  })

  const recommendations = generateDecisionRecommendations({
    decisions: input.decisions,
    evidence: evidenceContext.strongestEvidence.map(
      (item) => item.statement
    ),
    forecastConfidence: input.forecastConfidence,
  })

  return {
    evidence: evidenceContext,
    reasoning,
    recommendations,
    risks: input.risks,
  }
}
