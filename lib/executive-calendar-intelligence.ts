export type CalendarIntelligence = {
  meeting: string
  context: string[]
  relevantData: string[]
  suggestedQuestions: string[]
  expectedDecisions: string[]
}

export function prepareMeetingIntelligence(input: {
  meeting: string
  context: string[]
  relevantData: string[]
  decisions: string[]
}): CalendarIntelligence {
  return {
    meeting: input.meeting,
    context: input.context,
    relevantData: input.relevantData,
    suggestedQuestions: [
      'What changed since the last review?',
      'What evidence supports the current position?',
      'What decision is required?',
    ],
    expectedDecisions: input.decisions,
  }
}
