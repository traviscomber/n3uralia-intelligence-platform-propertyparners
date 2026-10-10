/** Fail-closed release checks for Property Partners monthly reports.
 * A passed bundle check does not replace per-page visual inspection.
 */
export type Audience = 'ceo' | 'directoras' | 'partners'
export type AudienceArtifact = {
  audience: Audience
  filename: string
  bytes: Uint8Array
  reviewedPageCount: number
  pageCount: number
  canonicalCoverageVerified: boolean
  brandVerified: boolean
  accessScopeVerified: boolean
  visualInspectionVerified: boolean
}
export type MonthlyReportRelease = {
  period: string
  artifacts: AudienceArtifact[]
  reconciliationVerified: boolean
  evidenceVersion: string
}
const REQUIRED: Audience[] = ['ceo', 'directoras', 'partners']
export function verifyMonthlyReportRelease(value: MonthlyReportRelease): void {
  if (!/^\d{4}-\d{2}$/.test(value.period)) throw new Error('REPORT_INVALID_PERIOD')
  if (!value.evidenceVersion.trim()) throw new Error('REPORT_MISSING_EVIDENCE')
  if (!value.reconciliationVerified) throw new Error('REPORT_RECONCILIATION_NOT_VERIFIED')
  if (value.artifacts.length !== 3) throw new Error('REPORT_THREE_SEPARATE_ARTIFACTS_REQUIRED')
  const names = new Set<string>()
  const audiences = new Set<Audience>()
  for (const item of value.artifacts) {
    if (!REQUIRED.includes(item.audience) || audiences.has(item.audience)) throw new Error('REPORT_AUDIENCE_MISSING_OR_DUPLICATE')
    audiences.add(item.audience)
    if (!item.filename.toLowerCase().endsWith('.pdf') || names.has(item.filename)) throw new Error('REPORT_FILENAME_NOT_UNIQUE_PDF')
    names.add(item.filename)
    if (item.bytes.length < 1500 || item.bytes[0] !== 37 || item.bytes[1] !== 80 || item.bytes[2] !== 68 || item.bytes[3] !== 70) throw new Error('REPORT_INVALID_PDF')
    if (item.pageCount < 1 || item.reviewedPageCount !== item.pageCount) throw new Error('REPORT_VISUAL_REVIEW_INCOMPLETE')
    if (!item.canonicalCoverageVerified || !item.brandVerified || !item.accessScopeVerified || !item.visualInspectionVerified) throw new Error('REPORT_QUALITY_GATE_INCOMPLETE')
  }
}
