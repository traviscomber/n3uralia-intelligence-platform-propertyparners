export type CEOFeedItem = {
  title: string
  type: 'prioridad' | 'riesgo' | 'oportunidad' | 'decision'
  summary: string
  confidence: number
  sources: string[]
}

export function buildCEOIntelligenceFeed(input: {
  priorities: CEOFeedItem[]
  risks: CEOFeedItem[]
  opportunities: CEOFeedItem[]
  decisions: CEOFeedItem[]
}) {
  return {
    sections: [
      {
        title: 'Lo más importante hoy',
        items: input.priorities,
      },
      {
        title: 'Riesgos',
        items: input.risks,
      },
      {
        title: 'Oportunidades',
        items: input.opportunities,
      },
      {
        title: 'Decisiones pendientes',
        items: input.decisions,
      },
    ],
    principle:
      'El dashboard CEO muestra contexto y decisiones, no exceso de métricas.',
  }
}
