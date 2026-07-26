export type StrategicConversation = {
  topic: string
  concern?: string
  decisionContext?: string
  insights: string[]
  followUp?: string
  createdAt: string
}

export function saveStrategicConversation(input: {
  topic: string
  concern?: string
  decisionContext?: string
  insights: string[]
  followUp?: string
}): StrategicConversation {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export function retrieveConversationContext(
  conversations: StrategicConversation[],
  topic: string
) {
  return conversations.filter((conversation) =>
    conversation.topic.toLowerCase().includes(topic.toLowerCase())
  )
}
