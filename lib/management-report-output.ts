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

function formatNumber(value: number | null, digits = 2) {
  if (value == null) return 'n/d'
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

function comparisonNarrative(comparisons: Record<string, unknown>) {
  const target = isRecord(comparisons.target) ? comparisons.target : null
  const mom = isRecord(comparisons.mom) ? comparisons.mom : null
  const ytd = isRecord(comparisons.ytd) ? comparisons.ytd : null
  const yoy = isRecord(comparisons.yoy) ? comparisons.yoy : null
  const parts: string[] = []

  if (target?.available === true) {
    const current = finiteNumber(target.current)
    const value = finiteNumber(target.value)
    const compliance = finiteNumber(target.compliancePct)
    parts.push(`Meta documentada: ${formatNumber(current)} cierres acreditados vs ${formatNumber(value)}; cumplimiento ${formatNumber(compliance)}%.`)
  }

  if (mom?.available === true) {
    const previous = finiteNumber(mom.previous)
    const current = finiteNumber(mom.current)
    const change = finiteNumber(mom.percentChange)
    const sign = change != null && change > 0 ? '+' : ''
    parts.push(`Variación MoM: ${formatNumber(previous)} → ${formatNumber(current)} cierres (${sign}${formatNumber(change)}%).`)
  }

  const ytdCurrent = finiteNumber(ytd?.currentClosures)
  const ytdTarget = finiteNumber(ytd?.targetClosures)
  const ytdCompliance = finiteNumber(ytd?.targetCompliancePct)
  if (ytdCurrent != null && ytdTarget != null) {
    parts.push(`Acumulado YTD: ${formatNumber(ytdCurrent)} de ${formatNumber(ytdTarget)} cierres objetivo (${formatNumber(ytdCompliance)}%).`)
  }

  if (yoy?.available !== true && yoy?.annualReferenceAvailable === true) {
    parts.push('YoY mensual: fuente CRM 2025 disponible a nivel anual; pendiente periodización mensual fila-a-fila antes de publicar una comparación equivalente.')
  }

  return parts.join(' ')
}

export function normalizeManagementReportOutput<T extends ManagementReportRecord>(report: T): T {
  const sourceSnapshot = isRecord(report.snapshot) ? report.snapshot : {}
  const snapshot: Record<string, unknown> = { ...sourceSnapshot }
  const company = isRecord(sourceSnapshot.company) ? { ...sourceSnapshot.company } : {}
  const scope = isRecord(sourceSnapshot.scope) ? { ...sourceSnapshot.scope } : null
  const completeness = isRecord(sourceSnapshot.completeness) ? { ...sourceSnapshot.completeness } : null
  const comparisons = isRecord(sourceSnapshot.comparisons) ? { ...sourceSnapshot.comparisons } : null

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
    const targetAvailable = isRecord(comparisons?.target) && comparisons?.target?.available === true
    const momAvailable = isRecord(comparisons?.mom) && comparisons?.mom?.available === true

    completeness.blocked = completeness.blocked
      .filter((item) => {
        if (!isRecord(item)) return true
        const code = typeof item.code === 'string' ? item.code : ''
        if (code === 'goal_compliance' && targetAvailable) return false
        if (code === 'month_over_month' && momAvailable) return false
        return true
      })
      .map((item) => {
        if (!isRecord(item)) return item
        const code = typeof item.code === 'string' ? item.code : ''
        return {
          ...item,
          code: BLOCKER_LABELS[code] ?? code.replace(/_/g, ' '),
        }
      })
    snapshot.completeness = completeness
  }

  if (comparisons) {
    snapshot.comparisons = comparisons
    const narrative = comparisonNarrative(comparisons)
    if (narrative) {
      const existingNotes = Array.isArray(sourceSnapshot.qualityNotes)
        ? sourceSnapshot.qualityNotes.map((item) => String(item)).filter(Boolean)
        : []
      snapshot.qualityNotes = [narrative, ...existingNotes.filter((item) => item !== narrative)]
    }
  }

  snapshot.company = company
  if (scope) snapshot.scope = scope

  return {
    ...report,
    snapshot,
  }
}
