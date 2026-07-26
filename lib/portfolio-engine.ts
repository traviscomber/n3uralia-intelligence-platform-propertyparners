export type PortfolioSignal = {
  name: string
  value: number
  status: 'positive' | 'neutral' | 'risk'
}

export type PortfolioHealth = {
  score: number
  signals: PortfolioSignal[]
}

export function calculatePortfolioHealth(input: {
  salesVelocity: number
  inventoryPressure: number
  marketSignal: number
}) : PortfolioHealth {
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        input.salesVelocity * 0.4 +
        (100 - input.inventoryPressure) * 0.3 +
        input.marketSignal * 0.3
      )
    )
  )

  return {
    score,
    signals: [
      {
        name: 'Sales velocity',
        value: input.salesVelocity,
        status: input.salesVelocity >= 70 ? 'positive' : 'neutral',
      },
      {
        name: 'Inventory pressure',
        value: input.inventoryPressure,
        status: input.inventoryPressure >= 70 ? 'risk' : 'neutral',
      },
      {
        name: 'Market signal',
        value: input.marketSignal,
        status: input.marketSignal >= 70 ? 'positive' : 'neutral',
      },
    ],
  }
}
