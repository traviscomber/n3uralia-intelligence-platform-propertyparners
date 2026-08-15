import assert from 'node:assert/strict'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'

async function main() {
  const result = await collectPortalVitacura({
    datasetKind: 'portal_apartments',
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 1,
    maxListings: 2,
    waitMs: 300,
  })

  console.log('[portal-smoke] search', result.searchUrls[0])
  console.log('[portal-smoke] discovered', result.listingUrls.length)
  console.log('[portal-smoke] parsed', result.rows.length)
  console.log('[portal-smoke] failures', result.failures.length)
  for (const row of result.rows) {
    console.log('[portal-smoke] row', {
      source_listing_id: row.source_listing_id,
      property_type: row.property_type,
      price_uf: row.price_uf,
      useful_area_m2: row.useful_area_m2,
      built_area_m2: row.built_area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
    })
  }

  assert.ok(result.listingUrls.length > 0, 'Portal search returned zero listing URLs')
  assert.ok(result.rows.length > 0, 'Portal detail parser returned zero rows')
  assert.ok(result.rows.some((row) => Boolean(row.source_listing_id)), 'Portal rows are missing stable listing IDs')
  console.log('[portal-smoke] PASS')
}

main().catch((error) => {
  console.error('[portal-smoke] FAIL', error)
  process.exitCode = 1
})
