import { buildKnowledgeContext } from './n3uralia-knowledge-context-builder'

export function buildIntelligenceContextWithKnowledge(input: {
  audience: 'ceo' | 'directorio' | 'sucursal' | 'partner'
  documents: string[]
  memories: string[]
  evidence: string[]
  decisions: string[]
}) {
  const knowledge = buildKnowledgeContext({
    documents: input.documents,
    memories: input.memories,
    evidence: input.evidence,
    decisions: input.decisions,
  })

  return {
    audience: input.audience,
    knowledge,
    intelligenceReady: knowledge.readyForReasoning,
    principle:
      'Las recomendaciones deben priorizar conocimiento empresarial, evidencia y memoria histórica.',
  }
}
