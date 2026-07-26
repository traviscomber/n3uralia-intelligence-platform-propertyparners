export type MemoryEvent = {
  question: string
  decision: string
  evidence: string[]
  outcome?: string
  createdAt: string
}

export type ExecutiveMemory = {
  events: MemoryEvent[]
}

export function createExecutiveMemoryEvent(input: {
  question: string
  decision: string
  evidence: string[]
}) {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function buildMemoryContext(memory: ExecutiveMemory) {
  return {
    historyCount: memory.events.length,
    previousDecisions: memory.events.map((event) => event.decision),
    instruction:
      'Use previous executive decisions as context, but validate against current company data.',
  }
}
