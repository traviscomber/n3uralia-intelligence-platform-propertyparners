import { buildMemoryContext, type ExecutiveMemory } from './executive-memory-engine'
import { createKnowledgeContext } from './copilot-knowledge-router'

export function buildCopilotMemoryContext(input: {
  question: string
  memory: ExecutiveMemory
}) {
  const knowledge = createKnowledgeContext(input.question)
  const memory = buildMemoryContext(input.memory)

  return {
    knowledge,
    memory,
    instruction:
      'Use previous executive decisions as historical context while prioritizing current company data and evidence.',
  }
}
