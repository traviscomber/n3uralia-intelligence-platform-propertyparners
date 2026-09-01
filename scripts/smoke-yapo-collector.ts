import assert from 'node:assert/strict'
import { collectYapoVitacura } from '../lib/yapo-collector'

async function main() {
  const result = await collectYapoVitacura({ maxListings: 3, waitMs: 500 })
  const usableRows = result.rows.filter((row) =>
    Boolean(row.source_listing_id)
    && Boolean(row.url)
    && Number(row.price_uf) >= 100
    && (Number(row.built_area_m2) > 5 || Number(row.land_area_m2) > 5),
  )

  console.log('[yapo-smoke]', {
    searchUrl: result.searchUrl,
    discovered: result.listingUrls.length,
    parsed: result.rows.length,
    failures: result.failures.length,
    usable: usableRows.length,
    sample: result.rows.map((row) => ({
      source_listing_id: row.source_listing_id,
      source_reference: row.source_reference,
      title: row.title,
      locality: row.locality,
      price_uf: row.price_uf,
      built_area_m2: row.built_area_m2,
      land_area_m2: row.land_area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parking_spaces: row.parking_spaces,
      published_at: row.published_at,
    })),
  })

  assert.ok(result.listingUrls.length > 0, 'Yapo search returned zero house listing URLs')
  assert.ok(result.rows.length > 0, 'Yapo detail parser returned zero rows')
  assert.equal(result.failures.length, 0, 'Yapo collection produced detail failures')
  assert.ok(usableRows.length > 0, 'Yapo returned no commercially usable Vitacura house row')
  assert.ok(result.rows.every((row) => row.source_system === 'yapo'), 'Yapo source provenance was not preserved')

  console.log('[yapo-smoke] PASS read-only collector')
}

main().catch((error) => {
  console.error('[yapo-smoke] FAIL', error)
  process.exitCode = 1
})
