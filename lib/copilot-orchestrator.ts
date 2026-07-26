import { createKnowledgeContext } from './copilot-knowledge-router'
import { orchestrateExecutiveIntelligence } from './intelligence-orchestrator'
import type { IntelligenceRole } from './role-intelligence-model'

export async function runExecutiveCopilot(input: {
  role: IntelligenceRole
  question: string
  evidence: any[]
  decisions: string[]
  risks: string[]
  forecastConfidence: number
}) {
  const knowledge = createKnowledgeContext(input.question)

  const intelligence = orchestrateExecutiveIntelligence({
    evidence: input.evidence,
    decisions: input.decisions,
    risks: input.risks,
    forecastConfidence: input.forecastConfidence,
  })

  return {
    role: input.role,
    knowledge,
    intelligence,
    answerPolicy:
      'Respond only using company data and N3uralia intelligence layers.',
  }
}
