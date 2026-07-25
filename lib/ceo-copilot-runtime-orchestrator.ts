import { selectReasoningMode } from './copilot-reasoning-router'
import { getCopilotPolicy } from './copilot-reasoning-router'

export async function runCEOCopilot(input: {
  question: string
  importance: 'low' | 'medium' | 'high'
  requiresDecision: boolean
}) {
  const mode = selectReasoningMode(input)
  const policy = getCopilotPolicy()

  return {
    question: input.question,
    reasoningMode: mode,
    policy,
    status: 'ready',
    next: 'Enviar contexto validado al motor de razonamiento.',
  }
}
