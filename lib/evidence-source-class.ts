export const EVIDENCE_SOURCE_CLASSES = [
  'client_evidence',
  'external_evidence',
  'system_extraction',
  'deterministic_calculation',
  'model_inference',
  'executive_recommendation',
] as const

export type EvidenceSourceClass = (typeof EVIDENCE_SOURCE_CLASSES)[number]

export function isEvidenceSourceClass(value: unknown): value is EvidenceSourceClass {
  return typeof value === 'string' && EVIDENCE_SOURCE_CLASSES.includes(value as EvidenceSourceClass)
}
