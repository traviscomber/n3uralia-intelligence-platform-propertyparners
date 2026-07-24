export type Scenario = {
  name: string
  assumptions: string[]
  impacts: string[]
  recommendation: string
}

export function simulateStrategicScenario(input: {
  decision: string
  assumptions: string[]
  dataSignals: string[]
}): Scenario {
  return {
    name: input.decision,
    assumptions: input.assumptions,
    impacts: [
      'Operational impact analysis required.',
      'Financial impact analysis required.',
      'Market response analysis required.',
    ],
    recommendation:
      'Evaluate scenario against company evidence and confidence level before decision.',
  }
}

export function createScenarioSet() {
  return [
    'base_case',
    'optimistic_case',
    'conservative_case',
  ]
}
