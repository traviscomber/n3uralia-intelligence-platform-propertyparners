export type AutonomousAction = {
  trigger: string
  analysis: string
  recommendation: string
  requiresApproval: boolean
}

export function generateAutonomousActions(input: {
  risks: string[]
  opportunities: string[]
  confidence: number
}): AutonomousAction[] {
  const actions: AutonomousAction[] = []

  for (const risk of input.risks) {
    actions.push({
      trigger: risk,
      analysis: 'Risk detected by N3uralia intelligence layers.',
      recommendation: 'Generate mitigation workflow and notify responsible role.',
      requiresApproval: true,
    })
  }

  for (const opportunity of input.opportunities) {
    actions.push({
      trigger: opportunity,
      analysis: `Opportunity detected with ${input.confidence}% confidence.`,
      recommendation: 'Prepare executive action proposal.',
      requiresApproval: true,
    })
  }

  return actions
}
