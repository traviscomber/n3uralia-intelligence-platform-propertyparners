export type MonthlyCommercialMetric = {
  month: string
  closings: number
  target: number
  compliancePct: number
  productivity: number
}

export type OperationalContactStandard = {
  firstContactHours: number
  followUpHours: number
  recontactDays: number
}

export type PropertyPartnersCanonicalReport = {
  reportId: string
  title: string
  brand: string
  fontFamily: string
  commercialCutoff: string
  operationalSnapshotUpdatedAt: string
  commercial: {
    month: string
    closings: number
    monthlyTarget: number
    monthlyCompliancePct: number
    productivityPerExecutive: number
    previousMonthClosings: number
    closingDelta: number
    cumulativeClosings: number
    cumulativeTarget: number
    cumulativeCompliancePct: number
    series: MonthlyCommercialMetric[]
  }
  operationalSnapshot: {
    periodCovered: string
    label: string
    leads: number
    activeLeads: number
    visits: number
    closings: number
    conversionPct: number
  }
  operationalParameters: {
    classification: 'reference-not-result'
    contactStandards: {
      house: OperationalContactStandard
      apartment: OperationalContactStandard
    }
    conversionBenchmarks: {
      classification: 'reference-not-measured-result'
      house: Record<'leadToVisitPct' | 'visitToClosePct' | 'totalPct', string>
      apartment: Record<'leadToVisitPct' | 'visitToClosePct' | 'totalPct', string>
    }
  }
}

export const canonicalReportRules = {
  fontFamily: 'Calibri, Segoe UI, Arial, sans-serif',
  prioritizeMeasuredResults: true,
  showOperationalSnapshotSeparately: true,
  neverPresentBenchmarksAsMeasuredResults: true,
  neverMixFutureOperationalDataIntoCommercialCutoff: true,
  hideUnavailableMetricsInsteadOfShowingND: true,
  useTabularNumbers: true,
  preventMetricOverflow: true,
} as const

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)
}

export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPercent(value: number, digits = 0): string {
  return `${formatDecimal(value, digits)}%`
}

export function validateCanonicalReport(report: PropertyPartnersCanonicalReport): string[] {
  const errors: string[] = []

  if (report.commercialCutoff >= report.operationalSnapshotUpdatedAt) {
    errors.push('The operational snapshot date must be later than the commercial cutoff when totals are current-day data.')
  }

  if (report.operationalParameters.classification !== 'reference-not-result') {
    errors.push('Operational standards must be classified as reference data, not measured results.')
  }

  if (report.operationalParameters.conversionBenchmarks.classification !== 'reference-not-measured-result') {
    errors.push('Conversion benchmarks must not be presented as measured results.')
  }

  if (report.commercial.series.some((item) => item.month > report.commercial.month)) {
    errors.push('Commercial series contains data after the report cutoff month.')
  }

  return errors
}
