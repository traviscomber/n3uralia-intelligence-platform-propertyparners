export type TraceabilityStatus = 'complete' | 'partial' | 'unavailable'

export type TraceabilityClaim = {
  statement: string
  evidenceIds: string[]
  confidence: number
}

export type TraceabilityValidationResult = {
  claims: TraceabilityClaim[]
  claimCount: number
  supportedClaimCount: number
  unsupportedClaimCount: number
  traceability: TraceabilityStatus
  warnings: string[]
}

function cleanStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  )
}

function normalizeConfidence(confidence: number): number {
  return Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0
}

export function validateTraceability(input: {
  claims: TraceabilityClaim[]
  validEvidenceIds: string[]
  hasTraceableSources: boolean
}): TraceabilityValidationResult {
  const validEvidenceIds = new Set(cleanStrings(input.validEvidenceIds))
  const normalizedClaims = input.claims
    .map((claim) => ({
      statement: claim.statement.trim(),
      evidenceIds: cleanStrings(claim.evidenceIds).filter((id) => validEvidenceIds.has(id)),
      confidence: normalizeConfidence(claim.confidence),
    }))
    .filter((claim) => claim.statement.length > 0)

  const claims = normalizedClaims.filter((claim) => claim.evidenceIds.length > 0)
  const unsupportedClaimCount = normalizedClaims.length - claims.length
  const warnings: string[] = []

  if (validEvidenceIds.size === 0) {
    warnings.push('No hay evidencia verificable disponible para respaldar recomendaciones.')
  }

  if (!input.hasTraceableSources) {
    warnings.push('La evidencia no incluye fuentes trazables.')
  }

  if (unsupportedClaimCount > 0) {
    warnings.push(
      `${unsupportedClaimCount} afirmación${unsupportedClaimCount === 1 ? '' : 'es'} sin evidencia asociada fue${unsupportedClaimCount === 1 ? '' : 'ron'} excluida${unsupportedClaimCount === 1 ? '' : 's'}.`,
    )
  }

  const traceability: TraceabilityStatus = validEvidenceIds.size === 0 || claims.length === 0
    ? 'unavailable'
    : claims.length === normalizedClaims.length && input.hasTraceableSources
      ? 'complete'
      : 'partial'

  return {
    claims,
    claimCount: normalizedClaims.length,
    supportedClaimCount: claims.length,
    unsupportedClaimCount,
    traceability,
    warnings,
  }
}
