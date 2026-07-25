export type ResponseSections = {
  resumenEjecutivo: string
  senalesPrincipales: string[]
  evidenciaUtilizada: { domain: string; items: string[] }[]
  riesgos: string[]
  oportunidades: string[]
  nivelConfianza: { label: 'Alta' | 'Media' | 'Baja'; score: number; justificacion: string }
}

export type ExecutiveResponse = {
  summary: string
  facts: string[]
  inferences: string[]
  recommendations: string[]
  risks: string[]
  confidence: number
  sources: string[]
  sections?: ResponseSections
}

export type N3uraliaExecutiveResponse = ExecutiveResponse & {
  sections: ResponseSections
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
}

export function applyExecutiveResponseGuard(input: ExecutiveResponse): N3uraliaExecutiveResponse {
  const defaultSections: ResponseSections = {
    resumenEjecutivo: input.summary,
    senalesPrincipales: input.inferences,
    evidenciaUtilizada: [{ domain: 'General', items: input.facts }],
    riesgos: input.risks,
    oportunidades: input.recommendations,
    nivelConfianza: {
      label: input.confidence >= 0.75 ? 'Alta' : input.confidence >= 0.5 ? 'Media' : 'Baja',
      score: input.confidence,
      justificacion: `Basado en ${input.facts.length} registros de evidencia.`,
    },
  }

  return {
    ...input,
    sections: input.sections ?? defaultSections,
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
  }
}
