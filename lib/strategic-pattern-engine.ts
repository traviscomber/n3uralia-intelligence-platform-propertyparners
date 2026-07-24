export type StrategicPattern = {
  pattern: string
  context: string[]
  occurrences: number
  confidence: number
  insight: string
}

export function discoverStrategicPatterns(input: {
  events: { context: string; outcome: string }[]
  confidence: number
}): StrategicPattern[] {
  const grouped = input.events.reduce<Record<string, number>>((acc, event) => {
    acc[event.context] = (acc[event.context] || 0) + 1
    return acc
  }, {})

  return Object.entries(grouped).map(([context, occurrences]) => ({
    pattern: context,
    context: input.events
      .filter((event) => event.context === context)
      .map((event) => event.outcome),
    occurrences,
    confidence: input.confidence,
    insight:
      'Pattern detected from historical company experience. Validate before strategic action.',
  }))
}
