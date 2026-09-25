import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluatePortalSnapshotPolicy } from '../lib/portal-snapshot-policy'

test('partial Portal capture can never close removals or publish full-market inventory', () => {
  const policy = evaluatePortalSnapshotPolicy({
    requestedFullSnapshot: false,
    pagesVisited: 1,
    discoveredListingUrls: 48,
    validListingRows: 48,
    failedListingDetails: 0,
    discoveryExhausted: false,
    discoveryCapped: true,
  })

  assert.equal(policy.fullSnapshotEligible, false)
  assert.equal(policy.fullSnapshot, false)
  assert.equal(policy.canCloseRemovals, false)
  assert.equal(policy.marketCountPublishable, false)
})

test('requesting full snapshot does not override insufficient coverage evidence', () => {
  const policy = evaluatePortalSnapshotPolicy({
    requestedFullSnapshot: true,
    pagesVisited: 3,
    discoveredListingUrls: 120,
    validListingRows: 117,
    failedListingDetails: 0,
    discoveryExhausted: true,
    discoveryCapped: false,
  })

  assert.ok(policy.validCoverage < 0.98)
  assert.equal(policy.fullSnapshotEligible, false)
  assert.equal(policy.fullSnapshot, false)
})

test('full market state becomes publishable only when discovery and detail coverage are proven', () => {
  const policy = evaluatePortalSnapshotPolicy({
    requestedFullSnapshot: true,
    pagesVisited: 8,
    discoveredListingUrls: 160,
    validListingRows: 159,
    failedListingDetails: 0,
    discoveryExhausted: true,
    discoveryCapped: false,
  })

  assert.ok(policy.validCoverage >= 0.98)
  assert.equal(policy.fullSnapshotEligible, true)
  assert.equal(policy.fullSnapshot, true)
  assert.equal(policy.canCloseRemovals, true)
  assert.equal(policy.marketCountPublishable, true)
})

test('collector failures prevent a full snapshot even with otherwise complete discovery', () => {
  const policy = evaluatePortalSnapshotPolicy({
    requestedFullSnapshot: true,
    pagesVisited: 8,
    discoveredListingUrls: 160,
    validListingRows: 160,
    failedListingDetails: 1,
    discoveryExhausted: true,
    discoveryCapped: false,
  })

  assert.equal(policy.fullSnapshotEligible, false)
  assert.equal(policy.fullSnapshot, false)
})
