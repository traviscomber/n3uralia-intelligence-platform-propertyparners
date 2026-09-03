export type CanonicalReportRecord = Record<string, unknown>
export type CanonicalReportDocumentMetadata = {
  docType?: string | null
  tags?: string[] | null
}

type SupportedReportType = 'n3uralia_client_canonical' | 'property_partners_ceo_intelligence'

function asRecord(value: unknown): CanonicalReportRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as CanonicalReportRecord
    : null
}

function readRecord(record: CanonicalReportRecord | null, key: string) {
  return record ? asRecord(record[key]) : null
}

function readString(record: CanonicalReportRecord | null, key: string, fallback = '') {
  return record && typeof record[key] === 'string' && String(record[key]).trim()
    ? String(record[key])
    : fallback
}

function readNumber(record: CanonicalReportRecord | null, key: string) {
  return record && typeof record[key] === 'number' && Number.isFinite(record[key] as number)
    ? Number(record[key])
    : null
}

function supportedReportType(parsed: CanonicalReportRecord | null): SupportedReportType | null {
  const reportType = readString(parsed, 'report_type')
  return reportType === 'n3uralia_client_canonical' || reportType === 'property_partners_ceo_intelligence'
    ? reportType
    : null
}

export function parseCanonicalReportContent(content: string) {
  try {
    return asRecord(JSON.parse(content))
  } catch {
    return null
  }
}

export function formatCanonicalReportPeriod(record: CanonicalReportRecord | null) {
  const period = readRecord(record, 'period')
  const start = readString(period, 'start')
  const end = readString(period, 'end')
  if (start && end && start !== end) return `${start} — ${end}`
  return start || end || 'Sin período'
}

export function canonicalReportKind(parsed: CanonicalReportRecord | null) {
  return supportedReportType(parsed) === 'property_partners_ceo_intelligence'
    ? 'CEO Intelligence'
    : supportedReportType(parsed) === 'n3uralia_client_canonical'
      ? 'Avance contractual'
      : 'Informe'
}

export function isCanonicalReportArtifactEligible(
  parsed: CanonicalReportRecord | null,
  metadata: CanonicalReportDocumentMetadata,
) {
  const canonicalMetadata = readRecord(parsed, 'canonical_metadata')
  const tags = metadata.tags ?? []
  const reportType = supportedReportType(parsed)

  return metadata.docType === 'report'
    && tags.includes('n3uralia-client-report')
    && tags.includes('canonical')
    && Boolean(reportType)
    && readString(parsed, 'standard_version') === '1.0'
    && Boolean(readString(parsed, 'title'))
    && Boolean(readString(parsed, 'executive_summary'))
    && Array.isArray(parsed?.sections)
    && readString(canonicalMetadata, 'source_policy') === 'canonical_input_only'
    && (reportType !== 'property_partners_ceo_intelligence' || tags.includes('ceo-intelligence-report'))
}

export function resolveCanonicalReportArtifactUrl(
  parsed: CanonicalReportRecord | null,
  type: 'pdf' | 'download',
  documentId: string,
  metadata: CanonicalReportDocumentMetadata = {},
) {
  const artifacts = readRecord(parsed, 'artifacts')
  const pdf = readRecord(artifacts, 'pdf')
  const keys = type === 'pdf'
    ? ['url', 'viewUrl', 'artifactUrl', 'path']
    : ['downloadUrl', 'url', 'artifactUrl', 'path']

  for (const key of keys) {
    const value = readString(pdf, key)
    if (value.startsWith('/') || value.startsWith('https://')) return value
  }

  if (!isCanonicalReportArtifactEligible(parsed, metadata)) return null
  const reportType = supportedReportType(parsed)
  const route = reportType === 'property_partners_ceo_intelligence' ? 'ceo-intelligence' : 'canonical-client'
  const base = `/api/management/reports/${route}/${encodeURIComponent(documentId)}/artifact`
  return type === 'pdf' ? `${base}?disposition=inline` : base
}

export function normalizeCanonicalReportStatus(parsed: CanonicalReportRecord | null, tags: string[] | null) {
  const delivery = readRecord(parsed, 'delivery')
  const raw = readString(delivery, 'status', tags?.includes('approved') ? 'approved' : 'draft')
  return ({
    draft: 'Borrador',
    review: 'En revisión',
    approved: 'Aprobado',
    sent: 'Enviado',
    resent: 'Reenviado',
    acknowledged: 'Acusado recibo',
    registered: 'Registrado',
  } as Record<string, string>)[raw.toLowerCase()] ?? raw
}

export function extractCanonicalReportTrace(parsed: CanonicalReportRecord | null) {
  const provenance = readRecord(parsed, 'provenance')
  const generation = readRecord(parsed, 'generation')
  const canonicalMetadata = readRecord(parsed, 'canonical_metadata')
  const sources = provenance?.sources
  const evidenceRefs = new Set<string>()
  const sections = parsed?.sections

  if (Array.isArray(sections)) {
    for (const section of sections) {
      const record = asRecord(section)
      const refs = record?.evidence_refs
      if (!Array.isArray(refs)) continue
      for (const ref of refs) {
        if (typeof ref === 'string' && ref.trim()) evidenceRefs.add(ref.trim())
      }
    }
  }

  return {
    sourceCount: Array.isArray(sources) ? sources.length : evidenceRefs.size,
    model: readString(generation, 'model') || readString(canonicalMetadata, 'model') || null,
    promptVersion:
      readString(generation, 'promptVersion')
      || readString(generation, 'prompt_version')
      || readString(canonicalMetadata, 'prompt_version')
      || readString(parsed, 'standard_version')
      || null,
    costUsd: readNumber(generation, 'costUsd') ?? readNumber(generation, 'cost_usd'),
  }
}
