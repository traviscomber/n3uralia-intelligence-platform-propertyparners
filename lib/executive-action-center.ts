export type ExecutiveAction = {
  title: string
  source: 'risk' | 'opportunity' | 'decision'
  evidence: string[]
  nextSteps: string[]
  requiresApproval: boolean
}

export function createExecutiveAction(input: {
  title: string
  source: 'risk' | 'opportunity' | 'decision'
  evidence: string[]
  strategicImpact: boolean
}): ExecutiveAction {
  return {
    title: input.title,
    source: input.source,
    evidence: input.evidence,
    nextSteps: [
      'Review intelligence context.',
      'Evaluate alternatives.',
      'Approve or assign action.',
    ],
    requiresApproval: input.strategicImpact,
  }
}
