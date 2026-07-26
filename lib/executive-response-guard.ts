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
    sourceCount: number
    traceability: 'complete' | 'partial' | 'unavailable'
    validationWarnings: string[]
    principlesApplied: string[]
  }
}

function cleanStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  )
}

function clampConfidence(confidence: number, evidenceCount: number, sourceCount: number): number {
  const normalized = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0

  if (evidenceCount === 0) return 0
  if (sourceCount === 0) return Math.min(normalized, 0.35)
  if (evidenceCount <= 2) return Math.min(normalized, 0.4)
  if (evidenceCount <= 4) return Math.min(normalized, 0.55)
  if (evidenceCount <= 9 || sourceCount === 1) return Math.min(normalized, 0.7)

  return Math.min(normalized, 0.9)
}

function confidenceLabel(score: number): 'Alta' | 'Media' | 'Baja' {
  return score >= 0.75 ? 'Alta' : score >= 0.5 ? 'Media' : 'Baja'
}

export function applyExecutiveResponseGuard(input: ExecutiveResponse): N3uraliaExecutiveResponse {
  const facts = cleanStrings(input.facts)
  const inferences = cleanStrings(input.inferences)
  const risks = cleanStrings(input.risks)
  const sources = cleanStrings(input.sources)
  const evidenceCount = facts.length
  const sourceCount = sources.length
  const confidence = clampConfidence(input.confidence, evidenceCount, sourceCount)
  const recommendations = evidenceCount > 0 ? cleanStrings(input.recommendations) : []
  const validationWarnings: string[] = []

  if (evidenceCount === 0) {
    validationWarnings.push('No hay evidencia verificable disponible para respaldar recomendaciones.')
  }
  if (sourceCount === 0) {
    validationWarnings.push('La evidencia no incluye fuentes trazables.')
  }
  if (input.confidence > confidence) {
    validationWarnings.push('El nivel de confianza fue reducido por cobertura o trazabilidad insuficiente.')
  }

  const providedSections = input.sections
  const evidenceSections = (providedSections?.evidenciaUtilizada ?? [])
    .map((section) => ({
      domain: section.domain.trim() || 'General',
      items: cleanStrings(section.items),
    }))
    .filter((section) => section.items.length > 0)

  const normalizedEvidenceSections = evidenceSections.length > 0
    ? evidenceSections
    : evidenceCount > 0
      ? [{ domain: 'General', items: facts }]
      : []

  const justification = evidenceCount === 0
    ? 'Sin evidencia disponible; no se emiten recomendaciones ejecutivas.'
    : sourceCount === 0
      ? `Se analizaron ${evidenceCount} registros, pero no existen fuentes trazables suficientes.`
      : `Basado en ${evidenceCount} registros de evidencia provenientes de ${sourceCount} fuente${sourceCount === 1 ? '' : 's'} trazable${sourceCount === 1 ? '' : 's'}.`

  const sections: ResponseSections = {
    resumenEjecutivo: providedSections?.resumenEjecutivo?.trim() || input.summary.trim(),
    senalesPrincipales: cleanStrings(providedSections?.senalesPrincipales ?? inferences),
    evidenciaUtilizada: normalizedEvidenceSections,
    riesgos: cleanStrings(providedSections?.riesgos ?? risks),
    oportunidades: evidenceCount > 0
      ? cleanStrings(providedSections?.oportunidades ?? recommendations)
      : [],
    nivelConfianza: {
      label: confidenceLabel(confidence),
      score: confidence,
      justificacion: justification,
    },
  }

  const domainsCovered = Array.from(
    new Set(normalizedEvidenceSections.map((section) => section.domain)),
  )

  return {
    ...input,
    facts,
    inferences,
    recommendations,
    risks,
    confidence,
    sources,
    sections,
    header: {
      engine: 'N3uralia Intelligence',
      role: 'Executive Decision Support',
      processingTime: new Date().toISOString(),
    },
    methodology: {
      domainsCovered,
      evidenceCount,
      sourceCount,
      traceability: evidenceCount === 0
        ? 'unavailable'
        : sourceCount > 0
          ? 'partial'
          : 'unavailable',
      validationWarnings,
      principlesApplied: [
        'Mantener tono profesional y ejecutivo',
        'No emitir juicios personales',
        'Separar hechos de interpretaciones',
        'No presentar hipótesis como certezas',
        'No recomendar acciones sin evidencia disponible',
        'Ajustar confianza según cobertura y trazabilidad',
        'Mostrar evidencia y nivel de confianza',
        'Responder con respeto y precisión',
      ],
    },
  }
}
