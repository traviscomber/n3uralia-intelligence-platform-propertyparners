export type ReasoningMode =
  | 'quick'
  | 'standard'
  | 'deep'

export type CopilotRequestContext = {
  question: string
  importance: 'low' | 'medium' | 'high'
  requiresDecision: boolean
}

export function selectReasoningMode(
  context: CopilotRequestContext
): ReasoningMode {
  if (context.requiresDecision || context.importance === 'high') {
    return 'deep'
  }

  if (context.importance === 'medium') {
    return 'standard'
  }

  return 'quick'
}

export const COPILOT_PRINCIPLE =
  'Usar la profundidad necesaria para la pregunta, no la máxima profundidad siempre.'
