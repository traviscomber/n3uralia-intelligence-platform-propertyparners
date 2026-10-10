/** Semantic validation for the audited monthly audience reporting snapshot.
 * Do not aggregate stocks, leads or activity across offices: source universes can differ.
 */
export type ReportMetric = {
  id: string
  label: string
  value: number | null
  status: string
  evidenceRefs?: string[]
}
export type ReportEvidence = { id: string; status: string; source?: string }
export type AudienceSnapshot = {
  period: { start: string; end: string }
  evidence: ReportEvidence[]
  metrics: ReportMetric[]
}
export type ReconciliationResult = {
  period: string
  netClosures: number
  netUf: number
  officeClosures: number
  officeUf: number
}
const OFFICES = ['Santa María', 'Nueva Costanera', 'Lo Beltrán'] as const
const COMPANY = 'Property Partners Vitacura'
export function verifyAudienceSnapshot(snapshot: AudienceSnapshot): ReconciliationResult {
  const { start, end } = snapshot.period ?? {}
  if (!/^\d{4}-\d{2}-01$/.test(start ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(end ?? '') || start.slice(0, 7) !== end.slice(0, 7)) throw new Error('REPORT_SNAPSHOT_PERIOD_INVALID')
  const evidence = new Map(snapshot.evidence.map(e => [e.id, e]))
  if (evidence.size !== snapshot.evidence.length) throw new Error('REPORT_DUPLICATE_EVIDENCE')
  const metrics = new Map<string, ReportMetric>()
  for (const metric of snapshot.metrics) {
    if (metrics.has(metric.id)) throw new Error('REPORT_DUPLICATE_METRIC')
    metrics.set(metric.id, metric)
    if (metric.status !== 'verified' || !Number.isFinite(metric.value) || !metric.evidenceRefs?.length) throw new Error('REPORT_METRIC_NOT_VERIFIED')
    for (const ref of metric.evidenceRefs) {
      const ev = evidence.get(ref)
      if (!ev || ev.status !== 'verified' || !ev.source?.includes('sha256=')) throw new Error('REPORT_EVIDENCE_INVALID')
    }
  }
  const number = (entity: string, metric: 'sales' | 'sales_uf') => {
    const record = metrics.get(`${entity}_${metric}`)
    if (!record || record.label !== metric || record.status !== 'verified') throw new Error('REPORT_CLOSURE_METRIC_MISSING')
    return record.value as number
  }
  const netClosures = number(COMPANY, 'sales')
  const netUf = number(COMPANY, 'sales_uf')
  const officeClosures = OFFICES.reduce((sum, office) => sum + number(office, 'sales'), 0)
  const officeUf = OFFICES.reduce((sum, office) => sum + number(office, 'sales_uf'), 0)
  if (netClosures !== officeClosures || netUf !== officeUf) throw new Error('REPORT_OFFICE_CLOSURE_RECONCILIATION_FAILED')
  return { period: start.slice(0, 7), netClosures, netUf, officeClosures, officeUf }
}
