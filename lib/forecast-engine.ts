export type ForecastWindow = '30d' | '60d' | '90d'

export type ForecastResult = {
  window: ForecastWindow
  confidence: number
  opportunities: string[]
  risks: string[]
  recommendedActions: string[]
}

export function buildExecutiveForecast(input: {
  portfolioHealth: number
  salesVelocity: number
  inventoryPressure: number
}): ForecastResult[] {
  const confidence = Math.max(
    0,
    Math.min(100, Math.round((input.portfolioHealth + input.salesVelocity) / 2))
  )

  return [
    {
      window: '30d',
      confidence,
      opportunities: [
        'Prioritize active opportunities with highest conversion probability',
      ],
      risks: [
        input.inventoryPressure > 70
          ? 'High inventory pressure requires intervention'
          : 'Monitor inventory evolution',
      ],
      recommendedActions: [
        'Review priority assets and executive pipeline',
      ],
    },
    {
      window: '60d',
      confidence: Math.max(0, confidence - 5),
      opportunities: ['Expand strategic opportunities based on market signals'],
      risks: ['Validate trend persistence with new evidence'],
      recommendedActions: ['Adjust portfolio strategy'],
    },
    {
      window: '90d',
      confidence: Math.max(0, confidence - 10),
      opportunities: ['Prepare board-level strategic decisions'],
      risks: ['Long-term market uncertainty'],
      recommendedActions: ['Generate executive scenario planning'],
    },
  ]
}
