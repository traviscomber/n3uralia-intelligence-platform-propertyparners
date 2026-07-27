import { generateExecutiveReasoning } from './openai-reasoning-layer'
import { applyExecutiveResponseGuard } from './executive-response-guard'
import { applyIntelligenceAccessPolicy } from './intelligence-access-policy'
import { rankEvidence } from './evidence-ranker'
import type { CopilotRole } from './copilot-authorization'
import type { N3uraliaIntelligenceContext } from './n3uralia-intelligence-engine'

type ExecutiveReasoningRole = 'ceo' | 'directorio' | 'sucursal' | 'partner'

const COPILOT_ROLE_BY_REASONING_ROLE: Record<ExecutiveReasoningRole, CopilotRole> = {
  ceo: 'ceo',
  directorio: 'director',
  sucursal: 'director',
  partner: 'partner',
}

export async function runExecutiveReasoningPipeline(input: {
  role: ExecutiveReasoningRole
  question: string
  reasoningMode?: 'quick' | 'standard' | 'deep'
  context: {
    source: string
    requestedAt: string
    intelligence?: N3uraliaIntelligenceContext
  }
}) {
  const authorizedIntelligence = input.context.intelligence
    ? applyIntelligenceAccessPolicy(
        input.context.intelligence,
        COPILOT_ROLE_BY_REASONING_ROLE[input.role],
      )
    : undefined

  // Rank evidence by relevance to the question so the reasoning layer
  // receives the most pertinent items first. The _score field is stripped
  // before passing to OpenAI to keep the context clean.
  const rankedIntelligence = authorizedIntelligence
    ? {
        ...authorizedIntelligence,
        evidence: rankEvidence(authorizedIntelligence.evidence, input.question).map(
          ({ _score: _dropped, ...item }) => item,
        ),
      }
    : undefined

  const response = await generateExecutiveReasoning({
    role: input.role,
    question: input.question,
    reasoningMode: input.reasoningMode,
    context: {
      ...input.context,
      intelligence: rankedIntelligence,
    },
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
    evidenceIds: response.evidenceIds,
    claims: response.claims,
    sections: response.sections,
  })
}
