export type BoardBriefing = {
  companyStatus: string
  achievements: string[]
  risks: string[]
  opportunities: string[]
  decisionsRequired: string[]
  questionsToPrepare: string[]
}

export function generateBoardBriefing(input: {
  metrics: string[]
  risks: string[]
  opportunities: string[]
  decisions: string[]
}): BoardBriefing {
  return {
    companyStatus: 'Executive intelligence summary generated from company data.',
    achievements: input.metrics,
    risks: input.risks,
    opportunities: input.opportunities,
    decisionsRequired: input.decisions,
    questionsToPrepare: [
      'What changed since the last board review?',
      'Which strategic risks require attention?',
      'What decisions need board approval?',
    ],
  }
}
