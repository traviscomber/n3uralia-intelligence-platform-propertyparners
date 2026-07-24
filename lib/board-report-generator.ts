import { getCEOProfile } from './ceo-intelligence-profile'
import { createExecutiveMessage } from './executive-communication-engine'

export function generateBoardReport(input: {
  facts: string[]
  risks: string[]
  opportunities: string[]
  decisions: string[]
  confidence: number
}) {
  const ceo = getCEOProfile()

  return {
    audience: 'board_director',
    preparedFor: ceo.name,
    style: ceo.boardReportStyle,
    sections: {
      situation: input.facts,
      risks: input.risks,
      opportunities: input.opportunities,
      decisions: input.decisions,
    },
    executiveMessage: createExecutiveMessage({
      summary: 'Board report generated with CEO perspective.',
      evidence: input.facts,
      confidence: input.confidence,
      recommendation: 'Review strategic options and approve required decisions.',
    }),
  }
}
