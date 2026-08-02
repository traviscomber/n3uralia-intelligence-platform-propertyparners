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

export type ConversionBenchmark = Record<
  'leadToVisitPct' | 'visitToClosePct' | 'totalPct',
  string
>

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
    classification: 'measured-consolidated-results'
    periodCovered: string
    label: string
    leads: number
    activeLeads: number
    visits: number
    closings: number
    conversionPct: number
  }
  operationalDefinitions: {
    sourceBasis: string
    contactStandards: {
      classification: 'active-operational-standard'
      house: OperationalContactStandard
      apartment: OperationalContactStandard
    }
    conversionBenchmarks: {
      classification: 'active-operational-benchmark'
      house: ConversionBenchmark
      apartment: ConversionBenchmark
    }
  }
}

export const canonicalReportRules = {
  fontFamily: 'Calibri, Segoe UI, Arial, sans-serif',
  prioritizeMeasuredResults: true,
  showOperationalSnapshotSeparately: true,
  labelStandardsAsActiveOperationalStandards: true,
  labelBenchmarksAsActiveOperationalBenchmarks: true,
  neverPresentStandardsOrBenchmarksAsObservedResults: true,
  neverDowngradeActiveOperationalDefinitionsToGenericReferences: true,
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
    errors.push(
      'The operational snapshot date must be later than the commercial cutoff when totals use a more recent consolidated period.',
    )
  }

  if (report.operationalSnapshot.classification !== 'measured-consolidated-results') {
    errors.push('Operational totals must be classified as measured consolidated results.')
  }

  if (report.operationalDefinitions.contactStandards.classification !== 'active-operational-standard') {
    errors.push('Contact timings must be classified as active operational standards.')
  }

  if (report.operationalDefinitions.conversionBenchmarks.classification !== 'active-operational-benchmark') {
    errors.push('Conversion ranges must be classified as active operational benchmarks.')
  }

  if (report.commercial.series.some((item) => item.month > report.commercial.month)) {
    errors.push('Commercial series contains data after the report cutoff month.')
  }

  return errors
}
