export type CeoIntelligenceDocumentCandidate = {
  id: string
  title: string
  created_at: string
  tags: string[] | null
  content: string | null
}

const NON_REUSABLE_TAGS = new Set(['reportin-test', 'qa', 'mock', 'demo', 'fixture', 'superseded'])

export function isReusableCeoIntelligenceDocument(
  document: CeoIntelligenceDocumentCandidate,
  sourceSnapshotId: string,
) {
  if ((document.tags || []).some((tag) => NON_REUSABLE_TAGS.has(tag))) return false
  if (!document.content) return false

  try {
    const parsed = JSON.parse(document.content) as {
      report_type?: unknown
      source_snapshot_id?: unknown
    }
    return parsed.report_type === 'property_partners_ceo_intelligence'
      && parsed.source_snapshot_id === sourceSnapshotId
  } catch {
    return false
  }
}
