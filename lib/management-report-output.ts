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

function canonicalSalesTarget(comparisons: Record<string, unknown>) {
  const targets = isRecord(comparisons.targets) ? comparisons.targets : null
  const current = isRecord(targets?.current) ? targets.current : null
  return isRecord(current?.sales) ? current.sales : null
}

function canonicalYtd(comparisons: Record<string, unknown>) {
  const targets = isRecord(comparisons.targets) ? comparisons.targets : null
  return isRecord(targets?.ytd) ? targets.ytd : null
}

function canonicalMomClosures(comparisons: Record<string, unknown>) {
  const mom = isRecord(comparisons.mom) ? comparisons.mom : null
  if (mom?.status !== 'exact') return null
  const metrics = isRecord(mom.metrics) ? mom.metrics : null
  return isRecord(metrics?.closures) ? metrics.closures : null
}

function comparisonNarrative(comparisons: Record<string, unknown>) {
  const canonicalTarget = canonicalSalesTarget(comparisons)
  const canonicalYtdValue = canonicalYtd(comparisons)
  const canonicalMom = canonicalMomClosures(comparisons)
  const momContainer = isRecord(comparisons.mom) ? comparisons.mom : null
  const yoy = isRecord(comparisons.yoy) ? comparisons.yoy : null
  const parts: string[] = []

  if (canonicalTarget) {
    const actual = finiteNumber(canonicalTarget.actual)
    const target = finiteNumber(canonicalTarget.target)
    const attainment = finiteNumber(canonicalTarget.attainmentPct)
    const official = canonicalTarget.officialForScoring === true
    if (actual != null && target != null) {
      parts.push(`Meta documentada: ${formatNumber(actual)} cierres acreditados vs ${formatNumber(target)}; cumplimiento ${formatNumber(attainment)}%${official ? '' : ' (referencia documental; no scoring oficial)'}.`)
    }
  } else {
    // Compatibility with snapshots generated during the transition to the canonical comparison contract.
    const legacyTarget = isRecord(comparisons.target) ? comparisons.target : null
    if (legacyTarget?.available === true) {
      const current = finiteNumber(legacyTarget.current)
      const value = finiteNumber(legacyTarget.value)
      const compliance = finiteNumber(legacyTarget.compliancePct)
      parts.push(`Meta documentada: ${formatNumber(current)} cierres acreditados vs ${formatNumber(value)}; cumplimiento ${formatNumber(compliance)}%.`)
    }
  }

  if (canonicalMom) {
    const previous = finiteNumber(canonicalMom.previous)
    const current = finiteNumber(canonicalMom.current)
    const deltaRecord = isRecord(canonicalMom.delta) ? canonicalMom.delta : null
    const change = finiteNumber(deltaRecord?.value)
    const sign = change != null && change > 0 ? '+' : ''
    parts.push(`Variación MoM: ${formatNumber(previous)} → ${formatNumber(current)} cierres (${sign}${formatNumber(change)}%).`)
  } else {
    const legacyMom = isRecord(comparisons.mom) ? comparisons.mom : null
    if (legacyMom?.available === true) {
      const previous = finiteNumber(legacyMom.previous)
      const current = finiteNumber(legacyMom.current)
      const change = finiteNumber(legacyMom.percentChange)
      const sign = change != null && change > 0 ? '+' : ''
      parts.push(`Variación MoM: ${formatNumber(previous)} → ${formatNumber(current)} cierres (${sign}${formatNumber(change)}%).`)
    }
  }

  if (canonicalYtdValue) {
    const current = finiteNumber(canonicalYtdValue.closures)
    const target = finiteNumber(canonicalYtdValue.target)
    const attainment = finiteNumber(canonicalYtdValue.attainmentPct)
    if (current != null && target != null) parts.push(`Acumulado YTD: ${formatNumber(current)} de ${formatNumber(target)} cierres de referencia (${formatNumber(attainment)}%).`)
  } else {
    const legacyYtd = isRecord(comparisons.ytd) ? comparisons.ytd : null
    const current = finiteNumber(legacyYtd?.currentClosures)
    const target = finiteNumber(legacyYtd?.targetClosures)
    const attainment = finiteNumber(legacyYtd?.targetCompliancePct)
    if (current != null && target != null) parts.push(`Acumulado YTD: ${formatNumber(current)} de ${formatNumber(target)} cierres de referencia (${formatNumber(attainment)}%).`)
  }

  if (yoy?.status === 'same_period_not_canonicalized') {
    parts.push(`YoY mensual: ${String(yoy.period ?? 'período equivalente 2025')} aún no está canonicalizado por mes; no se infiere desde el agregado anual.`)
  } else if (yoy?.available !== true && yoy?.annualReferenceAvailable === true) {
    parts.push('YoY mensual: fuente CRM 2025 disponible a nivel anual; pendiente periodización mensual fila-a-fila antes de publicar una comparación equivalente.')
  }

  const previousPeriod = typeof momContainer?.previousPeriod === 'string' ? momContainer.previousPeriod : null
  if (momContainer?.status === 'no_previous_month' && previousPeriod) parts.push(`MoM: no existe snapshot mensual previo comparable para ${previousPeriod}.`)

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
    const salesTarget = comparisons ? canonicalSalesTarget(comparisons) : null
    const canonicalMom = comparisons ? isRecord(comparisons.mom) ? comparisons.mom : null : null
    const legacyTarget = comparisons && isRecord(comparisons.target) ? comparisons.target : null
    const targetAvailable = (salesTarget && finiteNumber(salesTarget.target) != null) || legacyTarget?.available === true
    const momAvailable = canonicalMom?.status === 'exact' || canonicalMom?.available === true

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
