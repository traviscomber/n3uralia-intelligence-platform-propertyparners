export type CopilotDecision = {
  priority: 'high' | 'medium' | 'low'
  title: string
  rationale: string
  action: string
}

export function generateExecutiveDecisions(input: {
  portfolioHealth: number
  risks: string[]
  opportunities: string[]
}): CopilotDecision[] {
  const decisions: CopilotDecision[] = []

  if (input.portfolioHealth < 60) {
    decisions.push({
      priority: 'high',
      title: 'Stabilize portfolio performance',
      rationale: 'Portfolio health requires immediate executive attention.',
      action: 'Review assets, risks and corrective actions.',
    })
  }

  if (input.opportunities.length > 0) {
    decisions.push({
      priority: 'medium',
      title: 'Capture strategic opportunities',
      rationale: 'Market signals indicate actionable opportunities.',
      action: 'Prioritize opportunities with highest impact.',
    })
  }

  if (input.risks.length > 0) {
    decisions.push({
      priority: 'high',
      title: 'Mitigate executive risks',
      rationale: 'Known risks require monitoring and response.',
      action: 'Assign owners and define mitigation plans.',
    })
  }

  return decisions
}
