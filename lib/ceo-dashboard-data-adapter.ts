export type CEODashboardData = {
  greeting: string
  priorities: unknown[]
  risks: unknown[]
  opportunities: unknown[]
  decisions: unknown[]
  sources: string[]
}

export function buildCEODashboardData(input: {
  priorities: unknown[]
  risks: unknown[]
  opportunities: unknown[]
  decisions: unknown[]
  sources: string[]
}): CEODashboardData {
  return {
    greeting: 'Buenos días Pedro',
    priorities: input.priorities,
    risks: input.risks,
    opportunities: input.opportunities,
    decisions: input.decisions,
    sources: input.sources,
  }
}
