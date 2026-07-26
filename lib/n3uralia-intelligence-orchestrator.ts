import { createTruthAssessment, type EvidenceItem } from './executive-truth-layer'
import { answerCEOQuestion } from './ceo-question-intelligence'
import { monitorStrategicSignals } from './strategic-monitoring-agent'
import { generateStrategicRecommendation } from './strategic-recommendation-engine'

export async function runN3uraliaIntelligenceOrchestrator(input: {
  question: string
  evidence: EvidenceItem[]
  risks: string[]
  opportunities: string[]
  scenarios: string[]
}) {
  const truth = createTruthAssessment({
    conclusion: input.question,
    evidence: input.evidence,
  })

  const monitoring = monitorStrategicSignals({
    changes: input.evidence.map((item) => item.statement),
    risks: input.risks,
    opportunities: input.opportunities,
    confidence: truth.confidence,
  })

  const recommendation = generateStrategicRecommendation({
    scenarios: input.scenarios,
    evidence: input.evidence.map((item) => item.statement),
    confidence: truth.confidence,
  })

  return answerCEOQuestion({
    question: input.question,
    currentData: input.evidence.map((item) => item.statement),
    historicalMemory: [],
    patterns: [],
    risks: input.risks,
    opportunities: input.opportunities,
    predictions: recommendation.alternatives,
    confidence: truth.confidence,
  })
}
