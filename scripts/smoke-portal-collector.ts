import assert from 'node:assert/strict'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'
import type { PortalDatasetKind } from '../lib/market-source-import'

const datasets: PortalDatasetKind[] = [
  'portal_apartments',
  'portal_houses',
  'portal_projects',
]

async function smoke(datasetKind: PortalDatasetKind) {
  const result = await collectPortalVitacura({
    datasetKind,
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 1,
    maxListings: 3,
    waitMs: 300,
  })

  const usableRows = result.rows.filter((row) =>
    Boolean(row.source_listing_id)
    && Boolean(row.url)
    && typeof row.address === 'string'
    && /vitacura/i.test(row.address)
    && Number(row.price_uf) >= 100
    && (Number(row.useful_area_m2) > 5 || Number(row.built_area_m2) > 5 || Number(row.land_area_m2) > 5),
  )

  console.log(`[portal-smoke:${datasetKind}]`, {
    search: result.searchUrls[0],
    discovered: result.listingUrls.length,
    parsed: result.rows.length,
    failures: result.failures.length,
    usable: usableRows.length,
    sample: result.rows.map((row) => ({
      source_listing_id: row.source_listing_id,
      url: row.url,
      title: row.title,
      address: row.address,
      property_type: row.property_type,
      price_uf: row.price_uf,
      useful_area_m2: row.useful_area_m2,
      built_area_m2: row.built_area_m2,
      land_area_m2: row.land_area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parking_spaces: row.parking_spaces,
    })),
  })

  assert.ok(result.listingUrls.length > 0, `${datasetKind}: Portal search returned zero listing URLs`)
  assert.ok(result.rows.length > 0, `${datasetKind}: Portal detail parser returned zero rows`)
  assert.equal(result.failures.length, 0, `${datasetKind}: Portal collection produced detail failures`)
  assert.ok(result.rows.some((row) => Boolean(row.source_listing_id)), `${datasetKind}: rows are missing stable listing IDs`)
  assert.ok(result.rows.every((row) => row.price_uf == null || Number(row.price_uf) >= 100), `${datasetKind}: implausibly small UF price`)
  assert.ok(usableRows.length > 0, `${datasetKind}: no Vitacura row is commercially usable`)
}

async function main() {
  for (const datasetKind of datasets) await smoke(datasetKind)
  console.log('[portal-smoke] PASS all datasets')
}

main().catch((error) => {
  console.error('[portal-smoke] FAIL', error)
  process.exitCode = 1
})
