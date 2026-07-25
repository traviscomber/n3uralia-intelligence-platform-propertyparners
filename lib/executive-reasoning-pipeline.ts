import { generateExecutiveReasoning } from './openai-reasoning-layer'
import { applyExecutiveResponseGuard } from './executive-response-guard'
import type { N3uraliaIntelligenceContext } from './n3uralia-intelligence-engine'

export async function runExecutiveReasoningPipeline(input: {
  role: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  question: string
  context: {
    source: string
    requestedAt: string
    intelligence?: N3uraliaIntelligenceContext
  }
}) {
  const response = await generateExecutiveReasoning(input)

  // Extract evidence items as facts when available
  const facts = input.context.intelligence?.evidence
    ? input.context.intelligence.evidence.map((e) => `${e.label}: ${e.value} (${e.source})`)
    : []

  // Extract signals as inferences when available
  const inferences = input.context.intelligence?.signals
    ? input.context.intelligence.signals.map((s) => `${s.title}: ${s.interpretation}`)
    : []

  // Extract actions as recommendations when available
  const recommendations = input.context.intelligence?.actions
    ? input.context.intelligence.actions.map((a) => `${a.title}: ${a.action}`)
    : []

  // Extract risks when available
  const risks = input.context.intelligence?.risks
    ? input.context.intelligence.risks.map((r) => `[${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`)
    : []

  return applyExecutiveResponseGuard({
    summary: response.answer,
    facts,
    inferences,
    recommendations,
    risks,
    confidence: response.confidence,
    sources: response.sources,
  })
}
