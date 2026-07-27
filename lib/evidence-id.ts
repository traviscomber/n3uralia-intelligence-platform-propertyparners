export type EvidenceIdPart = string | number | boolean | null | undefined

export function normalizeEvidenceIdPart(value: EvidenceIdPart): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

export function buildEvidenceId(...parts: EvidenceIdPart[]): string {
  if (parts.length === 0) {
    throw new Error('buildEvidenceId requires at least one identifier part')
  }

  return parts.map(normalizeEvidenceIdPart).join(':')
}
