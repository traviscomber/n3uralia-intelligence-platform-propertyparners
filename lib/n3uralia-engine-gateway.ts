import { buildExecutiveDataContext } from './supabase-intelligence-gateway'
import { buildKnowledgeContext } from './n3uralia-knowledge-context-builder'

export async function buildN3uraliaEngineContext() {
  const sources = await buildExecutiveDataContext()

  return buildKnowledgeContext({
    documents: sources
      .filter((source) => source.domain === 'documents')
      .map((source) => source.source),
    memories: sources
      .filter((source) => source.domain === 'memory')
      .map((source) => source.source),
    evidence: sources
      .filter((source) =>
        ['crm', 'targets', 'market', 'valuation'].includes(source.domain)
      )
      .map((source) => source.source),
    decisions: [],
  })
}
