import { generateExecutiveReasoning } from './openai-reasoning-layer'
import type { ReasoningMode } from './copilot-reasoning-router'

export async function runExecutiveReasoningPipeline(input: {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  context: unknown
  reasoningMode?: ReasoningMode
}) {
  const response = await generateExecutiveReasoning(input)

  return {
    ...response,
    principles: [
      'Mantener tono profesional y ejecutivo.',
      'No emitir juicios personales.',
      'Separar hechos de interpretaciones.',
      'No presentar hipótesis como certezas.',
      'Mostrar evidencia y nivel de confianza.',
      'Responder con respeto y precisión.',
    ],
  }
}
