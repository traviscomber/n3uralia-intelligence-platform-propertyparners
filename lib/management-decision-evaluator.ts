import 'server-only'

import { getOperationalSummary } from '@/lib/crm-snapshot'
import { MANAGEMENT_DECISION_POLICY, type ManagementDecisionRule } from '@/lib/management-decision-policy'

export type GovernedDecisionSignal = {
  ruleId: string
  metric: string
  label: string
  severity: 'high' | 'medium'
  value: number
  threshold: number
  operator: ManagementDecisionRule['operator']
  origin: ManagementDecisionRule['origin']
  status: ManagementDecisionRule['status']
  rationale: string
  period: string
  evidence: string
}

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator == null || denominator == null || denominator <= 0) return null
  return numerator / denominator * 100
}

function matches(value: number, rule: ManagementDecisionRule) {
  if (rule.operator === '>=') return value >= rule.threshold
  if (rule.operator === '>') return value > rule.threshold
  return value < rule.threshold
}

export function evaluateManagementDecisionPolicy() {
  const summary = getOperationalSummary()
  const metrics: Record<string, number | null> = {
    stale_90_leads_ratio: null,
    realized_visits_rate: summary.realizedVisitsRate,
    suspended_listings_ratio: ratio(summary.suspended, summary.stock),
    unclassified_leads_ratio: null,
  }

  // The monthly operational summary does not expose compatible active/stale or
  // unclassified universes. Those ratios remain unavailable rather than being
  // inferred from incompatible periods or datasets.
  const signals: GovernedDecisionSignal[] = []
  for (const rule of MANAGEMENT_DECISION_POLICY.rules) {
    const value = metrics[rule.metric]
    if (value == null || !Number.isFinite(value) || !matches(value, rule)) continue
    signals.push({
      ruleId: rule.id,
      metric: rule.metric,
      label: rule.label,
      severity: rule.severity,
      value,
      threshold: rule.threshold,
      operator: rule.operator,
      origin: rule.origin,
      status: rule.status,
      rationale: rule.rationale,
      period: summary.month,
      evidence: rule.metric === 'realized_visits_rate'
        ? `${summary.realizedVisits ?? 'n/d'} visitas realizadas de ${summary.visits ?? 'n/d'} agendadas.`
        : `${summary.suspended} propiedades suspendidas sobre stock ${summary.stock}.`,
    })
  }

  return {
    policyVersion: MANAGEMENT_DECISION_POLICY.version,
    policyStatus: MANAGEMENT_DECISION_POLICY.status,
    evaluatedPeriod: summary.month,
    signals: signals.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1)),
    unavailableMetrics: Object.entries(metrics).filter(([, value]) => value == null).map(([metric]) => metric),
  }
}
