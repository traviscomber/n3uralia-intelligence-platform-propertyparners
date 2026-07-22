import presentationData from '@/data/presentations-2026.json'

export type PresentationComparisonStatus = 'exact' | 'different' | 'not_comparable'

export type PresentationComparison = {
  scope: string
  metric: string
  period: string
  presentation: number
  comparison: number | null
  delta: number | null
  status: PresentationComparisonStatus
  presentationSource: { deck: string; slide: number; title: string }
  comparisonSource: string
}

export type ManagementEntity = {
  name: string
  branch: string | null
  slideRange: number[]
  salesSummary: {
    source: { deck: string; slide: number; title: string }
    currentSalesCount: number
    currentSalesUf: number
    cumulativeSalesCount: number
    cumulativeSalesUf: number
  }
  scores: {
    management: number | null
    portfolio: number | null
    followUp: number | null
    conversion: number | null
    classification: string | null
  }
  indicators: {
    stock: number | null
    requirements: number | null
    activeLeads: number | null
    classifiedLeads: number | null
    stale90Leads: number | null
    realizedVisits: number | null
    scheduledVisits: number | null
  }
}

export function getPresentations2026() {
  return presentationData
}

export function getPresentationComparisons(status?: PresentationComparisonStatus) {
  const comparisons = presentationData.reconciliation.comparisons as PresentationComparison[]
  return status ? comparisons.filter((item) => item.status === status) : comparisons
}

export function getManagementEntities() {
  return {
    company: presentationData.management.company as ManagementEntity,
    branches: presentationData.management.branches as ManagementEntity[],
    partners: presentationData.management.partners as ManagementEntity[],
  }
}
