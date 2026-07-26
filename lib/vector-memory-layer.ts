export type VectorMemoryItem = {
  id: string
  content: string
  source: 'document' | 'conversation' | 'decision' | 'evidence'
  metadata?: Record<string, unknown>
  embedding?: number[]
}

export type SemanticMemoryResult = {
  query: string
  matches: VectorMemoryItem[]
}

export function createMemoryItem(input: {
  id: string
  content: string
  source: VectorMemoryItem['source']
  metadata?: Record<string, unknown>
}) {
  return {
    ...input,
    embeddingReady: false,
  }
}

export function searchSemanticMemory(input: {
  query: string
  memories: VectorMemoryItem[]
}): SemanticMemoryResult {
  return {
    query: input.query,
    matches: input.memories,
  }
}
