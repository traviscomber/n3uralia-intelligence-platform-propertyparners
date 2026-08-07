export type DecisionRuleOrigin = 'n3uralia_provisional' | 'client_approved' | 'canonical_methodology'
export type DecisionRuleStatus = 'active_provisional' | 'approved' | 'blocked_client_definition'

export type ManagementDecisionRule = {
  id: string
  metric: string
  label: string
  operator: '>=' | '<' | '>'
  threshold: number
  severity: 'high' | 'medium'
  origin: DecisionRuleOrigin
  status: DecisionRuleStatus
  rationale: string
}

/**
 * Operational thresholds currently used to prioritize CEO attention.
 *
 * These are N3uralia decision-support rules, not client-owned KPI definitions.
 * They must remain explicitly provisional until the client KPI dictionary and
 * alert governance are formally approved. Canonical metric methodologies live
 * in management_metric_definitions and are not replaced by these thresholds.
 */
export const MANAGEMENT_DECISION_POLICY = {
  version: '2026-08-07.1',
  owner: 'N3uralia',
  status: 'provisional_pending_client_kpi_dictionary' as const,
  rules: [
    { id: 'lead-backlog-critical', metric: 'stale_90_leads_ratio', label: 'Backlog +90 días crítico', operator: '>=', threshold: 30, severity: 'high', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Prioriza intervención cuando una fracción material de leads activos permanece sin gestión por más de 90 días.' },
    { id: 'lead-backlog-watch', metric: 'stale_90_leads_ratio', label: 'Backlog +90 días en observación', operator: '>=', threshold: 15, severity: 'medium', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Señal temprana de acumulación operacional; no equivale a un KPI contractual.' },
    { id: 'visits-critical', metric: 'realized_visits_rate', label: 'Ejecución de visitas crítica', operator: '<', threshold: 50, severity: 'high', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Prioriza revisión cuando menos de la mitad de las visitas agendadas se materializa.' },
    { id: 'visits-watch', metric: 'realized_visits_rate', label: 'Ejecución de visitas en observación', operator: '<', threshold: 60, severity: 'medium', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Señal operativa de seguimiento; no redefine la metodología canónica de visitas.' },
    { id: 'suspended-critical', metric: 'suspended_listings_ratio', label: 'Cartera suspendida crítica', operator: '>=', threshold: 20, severity: 'high', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Prioriza revisión de cartera cuando la proporción suspendida es material.' },
    { id: 'suspended-watch', metric: 'suspended_listings_ratio', label: 'Cartera suspendida en observación', operator: '>=', threshold: 10, severity: 'medium', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Señal preventiva sobre calidad o vigencia de cartera.' },
    { id: 'unclassified-watch', metric: 'unclassified_leads_ratio', label: 'Leads sin clasificar', operator: '>=', threshold: 30, severity: 'medium', origin: 'n3uralia_provisional', status: 'active_provisional', rationale: 'Prioriza clasificación cuando una proporción relevante del universo activo carece de clasificación.' },
  ] satisfies ManagementDecisionRule[],
}

export function getDecisionRule(id: string) {
  return MANAGEMENT_DECISION_POLICY.rules.find((rule) => rule.id === id) ?? null
}
