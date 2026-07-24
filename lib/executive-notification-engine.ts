export type ExecutiveNotificationPriority =
  | 'informational'
  | 'attention'
  | 'important'
  | 'critical'

export type ExecutiveNotification = {
  title: string
  priority: ExecutiveNotificationPriority
  reason: string
  evidence: string[]
  confidence: number
}

export function createExecutiveNotification(input: {
  title: string
  impact: 'low' | 'medium' | 'high'
  evidence: string[]
  confidence: number
}): ExecutiveNotification {
  const priority: ExecutiveNotificationPriority =
    input.impact === 'high' && input.confidence >= 85
      ? 'critical'
      : input.impact === 'high'
        ? 'important'
        : input.impact === 'medium'
          ? 'attention'
          : 'informational'

  return {
    title: input.title,
    priority,
    reason:
      'Notification generated only when evidence and impact justify executive attention.',
    evidence: input.evidence,
    confidence: input.confidence,
  }
}
