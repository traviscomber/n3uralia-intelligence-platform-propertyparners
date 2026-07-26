export type CEODailyBriefing = {
  summary: string
  changesSinceYesterday: string[]
  attentionRequired: string[]
  opportunities: string[]
  risks: string[]
  decisionsToConsider: string[]
  questionsToAsk: string[]
}

export function generateCEODailyBriefing(input: {
  changes: string[]
  risks: string[]
  opportunities: string[]
  decisions: string[]
}) : CEODailyBriefing {
  return {
    summary:
      'Daily CEO intelligence briefing generated from current company context and strategic intelligence layers.',
    changesSinceYesterday: input.changes,
    attentionRequired: [
      'Review signals with strategic impact before action.',
    ],
    opportunities: input.opportunities,
    risks: input.risks,
    decisionsToConsider: input.decisions,
    questionsToAsk: [
      'What changed that matters?',
      'What am I not seeing?',
      'What decision should receive attention today?',
    ],
  }
}
