export type IntelligenceDataSnapshot = {
  portfolio: unknown
  evidence: unknown[]
  decisions: unknown[]
  marketSignals: unknown[]
}

export async function fetchIntelligenceSnapshot(): Promise<IntelligenceDataSnapshot> {
  return {
    portfolio: {
      source: 'supabase',
      status: 'ready',
    },
    evidence: [],
    decisions: [],
    marketSignals: [],
  }
}

export function normalizeIntelligenceData(input: IntelligenceDataSnapshot) {
  return {
    portfolio: input.portfolio,
    evidenceCount: input.evidence.length,
    decisionCount: input.decisions.length,
    marketSignalCount: input.marketSignals.length,
  }
}
