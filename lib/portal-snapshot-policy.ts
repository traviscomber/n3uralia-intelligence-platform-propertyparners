export type PortalSnapshotEvidence = {
  requestedFullSnapshot: boolean
  pagesVisited: number
  discoveredListingUrls: number
  validListingRows: number
  failedListingDetails: number
  discoveryExhausted: boolean
  discoveryCapped: boolean
}

export type PortalSnapshotPolicy = {
  validCoverage: number
  fullSnapshotEligible: boolean
  fullSnapshot: boolean
  canCloseRemovals: boolean
  marketCountPublishable: boolean
}

export function evaluatePortalSnapshotPolicy(evidence: PortalSnapshotEvidence): PortalSnapshotPolicy {
  const validCoverage = evidence.discoveredListingUrls > 0
    ? evidence.validListingRows / evidence.discoveredListingUrls
    : 0

  const fullSnapshotEligible = evidence.discoveryExhausted
    && !evidence.discoveryCapped
    && evidence.discoveredListingUrls >= 30
    && evidence.failedListingDetails === 0
    && validCoverage >= 0.98

  const fullSnapshot = evidence.requestedFullSnapshot && fullSnapshotEligible

  return {
    validCoverage,
    fullSnapshotEligible,
    fullSnapshot,
    canCloseRemovals: fullSnapshot,
    marketCountPublishable: fullSnapshot,
  }
}
