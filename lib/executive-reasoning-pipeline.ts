import { generateExecutiveReasoning } from './openai-reasoning-layer'
import { applyExecutiveResponseGuard } from './executive-response-guard'
import type { N3uraliaIntelligenceContext } from './n3uralia-intelligence-engine'

export async function runExecutiveReasoningPipeline(input: {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  reasoningMode?: 'quick' | 'standard' | 'deep'
  context: {
    source: string
    requestedAt: string
    intelligence?: N3uraliaIntelligenceContext
  }
}) {
  const response = await generateExecutiveReasoning({
    role: input.role,
    question: input.question,
    reasoningMode: input.reasoningMode,
    context: input.context,
  })

  return applyExecutiveResponseGuard({
    summary: response.answer,
    facts: response.sections.evidenciaUtilizada.flatMap((d) =>
      d.items.map((item) => `${d.domain}: ${item}`)
    ),
    inferences: response.sections.senalesPrincipales,
    recommendations: response.sections.oportunidades,
    risks: response.sections.riesgos,
    confidence: response.confidence,
    sources: response.sources,
    sections: response.sections,
  })
}
