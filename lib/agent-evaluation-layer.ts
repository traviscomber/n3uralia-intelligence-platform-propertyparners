export type AgentEvaluation = {
  agent: string
  task: string
  confidence: number
  outcome?: string
  feedback?: string
}

export function evaluateAgentPerformance(input: {
  agent: string
  task: string
  confidence: number
  outcome?: string
  feedback?: string
}): AgentEvaluation {
  return {
    agent: input.agent,
    task: input.task,
    confidence: input.confidence,
    outcome: input.outcome,
    feedback: input.feedback,
  }
}

export function createLearningSignal(
  evaluations: AgentEvaluation[]
) {
  return {
    totalEvaluations: evaluations.length,
    averageConfidence:
      evaluations.length === 0
        ? 0
        : evaluations.reduce(
            (sum, item) => sum + item.confidence,
            0
          ) / evaluations.length,
    instruction:
      'Use outcomes and feedback to improve future agent recommendations.',
  }
}
