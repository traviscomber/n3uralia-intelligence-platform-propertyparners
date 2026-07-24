export type ReasoningInput = {
  evidenceConfidence: number
  forecastConfidence: number
  decisionConfidence: number
}

export type ReasoningResult = {
  overallConfidence: number
  rationale: string
  recommendation: string
}

export function buildExecutiveReasoning(
  input: ReasoningInput
): ReasoningResult {
  const overallConfidence = Math.round(
    (input.evidenceConfidence +
      input.forecastConfidence +
      input.decisionConfidence) /
      3
  )

  return {
    overallConfidence,
    rationale:
      'Recommendation generated from evidence, forecast and decision intelligence layers.',
    recommendation:
      overallConfidence >= 75
        ? 'Proceed with executive action.'
        : 'Request additional evidence before final decision.',
  }
}
