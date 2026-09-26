export type DecisionTraceEvidenceStatus =
  | 'approved_live'
  | 'verified_live'
  | 'documentary_canonical'
  | 'external_market'
  | 'n3uralia_provisional'
  | 'missing'
  | 'non_evaluable'

export type DecisionTraceSeverity = 'critical' | 'warning' | 'info'
export type DecisionTraceConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type DecisionTraceItem = {
  id: string
  domain: 'executive' | 'crm' | 'market' | 'valuation' | 'reports'
  title: string
  evidenceStatus: DecisionTraceEvidenceStatus
  evidenceLabel: string
  source: string
  sourceReference?: string | null
  cutoff?: string | null
  ruleId?: string | null
  ruleVersion?: string | null
  ruleOrigin?: 'n3uralia_provisional' | 'client_approved' | 'canonical_methodology' | null
  severity: DecisionTraceSeverity
  confidence: DecisionTraceConfidence
  action?: string | null
  href?: string | null
  evidenceCount?: number | null
}

export function decisionTraceStatusLabel(status: DecisionTraceEvidenceStatus) {
  const labels: Record<DecisionTraceEvidenceStatus, string> = {
    approved_live: 'Evidencia viva aprobada',
    verified_live: 'Evidencia viva verificada',
    documentary_canonical: 'Evidencia documental canónica',
    external_market: 'Mercado externo',
    n3uralia_provisional: 'Regla N3uralia provisional',
    missing: 'Evidencia faltante',
    non_evaluable: 'No evaluable',
  }
  return labels[status]
}
