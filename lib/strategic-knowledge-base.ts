export type KnowledgeEntry = {
  type: 'success' | 'failure' | 'lesson'
  context: string
  decision: string
  outcome: string
  learning: string
}

export function createKnowledgeEntry(input: KnowledgeEntry) {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function extractLessons(entries: KnowledgeEntry[]) {
  return {
    successes: entries.filter((entry) => entry.type === 'success'),
    failures: entries.filter((entry) => entry.type === 'failure'),
    lessons: entries.filter((entry) => entry.type === 'lesson'),
    instruction:
      'Use both successful and unsuccessful experiences to improve future strategic recommendations.',
  }
}
