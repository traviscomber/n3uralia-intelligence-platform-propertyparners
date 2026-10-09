/**
 * Controls when a discovered Portal universe can replace a previous complete
 * inventory. Incomplete/blocked sources are never authorized as full snapshots.
 */
export type PortalInventoryCompletenessEvidence = {
  uniqueListings: number
  reportedResultCount: number | null
  previousVerifiedInventoryCount: number
  exhausted: boolean
  capped: boolean
  newListingsPerPage: number[]
}

const MIN_COMPLETE_INVENTORY_LISTINGS = 30
const MIN_BASELINE_RETENTION_RATIO = 0.85
const MIN_REPORTED_COVERAGE_RATIO = 0.97
const MAX_REPORTED_COVERAGE_RATIO = 1.05

export function evaluatePortalInventoryCompleteness(evidence: PortalInventoryCompletenessEvidence) {
  const unique = evidence.uniqueListings
  const previous = Number.isFinite(evidence.previousVerifiedInventoryCount)
    && evidence.previousVerifiedInventoryCount > 0
    ? evidence.previousVerifiedInventoryCount
    : 0
  const baselineFloor = previous > 0
    ? Math.max(MIN_COMPLETE_INVENTORY_LISTINGS, Math.floor(previous * MIN_BASELINE_RETENTION_RATIO))
    : MIN_COMPLETE_INVENTORY_LISTINGS

  const reported = evidence.reportedResultCount
  const coverageRatio = reported != null && reported > 0 ? unique / reported : null
  // An explicit zero is inconsistent with a non-empty inventory; unknown is
  // handled by the baseline/count gates instead of inventing a source count.
  const coveragePass = reported == null
    || (coverageRatio != null
      && coverageRatio >= MIN_REPORTED_COVERAGE_RATIO
      && coverageRatio <= MAX_REPORTED_COVERAGE_RATIO)
  const countSanityPass = Number.isInteger(unique) && unique >= baselineFloor
  const sequence = evidence.newListingsPerPage
  const firstZeroPage = sequence.findIndex((count) => count === 0)
  const discoverySequencePass = sequence.length > 0
    && sequence.every((count) => Number.isInteger(count) && count >= 0)
    && sequence.reduce((sum, count) => sum + count, 0) === unique
    && (firstZeroPage < 0 || sequence.slice(firstZeroPage + 1).every((count) => count === 0))
  const fullSnapshot = evidence.exhausted
    && !evidence.capped
    && countSanityPass
    && coveragePass
    && discoverySequencePass

  return {
    fullSnapshot,
    coverageRatio,
    baselineFloor,
    countSanityPass,
    coveragePass,
    discoverySequencePass,
  }
}
