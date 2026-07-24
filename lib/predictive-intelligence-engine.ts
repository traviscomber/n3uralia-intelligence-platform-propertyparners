export type Prediction = {
  signal: string
  forecast: string
  confidence: number
  factors: string[]
}

export function generatePrediction(input: {
  signals: string[]
  historicalPatterns: string[]
  confidence: number
}) : Prediction {
  return {
    signal: input.signals[0] || 'No dominant signal detected',
    forecast:
      'Future scenario generated from available company signals and historical patterns.',
    confidence: input.confidence,
    factors: [
      ...input.signals,
      ...input.historicalPatterns,
    ],
  }
}
