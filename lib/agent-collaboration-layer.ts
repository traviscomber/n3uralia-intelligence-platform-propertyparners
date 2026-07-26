export type AgentMessage = {
  from: string
  to: string
  context: string
  findings: string[]
  confidence: number
}

export type CollaborationFlow = {
  objective: string
  messages: AgentMessage[]
  sharedContext: string[]
}

export function createAgentMessage(input: AgentMessage) {
  return input
}

export function coordinateAgents(input: {
  objective: string
  messages: AgentMessage[]
}): CollaborationFlow {
  return {
    objective: input.objective,
    messages: input.messages,
    sharedContext: input.messages.flatMap(
      (message) => message.findings
    ),
  }
}
