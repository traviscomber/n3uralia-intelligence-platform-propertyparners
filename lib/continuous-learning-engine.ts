export type LearningEvent = {
  decision: string
  expectedOutcome: string
  actualOutcome?: string
  success?: boolean
  createdAt: string
}

export function createLearningEvent(input: {
  decision: string
  expectedOutcome: string
  actualOutcome?: string
}) {
  return {
    ...input,
    success: undefined,
    createdAt: new Date().toISOString(),
  }
}

export function evaluateLearningEvent(event: LearningEvent) {
  return {
    ...event,
    success:
      event.actualOutcome !== undefined
        ? event.actualOutcome === event.expectedOutcome
        : undefined,
    learning:
      event.actualOutcome
        ? 'Update future recommendations using observed outcome.'
        : 'Await outcome before updating intelligence.',
  }
}
