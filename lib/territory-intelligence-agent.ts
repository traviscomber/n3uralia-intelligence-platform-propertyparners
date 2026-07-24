export type TerritoryInsight = {
  zone: string
  marketSignals: string[]
  opportunities: string[]
  risks: string[]
}

export function analyzeTerritory(input: {
  zone: string
  marketSignals: string[]
}): TerritoryInsight {
  return {
    zone: input.zone,
    marketSignals: input.marketSignals,
    opportunities: [
      'Detect opportunities using territory and market evidence.',
    ],
    risks: [
      'Validate territory assumptions with current evidence.',
    ],
  }
}
