import type { OperatingProfile, NextActionCondition } from '@/lib/platform/operating-profile'

export type NextBestActionContext = {
  portfolioTotal: number
  portfolioAttentionCount: number
  pendingIdentityCount: number
  staleAssignmentsCount: number
  valuationReviewCount: number
  valuationDraftCount: number
  marketAvailable: boolean
}

export type NextBestAction = {
  id: string
  title: string
  domain: 'management' | 'market' | 'portfolio' | 'valuation' | 'documents' | 'contacts' | 'administration'
  href: string
  priority: 'high' | 'medium' | 'low'
  mode: 'proactive'
  source: 'operating-profile'
}

function conditionMatches(condition: NextActionCondition, context: NextBestActionContext) {
  const hasValuationWork = context.valuationReviewCount > 0 || context.valuationDraftCount > 0
  const hasDataGaps = context.pendingIdentityCount > 0 || context.staleAssignmentsCount > 0 || context.portfolioAttentionCount > 0

  if (condition === 'always') return true
  if (condition === 'has-portfolio') return context.portfolioTotal > 0
  if (condition === 'no-portfolio') return context.portfolioTotal === 0
  if (condition === 'has-portfolio-attention') return context.portfolioAttentionCount > 0
  if (condition === 'has-valuation-work') return hasValuationWork
  if (condition === 'no-valuation-work') return !hasValuationWork
  if (condition === 'has-valuation-review') return context.valuationReviewCount > 0
  if (condition === 'no-valuation-review') return context.valuationReviewCount === 0
  if (condition === 'has-data-gaps') return hasDataGaps
  if (condition === 'market-available') return context.marketAvailable
  return false
}

const priorityRank = { high: 0, medium: 1, low: 2 } as const

export function buildNextBestActions(
  profile: OperatingProfile,
  role: string,
  context: NextBestActionContext,
): NextBestAction[] {
  const roleProfile = profile.roles[role as keyof typeof profile.roles]
  if (!roleProfile) return []

  return roleProfile.proactiveActions
    .filter((action) => conditionMatches(action.condition, context))
    .map((action, index) => ({ action, index }))
    .sort((a, b) => priorityRank[a.action.priority] - priorityRank[b.action.priority] || a.index - b.index)
    .slice(0, profile.assistant.maxProactiveActions)
    .map(({ action }) => ({
      id: action.id,
      title: action.title,
      domain: action.domain,
      href: action.href,
      priority: action.priority,
      mode: 'proactive' as const,
      source: 'operating-profile' as const,
    }))
}
