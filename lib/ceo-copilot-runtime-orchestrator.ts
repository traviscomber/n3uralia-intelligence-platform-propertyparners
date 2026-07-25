import { selectReasoningMode, getCopilotPolicy } from './copilot-reasoning-router'
import { runExecutiveReasoningPipeline } from './executive-reasoning-pipeline'
import { buildN3uraliaIntelligenceContext } from './n3uralia-intelligence-engine'

export async function runCEOCopilot(input: {
  question: string
  importance: 'low' | 'medium' | 'high'
  requiresDecision: boolean
}) {
  const mode = selectReasoningMode(input)
  const policy = getCopilotPolicy()
  const intelligenceContext = buildN3uraliaIntelligenceContext('ceo')

  const result = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: input.question,
    reasoningMode: mode,
    context: {
      source: 'CEO Copilot Runtime',
      requestedAt: new Date().toISOString(),
      intelligence: intelligenceContext,
    },
  })

  return { ...result, policy }
}
