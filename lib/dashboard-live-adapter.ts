import { createLiveIntelligenceQueries } from './supabase-live-intelligence'
import { normalizeIntelligenceData } from './data-intelligence-layer'

export async function getLiveDashboardData() {
  const queries = createLiveIntelligenceQueries()

  const [portfolio, sales, evidence, decisions, marketSignals] = await Promise.all([
    queries.portfolio(),
    queries.sales(),
    queries.evidence(),
    queries.decisions(),
    queries.marketSignals(),
  ])

  return normalizeIntelligenceData({
    portfolio: portfolio.data,
    evidence: evidence.data,
    decisions: decisions.data,
    marketSignals: marketSignals.data,
  })
}
