export type KnowledgeContext = {
  documents: string[]
  memories: string[]
  evidence: string[]
  decisions: string[]
}

export type IntelligenceContext = {
  knowledge: KnowledgeContext
  readyForReasoning: boolean
}

export function buildKnowledgeContext(input: {
  documents: string[]
  memories: string[]
  evidence: string[]
  decisions: string[]
}): IntelligenceContext {
  return {
    knowledge: {
      documents: input.documents,
      memories: input.memories,
      evidence: input.evidence,
      decisions: input.decisions,
    },
    readyForReasoning:
      input.documents.length > 0 ||
      input.evidence.length > 0 ||
      input.memories.length > 0,
  }
}
