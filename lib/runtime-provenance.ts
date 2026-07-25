export type RuntimeProvenanceKind = 'audited' | 'live-separated' | 'pending'

export type RuntimeProvenanceEvidence = {
  kind: RuntimeProvenanceKind
  source: string
  observedAt: string
  cutoffLabel?: string
  evidenceId?: string
  details?: string
}

export function isRuntimeProvenanceEvidence(value: unknown): value is RuntimeProvenanceEvidence {
  if (!value || typeof value !== 'object') return false

  const evidence = value as Partial<RuntimeProvenanceEvidence>
  return (
    (evidence.kind === 'audited' || evidence.kind === 'live-separated' || evidence.kind === 'pending')
    && typeof evidence.source === 'string'
    && evidence.source.trim().length > 0
    && typeof evidence.observedAt === 'string'
    && !Number.isNaN(Date.parse(evidence.observedAt))
  )
}
