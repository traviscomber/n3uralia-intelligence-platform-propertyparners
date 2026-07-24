export type StrategicDecision = {
  decision: string
  context: string
  evidence: string[]
  alternatives: string[]
  outcome?: string
  createdAt: string
}

export function createStrategicDecision(input: {
  decision: string
  context: string
  evidence: string[]
  alternatives: string[]
}) {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function compareWithPreviousDecision(
  current: StrategicDecision,
  previous: StrategicDecision[]
) {
  return {
    current,
    similarDecisions: previous.filter((item) =>
      item.context === current.context
    ),
    learning:
      'Compare previous outcomes before creating new strategic recommendations.',
  }
}
