export type ManagementReconciliationStatus =
  | 'exact'
  | 'within_tolerance'
  | 'different'
  | 'not_comparable'
  | 'blocked'

export type ReconciliationResult = {
  publishedValue: number | null
  calculatedValue: number | null
  absoluteDelta: number | null
  relativeDelta: number | null
  tolerance: number
  reconciliationStatus: ManagementReconciliationStatus
  publicationStatus: 'blocked' | 'provisional'
}

const EXACT_EPSILON = 1e-9

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function normalizeReconciliationTolerance(value: unknown) {
  const numeric = finiteNumber(value)
  if (numeric === null) return 0
  return Math.min(1, Math.max(0, numeric))
}

export function calculateManagementMetricReconciliation(input: {
  publishedValue: unknown
  calculatedValue: unknown
  tolerance: unknown
}): ReconciliationResult {
  const publishedValue = finiteNumber(input.publishedValue)
  const calculatedValue = finiteNumber(input.calculatedValue)
  const tolerance = normalizeReconciliationTolerance(input.tolerance)

  if (publishedValue === null || calculatedValue === null) {
    return {
      publishedValue,
      calculatedValue,
      absoluteDelta: null,
      relativeDelta: null,
      tolerance,
      reconciliationStatus: 'not_comparable',
      publicationStatus: 'blocked',
    }
  }

  const absoluteDelta = Math.abs(calculatedValue - publishedValue)
  const exact = absoluteDelta <= EXACT_EPSILON
  const relativeDelta = Math.abs(publishedValue) <= EXACT_EPSILON
    ? exact ? 0 : null
    : absoluteDelta / Math.abs(publishedValue)

  const reconciliationStatus: ManagementReconciliationStatus = exact
    ? 'exact'
    : relativeDelta !== null && relativeDelta <= tolerance
      ? 'within_tolerance'
      : 'different'

  return {
    publishedValue,
    calculatedValue,
    absoluteDelta,
    relativeDelta,
    tolerance,
    reconciliationStatus,
    publicationStatus: reconciliationStatus === 'exact' || reconciliationStatus === 'within_tolerance'
      ? 'provisional'
      : 'blocked',
  }
}

export function canApproveManagementMetricReconciliation(input: {
  role: string
  reconciliationStatus: string
  calculatedValueId?: string | null
  evidence?: Record<string, unknown> | null
}) {
  const hasEvidence = Boolean(input.evidence && Object.keys(input.evidence).length)
  return input.role.toLowerCase() === 'ceo'
    && ['exact', 'within_tolerance'].includes(input.reconciliationStatus)
    && Boolean(input.calculatedValueId)
    && hasEvidence
}
