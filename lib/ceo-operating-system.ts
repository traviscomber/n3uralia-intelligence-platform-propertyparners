import { generateMorningBriefing } from './morning-executive-briefing'
import { prepareMeetingIntelligence } from './executive-calendar-intelligence'
import { runCEOIntelligenceAgent } from './ceo-intelligence-agent'

export async function runCEOOperatingSystem(input: {
  question: string
  evidence: any[]
  decisions: string[]
  risks: string[]
  opportunities: string[]
  meetings: string[]
}) {
  return {
    identity: 'CEO Operating System',
    briefing: generateMorningBriefing({
      changes: input.evidence.map(String),
      risks: input.risks,
      opportunities: input.opportunities,
      decisions: input.decisions,
    }),
    meetings: input.meetings.map((meeting) =>
      prepareMeetingIntelligence({
        meeting,
        context: ['CEO strategic context'],
        relevantData: input.evidence.map(String),
        decisions: input.decisions,
      })
    ),
    intelligence: await runCEOIntelligenceAgent({
      question: input.question,
      evidence: input.evidence,
      decisions: input.decisions,
      risks: input.risks,
      opportunities: input.opportunities,
      memory: { events: [] },
    }),
  }
}
