export type ValuationInsight = {
  propertyId: string
  valuationSignals: string[]
  marketContext: string[]
  confidence: number
  risks: string[]
}

export function generateValuationInsight(input: {
  propertyId: string
  valuationSignals: string[]
  marketContext: string[]
  confidence: number
}): ValuationInsight {
  return {
    propertyId: input.propertyId,
    valuationSignals: input.valuationSignals,
    marketContext: input.marketContext,
    confidence: input.confidence,
    risks: [
      'Validate valuation against current market evidence.',
    ],
  }
}
