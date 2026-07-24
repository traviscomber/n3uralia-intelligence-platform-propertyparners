export type KnowledgeSource = {
  id: string
  type: 'document' | 'memory' | 'evidence'
  content: string
  relevance: number
}

export type RetrievalResult = {
  query: string
  sources: KnowledgeSource[]
  contextSummary: string
}

export function retrieveKnowledge(input: {
  query: string
  sources: KnowledgeSource[]
}): RetrievalResult {
  const ranked = input.sources
    .filter((source) => source.content.length > 0)
    .sort((a, b) => b.relevance - a.relevance)

  return {
    query: input.query,
    sources: ranked,
    contextSummary:
      'Relevant company knowledge retrieved for intelligence reasoning.',
  }
}
