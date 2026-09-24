import assert from 'node:assert/strict'
import { discoverPortalVitacuraUniverse } from '../lib/portal-inmobiliario-collector'

async function main() {
  const startedAt = Date.now()
  const result = await discoverPortalVitacuraUniverse({
    datasetKind: 'portal_houses',
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 40,
    waitMs: 150,
  })

  const reported = result.discovery.reportedResultCount
  const unique = result.listingUrls.length
  const coverageRatio = reported && reported > 0 ? unique / reported : null
  const runtimeMs = Date.now() - startedAt

  const summary = {
    reported,
    unique,
    coverageRatio,
    pagesVisited: result.discovery.pagesVisited,
    duplicateCandidates: result.discovery.duplicateListingCandidates,
    exhausted: result.discovery.exhausted,
    capped: result.discovery.capped,
    runtimeMs,
  }

  console.log('[portal-inventory-smoke]', summary)

  assert.ok(reported != null && reported >= 30, 'Portal must expose a valid reported result count')
  assert.ok(unique >= 30, 'Collector must discover a non-trivial Vitacura house universe')
  assert.equal(result.discovery.exhausted, true, 'Collector must prove pagination exhaustion')
  assert.equal(result.discovery.capped, false, 'Collector must not hit the 40-page discovery cap')
  assert.ok(coverageRatio != null && coverageRatio >= 0.97, 'Unique listing coverage must be at least 97% of Portal reported results')
  assert.ok(coverageRatio != null && coverageRatio <= 1.05, 'Unique listing coverage must not exceed Portal reported results by more than 5%')
  assert.ok(runtimeMs < 240_000, 'Inventory discovery must finish within the safe runtime budget')
}

main().catch((error) => {
  console.error('[portal-inventory-smoke] FAIL', error)
  process.exitCode = 1
})
