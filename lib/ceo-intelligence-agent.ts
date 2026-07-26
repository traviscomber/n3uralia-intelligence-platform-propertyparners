import { runExecutiveCopilot } from './copilot-orchestrator'
import { buildMemoryContext, type ExecutiveMemory } from './executive-memory-engine'
import { generateAutonomousActions } from './autonomous-action-engine'

export async function runCEOIntelligenceAgent(input: {
  question: string
  evidence: any[]
  decisions: string[]
  risks: string[]
  opportunities: string[]
  memory: ExecutiveMemory
}) {
  const copilot = await runExecutiveCopilot({
    role: 'ceo',
    question: input.question,
    evidence: input.evidence,
    decisions: input.decisions,
    risks: input.risks,
    forecastConfidence: 80,
  })

  return {
    copilot,
    memory: buildMemoryContext(input.memory),
    actions: generateAutonomousActions({
      risks: input.risks,
      opportunities: input.opportunities,
      confidence: 80,
    }),
    identity: 'CEO Intelligence Partner',
  }
}
