export type MemoryEntity =
  | 'decision'
  | 'person'
  | 'client'
  | 'property'
  | 'outcome'
  | 'market_condition'

export type MemoryRelation = {
  from: string
  to: string
  relationship: string
}

export function createExecutiveMemoryGraph(input: {
  entities: { id: string; type: MemoryEntity; label: string }[]
  relations: MemoryRelation[]
}) {
  return {
    entities: input.entities,
    relations: input.relations,
    purpose:
      'Preserve organizational experience by connecting decisions, contexts and outcomes.',
  }
}

export function findStrategicPatterns(
  graph: ReturnType<typeof createExecutiveMemoryGraph>
) {
  return {
    patternsDetected: graph.relations.length,
    recommendation:
      'Compare new decisions against historical company experience before execution.',
  }
}
