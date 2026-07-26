import type { IntelligenceNode, IntelligenceRelation } from './company-intelligence-graph'

export function reasonOverIntelligenceGraph(input: {
  nodes: IntelligenceNode[]
  relations: IntelligenceRelation[]
  question: string
}) {
  const connections = input.relations.map((relation) => ({
    from: relation.from,
    to: relation.to,
    relation: relation.relation,
  }))

  return {
    question: input.question,
    entitiesFound: input.nodes.length,
    connections,
    insights: [
      'Analyze relationships between decisions, entities and outcomes.',
      'Prioritize validated evidence before conclusions.',
    ],
    confidence: 'requires evidence validation',
  }
}
