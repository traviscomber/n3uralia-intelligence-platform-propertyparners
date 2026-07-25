export type ExecutiveResponse = {
  summary: string
  facts: string[]
  inferences: string[]
  recommendations: string[]
  risks: string[]
  confidence: number
  sources: string[]
}

export type N3uraliaExecutiveResponse = ExecutiveResponse & {
  header: {
    engine: 'N3uralia Intelligence'
    role: 'Executive Decision Support'
    processingTime: string
  }
  methodology: {
    domainsCovered: string[]
    evidenceCount: number
    principlesApplied: string[]
  }
  structure: {
    factsCount: number
    inferencesCount: number
    recommendationsCount: number
    risksCount: number
  }
}

export function applyExecutiveResponseGuard(input: ExecutiveResponse): N3uraliaExecutiveResponse {
  return {
    ...input,
    header: {
      engine: 'N3uralia Intelligence',
      role: 'Executive Decision Support',
      processingTime: new Date().toISOString(),
    },
    methodology: {
      domainsCovered: ['CRM', 'Market', 'Valuation', 'Compliance', 'Operations'],
      evidenceCount: input.facts.length,
      principlesApplied: [
        'Mantener tono profesional y ejecutivo',
        'No emitir juicios personales',
        'Separar hechos de interpretaciones',
        'No presentar hipótesis como certezas',
        'Mostrar evidencia y nivel de confianza',
        'Responder con respeto y precisión',
      ],
    },
    structure: {
      factsCount: input.facts.length,
      inferencesCount: input.inferences.length,
      recommendationsCount: input.recommendations.length,
      risksCount: input.risks.length,
    },
  }
}
