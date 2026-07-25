import { runCEOCopilot } from './ceo-copilot-runtime-orchestrator'
import { runExecutiveReasoningPipeline } from './executive-reasoning-pipeline'
import { captureCopilotFeedback } from './ceo-feedback-learning-loop'
import { storeDecisionOutcome } from './decision-outcome-memory'

export async function runCEOConversation(input: {
  question: string
  importance: 'low' | 'medium' | 'high'
  requiresDecision: boolean
}) {
  const runtime = await runCEOCopilot(input)

  const response = await runExecutiveReasoningPipeline({
    role: 'ceo',
    question: input.question,
    context: runtime,
  })

  return {
    runtime,
    response,
    feedback: captureCopilotFeedback,
    memory: storeDecisionOutcome,
  }
}
