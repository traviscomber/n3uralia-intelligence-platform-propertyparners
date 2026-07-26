import { validateTraceability } from './traceability-validator'

export type ResponseSections = {
  resumenEjecutivo: string
  senalesPrincipales: string[]
  evidenciaUtilizada: { domain: string; items: string[] }[]
  riesgos: string[]
  oportunidades: string[]
  nivelConfianza: { label: 'Alta' | 'Media' | 'Baja'; score: number; justificacion: string }
}

export type TraceableClaim = {
  statement: string
  evidenceIds: string[]
  confidence: number
}

export type ExecutiveResponse = {
  summary: string
  facts: string[]
  inferences: string[]
  recommendations: string[]
  risks: string[]
  confidence: number
  sources: string[]
  evidenceIds?: string[]
  claims?: TraceableClaim[]
  sections?: ResponseSections
}

export type N3uraliaExecutiveResponse = ExecutiveResponse & {
  claims: TraceableClaim[]
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
    claimCount: number
    supportedClaimCount: number
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

function normalizeConfidence(confidence: number): number {
  return Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0
}

function clampConfidence(
  confidence: number,
  evidenceCount: number,
  sourceCount: number,
  supportedClaimCount: number,
  claimCount: number,
): number {
  const normalized = normalizeConfidence(confidence)

  if (evidenceCount === 0 || supportedClaimCount === 0) return 0
  if (sourceCount === 0) return Math.min(normalized, 0.35)
  if (supportedClaimCount < claimCount) return Math.min(normalized, 0.5)
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
  const risks = cleanStrings(input.risks)
  const sources = cleanStrings(input.sources)
  const validEvidenceIds = cleanStrings(input.evidenceIds ?? [])
  const evidenceCount = validEvidenceIds.length > 0 ? validEvidenceIds.length : facts.length
  const sourceCount = sources.length
  const traceabilityValidation = validateTraceability({
    claims: input.claims ?? input.inferences.map((statement) => ({
      statement,
      evidenceIds: [],
      confidence: input.confidence,
    })),
    validEvidenceIds,
    hasEvidence: evidenceCount > 0,
    hasTraceableSources: sourceCount > 0,
  })
  const supportedClaims = traceabilityValidation.claims
  const validationWarnings = [...traceabilityValidation.warnings]

  const confidence = clampConfidence(
    input.confidence,
    evidenceCount,
    sourceCount,
    traceabilityValidation.supportedClaimCount,
    traceabilityValidation.claimCount,
  )
  if (input.confidence > confidence) {
    validationWarnings.push('El nivel de confianza fue reducido por cobertura o trazabilidad insuficiente.')
  }

  const inferences = supportedClaims.map((claim) => claim.statement)
  const recommendations = evidenceCount > 0 && supportedClaims.length > 0
    ? cleanStrings(input.recommendations)
    : []

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
    : supportedClaims.length === 0
      ? 'No existen afirmaciones con evidencia asociada; no se emiten recomendaciones ejecutivas.'
      : sourceCount === 0
        ? `Se validaron ${supportedClaims.length} afirmaciones, pero no existen fuentes trazables suficientes.`
        : `Basado en ${evidenceCount} registros y ${supportedClaims.length} afirmación${supportedClaims.length === 1 ? '' : 'es'} con evidencia trazable.`

  const sections: ResponseSections = {
    resumenEjecutivo: providedSections?.resumenEjecutivo?.trim() || input.summary.trim(),
    senalesPrincipales: inferences,
    evidenciaUtilizada: normalizedEvidenceSections,
    riesgos: cleanStrings(providedSections?.riesgos ?? risks),
    oportunidades: recommendations,
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
    claims: supportedClaims,
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
      claimCount: traceabilityValidation.claimCount,
      supportedClaimCount: traceabilityValidation.supportedClaimCount,
      traceability: traceabilityValidation.traceability,
      validationWarnings,
      principlesApplied: [
        'Mantener tono profesional y ejecutivo',
        'No emitir juicios personales',
        'Separar hechos de interpretaciones',
        'No presentar hipótesis como certezas',
        'No recomendar acciones sin evidencia disponible',
        'Excluir afirmaciones sin evidencia asociada',
        'Ajustar confianza según cobertura y trazabilidad',
        'Mostrar evidencia y nivel de confianza',
        'Responder con respeto y precisión',
      ],
    },
  }
}
