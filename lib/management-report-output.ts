import type { ManagementReportRecord } from '@/lib/management-report-artifact'

const BLOCKER_LABELS: Record<string, string> = {
  goal_compliance: 'Cumplimiento de meta',
  canonical_portfolio_score: 'Score de cartera',
  canonical_conversion_score: 'Score de conversión',
  canonical_management_score: 'Score integral de gestión',
  office_breakdown: 'Desglose por oficina',
  active_leads_followup: 'Leads activos / seguimiento',
  month_over_month: 'Comparación mensual',
  scheduled_visits: 'Visitas agendadas',
  realized_visits: 'Visitas realizadas',
  sales_velocity: 'Velocidad de venta',
  followups: 'Seguimientos',
  visits: 'Serie de visitas',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeManagementReportOutput<T extends ManagementReportRecord>(report: T): T {
  const sourceSnapshot = isRecord(report.snapshot) ? report.snapshot : {}
  const snapshot: Record<string, unknown> = { ...sourceSnapshot }
  const company = isRecord(sourceSnapshot.company) ? { ...sourceSnapshot.company } : {}
  const scope = isRecord(sourceSnapshot.scope) ? { ...sourceSnapshot.scope } : null
  const completeness = isRecord(sourceSnapshot.completeness) ? { ...sourceSnapshot.completeness } : null

  // Client-facing management reports use the credited dimension for fields labelled "acreditado".
  // July has an explicit split. Earlier months have no separate credited dimension, so raw = credited.
  const rawSalesUf = finiteNumber(company.volumenUfBruto) ?? finiteNumber(scope?.grossSalesUf)
  const creditedSalesUf = finiteNumber(company.volumenUfAcreditado)
    ?? finiteNumber(scope?.managementCreditedSalesUf)
    ?? rawSalesUf
  if (rawSalesUf != null) company.volumenUfOperacionalBruto = rawSalesUf
  if (creditedSalesUf != null) {
    company.volumenUfAcreditado = creditedSalesUf
    // Compatibility alias for the current PDF renderer.
    company.volumenUfBruto = creditedSalesUf
  }

  const rawOperationalClosures = finiteNumber(company.cierresOperacionales) ?? finiteNumber(scope?.rawOperations)
  const creditedClosures = finiteNumber(company.cierresAcreditados)
    ?? finiteNumber(scope?.managementCreditedClosures)
    ?? finiteNumber(company.cierresOperacionales)
  if (rawOperationalClosures != null) company.cierresOperacionales = rawOperationalClosures
  if (creditedClosures != null) company.cierresAcreditados = creditedClosures

  if (completeness && Array.isArray(completeness.blocked)) {
    completeness.blocked = completeness.blocked.map((item) => {
      if (!isRecord(item)) return item
      const code = typeof item.code === 'string' ? item.code : ''
      return {
        ...item,
        code: BLOCKER_LABELS[code] ?? code.replace(/_/g, ' '),
      }
    })
    snapshot.completeness = completeness
  }

  snapshot.company = company
  if (scope) snapshot.scope = scope

  return {
    ...report,
    snapshot,
  }
}
