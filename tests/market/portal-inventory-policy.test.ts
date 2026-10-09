import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { evaluatePortalInventoryCompleteness, type PortalInventoryCompletenessEvidence } from '../../lib/portal-inventory-policy'
import { portalListingIdFromUrl } from '../../lib/portal-inmobiliario-collector'

const complete: PortalInventoryCompletenessEvidence = {
  uniqueListings: 100,
  reportedResultCount: 100,
  previousVerifiedInventoryCount: 100,
  exhausted: true,
  capped: false,
  newListingsPerPage: [48, 48, 4, 0],
}

test('complete inventory needs exhaustion, coverage, count and consistent source sequence', () => {
  const result = evaluatePortalInventoryCompleteness(complete)
  assert.equal(result.fullSnapshot, true)
  assert.equal(result.coverageRatio, 1)
  assert.equal(result.baselineFloor, 85)
})

const negativeCases: Array<[string, Partial<PortalInventoryCompletenessEvidence>]> = [
  ['source challenge or unknown pagination completion', { exhausted: false }],
  ['discovery cap reached', { capped: true }],
  ['too few compared with prior verified universe', { uniqueListings: 84, newListingsPerPage: [48, 36, 0], reportedResultCount: null }],
  ['undercoverage of reported result count', { reportedResultCount: 110 }],
  ['more identities than reported by source', { reportedResultCount: 90 }],
  ['invalid explicit zero report', { reportedResultCount: 0 }],
  ['listing-count inconsistent with pages', { newListingsPerPage: [48, 48, 0] }],
  ['positive listings after a zero page', { newListingsPerPage: [48, 0, 52] }],
  ['no reliable discovery sequence', { newListingsPerPage: [] }],
]
for (const [description, override] of negativeCases) {
  test(`reject ${description}`, () => {
    assert.equal(evaluatePortalInventoryCompleteness({ ...complete, ...override }).fullSnapshot, false)
  })
}

test('missing source-reported count never invents coverage, but requires the other gates', () => {
  const result = evaluatePortalInventoryCompleteness({ ...complete, reportedResultCount: null })
  assert.equal(result.coverageRatio, null)
  assert.equal(result.fullSnapshot, true)
})

test('MLC identity is stable across Portal URL variants', () => {
  const listingA = portalListingIdFromUrl('https://www.portalinmobiliario.com/MLC-1234567890-vivienda', 'portal_houses')
  const listingB = portalListingIdFromUrl('https://www.portalinmobiliario.com/p/MLC1234567890', 'portal_houses')
  const listingC = portalListingIdFromUrl('https://www.portalinmobiliario.com/MLC-1234567891-vivienda', 'portal_houses')
  assert.equal(listingA, listingB)
  assert.notEqual(listingA, listingC)
})

test('manual refresh never silently falls back to Firecrawl', () => {
  const route = readFileSync('app/api/cron/market-refresh/route.ts', 'utf8')
  assert.doesNotMatch(route, /firecrawl/i)
  assert.match(route, /evaluatePortalInventoryCompleteness/)
})

test('preview Bright Data smoke requires a server-side secret', () => {
  const route = readFileSync('app/api/internal/portal-collector-smoke/route.ts', 'utf8')
  assert.match(route, /process\.env\.CRON_SECRET/)
  assert.match(route, /request\.headers\.get\('authorization'\)/)
  assert.match(route, /process\.env\.VERCEL_ENV !== 'preview'/)
})
