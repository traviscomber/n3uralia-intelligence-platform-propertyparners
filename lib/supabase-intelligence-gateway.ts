export type IntelligenceQuery = {
  domain:
    | 'crm'
    | 'targets'
    | 'market'
    | 'valuation'
    | 'documents'
    | 'memory'
  scope?: string
}

export type IntelligenceResult = {
  domain: string
  source: string
  data: unknown[]
}

export async function queryIntelligenceSource(
  query: IntelligenceQuery
): Promise<IntelligenceResult> {
  return {
    domain: query.domain,
    source: 'supabase-intelligence-layer',
    data: [],
  }
}

export async function buildExecutiveDataContext() {
  const domains: IntelligenceQuery[] = [
    { domain: 'crm' },
    { domain: 'targets' },
    { domain: 'market' },
    { domain: 'valuation' },
    { domain: 'documents' },
    { domain: 'memory' },
  ]

  return Promise.all(domains.map(queryIntelligenceSource))
}
