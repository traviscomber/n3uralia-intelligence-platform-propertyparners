export type IntelligenceEntity = {
  id: string
  createdAt?: string
}

export type IntelligenceClient = {
  getPortfolio: () => Promise<IntelligenceEntity[]>
  getEvidence: () => Promise<IntelligenceEntity[]>
  getDecisions: () => Promise<IntelligenceEntity[]>
  getMarketSignals: () => Promise<IntelligenceEntity[]>
}

export function createSupabaseIntelligenceClient(): IntelligenceClient {
  return {
    async getPortfolio() {
      return []
    },
    async getEvidence() {
      return []
    },
    async getDecisions() {
      return []
    },
    async getMarketSignals() {
      return []
    },
  }
}
