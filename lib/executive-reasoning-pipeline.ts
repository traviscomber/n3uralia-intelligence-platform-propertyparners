import { generateExecutiveReasoning } from './openai-reasoning-layer'
import { applyExecutiveResponseGuard } from './executive-response-guard'

export async function runExecutiveReasoningPipeline(input: {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  context: unknown
}) {
  const response = await generateExecutiveReasoning(input)

  return applyExecutiveResponseGuard({
    summary: response.answer,
    facts: [],
    inferences: [],
    recommendations: [],
    risks: [],
    confidence: response.confidence,
    sources: response.sources,
  })
}
