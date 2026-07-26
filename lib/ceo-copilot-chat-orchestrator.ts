import { runCEOCopilot } from './ceo-copilot-runtime-orchestrator'
import { captureCopilotFeedback } from './copilot-feedback'
import { storeDecisionOutcome } from './decision-outcome-memory'

export async function runCEOConversation(input: {
  question: string
  importance: 'low' | 'medium' | 'high'
  requiresDecision: boolean
}) {
  // runCEOCopilot already orchestrates the full pipeline internally
  const response = await runCEOCopilot(input)

  return {
    response,
    // Callers can await these after presenting the response
    saveFeedback: captureCopilotFeedback,
    saveDecision: storeDecisionOutcome,
  }
}
