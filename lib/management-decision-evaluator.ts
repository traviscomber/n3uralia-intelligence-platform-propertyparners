import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { MANAGEMENT_DECISION_POLICY, type ManagementDecisionRule } from '@/lib/management-decision-policy'

export type DecisionEvidenceLayer = 'approved_live' | 'verified_live' | 'documentary_fallback'

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
  evidenceLayer: DecisionEvidenceLayer
}

type MetricRow = {
  metric_code: string
  period_end: string
  value: number | string | null
}

const REQUIRED_CODES = [
  'active_leads_snapshot',
  'stale_90_leads',
  'unclassified_leads',
  'scheduled_visits',
  'realized_visits',
  'stock',
  'suspended_listings',
] as const

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator == null || denominator == null || denominator <= 0) return null
  return numerator / denominator * 100
}

function numberOrNull(value: number | string | null | undefined) {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function matches(value: number, rule: ManagementDecisionRule) {
  if (rule.operator === '>=') return value >= rule.threshold
  if (rule.operator === '>') return value > rule.threshold
  return value < rule.threshold
}

function buildSignals(args: {
  metrics: Record<string, number | null>
  period: string
  evidenceLayer: GovernedDecisionSignal['evidenceLayer']
  evidenceValues: Record<string, number | null>
}) {
  const signals: GovernedDecisionSignal[] = []
  for (const rule of MANAGEMENT_DECISION_POLICY.rules) {
    const value = args.metrics[rule.metric]
    if (value == null || !Number.isFinite(value) || !matches(value, rule)) continue

    let evidence = `Valor evaluado: ${value.toFixed(1)}%.`
    if (rule.metric === 'realized_visits_rate') {
      evidence = `${args.evidenceValues.realized_visits ?? 'n/d'} visitas realizadas de ${args.evidenceValues.scheduled_visits ?? 'n/d'} agendadas.`
    } else if (rule.metric === 'suspended_listings_ratio') {
      evidence = `${args.evidenceValues.suspended_listings ?? 'n/d'} propiedades suspendidas sobre stock ${args.evidenceValues.stock ?? 'n/d'}.`
    } else if (rule.metric === 'stale_90_leads_ratio') {
      evidence = `${args.evidenceValues.stale_90_leads ?? 'n/d'} leads +90 días sobre ${args.evidenceValues.active_leads_snapshot ?? 'n/d'} leads activos.`
    } else if (rule.metric === 'unclassified_leads_ratio') {
      evidence = `${args.evidenceValues.unclassified_leads ?? 'n/d'} leads sin clasificar sobre ${args.evidenceValues.active_leads_snapshot ?? 'n/d'} leads activos.`
    }

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
      period: args.period,
      evidence,
      evidenceLayer: args.evidenceLayer,
    })
  }

  return signals.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
}

function latestEvaluableMetricPack(rows: MetricRow[]) {
  const periods = [...new Set(rows.map((row) => row.period_end).filter(Boolean))].sort().reverse()
  for (const period of periods) {
    const periodRows = rows.filter((row) => row.period_end === period)
    const values = Object.fromEntries(
      REQUIRED_CODES.map((code) => [
        code,
        numberOrNull(periodRows.find((row) => row.metric_code === code)?.value),
      ]),
    ) as Record<string, number | null>

    const evaluablePairs = [
      values.active_leads_snapshot != null && values.stale_90_leads != null,
      values.active_leads_snapshot != null && values.unclassified_leads != null,
      values.scheduled_visits != null && values.realized_visits != null,
      values.stock != null && values.suspended_listings != null,
    ]
    if (evaluablePairs.some(Boolean)) return { period, values }
  }
  return null
}

async function loadCompanyId() {
  const supabase = await createClient()
  const { data: company, error } = await supabase
    .from('management_entities')
    .select('id')
    .eq('entity_type', 'company')
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  return error || !company?.id ? null : company.id
}

async function loadApprovedCompanyMetrics(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('management_approved_metric_values')
    .select('metric_code,period_end,value')
    .eq('entity_id', companyId)
    .in('metric_code', [...REQUIRED_CODES])
    .order('period_end', { ascending: false })

  if (error || !data?.length) return null
  return latestEvaluableMetricPack(data as MetricRow[])
}

async function loadVerifiedCompanyMetrics(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('management_metric_values')
    .select('metric_code,period_end,value,updated_at')
    .eq('entity_id', companyId)
    .in('metric_code', [...REQUIRED_CODES])
    .eq('quality_status', 'verified')
    .eq('evaluation_status', 'evaluable')
    .not('value', 'is', null)
    .order('period_end', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error || !data?.length) return null
  return latestEvaluableMetricPack(data as MetricRow[])
}

function evaluatePack(
  pack: { period: string; values: Record<string, number | null> },
  evidenceLayer: DecisionEvidenceLayer,
) {
  const metrics: Record<string, number | null> = {
    stale_90_leads_ratio: ratio(pack.values.stale_90_leads, pack.values.active_leads_snapshot),
    realized_visits_rate: ratio(pack.values.realized_visits, pack.values.scheduled_visits),
    suspended_listings_ratio: ratio(pack.values.suspended_listings, pack.values.stock),
    unclassified_leads_ratio: ratio(pack.values.unclassified_leads, pack.values.active_leads_snapshot),
  }

  return {
    policyVersion: MANAGEMENT_DECISION_POLICY.version,
    policyStatus: MANAGEMENT_DECISION_POLICY.status,
    evaluatedPeriod: pack.period,
    evidenceLayer,
    signals: buildSignals({
      metrics,
      period: pack.period,
      evidenceLayer,
      evidenceValues: pack.values,
    }),
    unavailableMetrics: Object.entries(metrics).filter(([, value]) => value == null).map(([metric]) => metric),
  }
}

export async function evaluateManagementDecisionPolicy() {
  const companyId = await loadCompanyId()

  if (companyId) {
    const approved = await loadApprovedCompanyMetrics(companyId)
    if (approved) return evaluatePack(approved, 'approved_live')

    const verified = await loadVerifiedCompanyMetrics(companyId)
    if (verified) return evaluatePack(verified, 'verified_live')
  }

  const summary = getOperationalSummary()
  const evidenceValues: Record<string, number | null> = {
    active_leads_snapshot: null,
    stale_90_leads: null,
    unclassified_leads: null,
    scheduled_visits: summary.visits,
    realized_visits: summary.realizedVisits,
    stock: summary.stock,
    suspended_listings: summary.suspended,
  }
  const metrics: Record<string, number | null> = {
    stale_90_leads_ratio: null,
    realized_visits_rate: summary.realizedVisitsRate,
    suspended_listings_ratio: ratio(summary.suspended, summary.stock),
    unclassified_leads_ratio: null,
  }

  return {
    policyVersion: MANAGEMENT_DECISION_POLICY.version,
    policyStatus: MANAGEMENT_DECISION_POLICY.status,
    evaluatedPeriod: summary.month,
    evidenceLayer: 'documentary_fallback' as const,
    signals: buildSignals({
      metrics,
      period: summary.month,
      evidenceLayer: 'documentary_fallback',
      evidenceValues,
    }),
    unavailableMetrics: Object.entries(metrics).filter(([, value]) => value == null).map(([metric]) => metric),
  }
}
