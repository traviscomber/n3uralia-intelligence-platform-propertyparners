export type DecisionOutcome = {
  decision: string
  recommendation: string
  expectedImpact?: string
  actualOutcome?: string
  lessons?: string
}

export function storeDecisionOutcome(input: DecisionOutcome) {
  return {
    ...input,
    learned:
      Boolean(input.actualOutcome) && Boolean(input.lessons),
    timestamp: new Date().toISOString(),
  }
}

export function comparePredictionWithOutcome(
  decision: DecisionOutcome
) {
  return {
    decision: decision.decision,
    prediction: decision.expectedImpact,
    reality: decision.actualOutcome,
    learning: decision.lessons,
  }
}
