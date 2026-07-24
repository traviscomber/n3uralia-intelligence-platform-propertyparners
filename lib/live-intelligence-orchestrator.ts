import { createLiveIntelligenceQueries } from './supabase-live-intelligence'
import { normalizeIntelligenceData } from './data-intelligence-layer'
import { orchestrateExecutiveIntelligence } from './intelligence-orchestrator'

export async function runLiveExecutiveIntelligence() {
  const queries = createLiveIntelligenceQueries()

  const [portfolio, sales, evidence, decisions, marketSignals] = await Promise.all([
    queries.portfolio(),
    queries.sales(),
    queries.evidence(),
    queries.decisions(),
    queries.marketSignals(),
  ])

  const snapshot = normalizeIntelligenceData({
    portfolio: portfolio.data,
    evidence: evidence.data,
    decisions: decisions.data,
    marketSignals: marketSignals.data,
  })

  return orchestrateExecutiveIntelligence({
    evidence: evidence.data.map((item, index) => ({
      id: String(index),
      source: 'supabase',
      statement: JSON.stringify(item),
      confidence: 70,
    })),
    forecastConfidence: 75,
    decisions: ['Review portfolio strategy'],
    risks: [],
  })
}
