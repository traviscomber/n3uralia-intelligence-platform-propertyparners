export type IntelligenceContext = {
  question: string
  requiredLayers: string[]
  reasoningMode: string
}

export function routeIntelligenceContext(question: string): IntelligenceContext {
  const normalized = question.toLowerCase()

  const layers: string[] = []

  if (normalized.includes('mercado')) {
    layers.push('market_intelligence', 'prediction', 'opportunity')
  }

  if (
    normalized.includes('riesgo') ||
    normalized.includes('problema')
  ) {
    layers.push('risk_intelligence', 'evidence')
  }

  if (
    normalized.includes('decisión') ||
    normalized.includes('estrategia')
  ) {
    layers.push(
      'scenario_simulator',
      'strategic_recommendation',
      'memory'
    )
  }

  if (layers.length === 0) {
    layers.push(
      'company_intelligence',
      'evidence',
      'memory',
      'reasoning'
    )
  }

  return {
    question,
    requiredLayers: layers,
    reasoningMode:
      'Select only the intelligence layers required for the executive question.',
  }
}
