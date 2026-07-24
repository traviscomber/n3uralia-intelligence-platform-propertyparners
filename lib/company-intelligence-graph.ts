export type IntelligenceNodeType =
  | 'person'
  | 'decision'
  | 'client'
  | 'property'
  | 'market_signal'
  | 'risk'
  | 'outcome'

export type IntelligenceNode = {
  id: string
  type: IntelligenceNodeType
  label: string
  metadata?: Record<string, unknown>
}

export type IntelligenceRelation = {
  from: string
  to: string
  relation: string
}

export function createIntelligenceGraph(input: {
  nodes: IntelligenceNode[]
  relations: IntelligenceRelation[]
}) {
  return {
    nodes: input.nodes,
    relations: input.relations,
    instruction:
      'Analyze relationships between company entities, decisions and outcomes using validated intelligence.',
  }
}
