export type ExecutiveAgentTask = {
  objective: string
  priority: 'high' | 'medium' | 'low'
  reasoning: string
  action: string
}

export function runExecutiveAgent(input: {
  confidence: number
  recommendations: string[]
  risks: string[]
}): ExecutiveAgentTask[] {
  const tasks: ExecutiveAgentTask[] = []

  for (const recommendation of input.recommendations) {
    tasks.push({
      objective: recommendation,
      priority: input.confidence >= 75 ? 'high' : 'medium',
      reasoning: `Generated from executive reasoning confidence ${input.confidence}%.`,
      action: 'Prepare executive workflow and review evidence.',
    })
  }

  for (const risk of input.risks) {
    tasks.push({
      objective: risk,
      priority: 'high',
      reasoning: 'Risk detected by intelligence layer.',
      action: 'Create mitigation plan.',
    })
  }

  return tasks
}
