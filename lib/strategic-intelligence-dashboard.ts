export type StrategicDashboard = {
  opportunities: string[]
  risks: string[]
  scenarios: string[]
  decisionsPending: string[]
  confidenceSignals: number
}

export function buildStrategicDashboard(input: {
  opportunities: string[]
  risks: string[]
  scenarios: string[]
  decisionsPending: string[]
  confidenceSignals: number
}): StrategicDashboard {
  return {
    opportunities: input.opportunities,
    risks: input.risks,
    scenarios: input.scenarios,
    decisionsPending: input.decisionsPending,
    confidenceSignals: input.confidenceSignals,
  }
}
