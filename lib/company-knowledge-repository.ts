export type CompanyKnowledgeSource = {
  id: string
  name: string
  category:
    | 'estrategia'
    | 'comercial'
    | 'mercado'
    | 'operaciones'
    | 'directorio'
  sourceType: 'document' | 'json' | 'memory'
  location: string
}

export type CompanyMemory = {
  sourceId: string
  insight: string
  confidence: number
}

export function registerKnowledgeSource(
  source: CompanyKnowledgeSource
) {
  return {
    ...source,
    indexed: false,
    requiresProcessing: true,
  }
}

export function createCompanyMemory(input: CompanyMemory) {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}
