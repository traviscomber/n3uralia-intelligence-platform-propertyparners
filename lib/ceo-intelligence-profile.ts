export type CEOProfile = {
  name: string
  priorities: string[]
  preferredMetrics: string[]
  communicationStyle: string
  boardReportStyle: string
}

export const pedroPabloFerrerProfile: CEOProfile = {
  name: 'Pedro Pablo Ferrer',
  priorities: [
    'company performance',
    'strategic growth',
    'market intelligence',
    'risk management',
    'board preparation',
  ],
  preferredMetrics: [
    'revenue performance',
    'portfolio health',
    'pipeline quality',
    'forecast accuracy',
  ],
  communicationStyle:
    'Precise, executive, humanized and evidence-based.',
  boardReportStyle:
    'Strategic narrative supported by data, evidence and clear decisions.',
}

export function getCEOProfile() {
  return pedroPabloFerrerProfile
}
