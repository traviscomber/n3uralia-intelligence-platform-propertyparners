import assert from 'node:assert/strict'
import { launchServerlessBrowser } from '../lib/serverless-browser'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'

async function diagnoseSearch() {
  const browser = await launchServerlessBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7' })
    const response = await page.goto('https://www.portalinmobiliario.com/venta/departamento/propiedades-usadas/vitacura-metropolitana', { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      finalUrl: location.href,
      anchorCount: document.querySelectorAll('a[href]').length,
      text: document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 700) || '',
      htmlHasMlc: /MLC-?\d+/i.test(document.documentElement.innerHTML),
    }))
    console.log('[portal-diagnostic] status', response?.status() ?? null)
    console.log('[portal-diagnostic]', diagnostics)
  } finally {
    await browser.close()
  }
}

async function main() {
  await diagnoseSearch()

  const result = await collectPortalVitacura({
    datasetKind: 'portal_apartments',
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 1,
    maxListings: 3,
    waitMs: 300,
  })

  console.log('[portal-smoke] search', result.searchUrls[0])
  console.log('[portal-smoke] urls', result.listingUrls)
  console.log('[portal-smoke] discovered', result.listingUrls.length)
  console.log('[portal-smoke] parsed', result.rows.length)
  console.log('[portal-smoke] failures', result.failures.length)
  for (const row of result.rows) {
    console.log('[portal-smoke] row', {
      source_listing_id: row.source_listing_id,
      url: row.url,
      title: row.title,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      property_type: row.property_type,
      price_uf: row.price_uf,
      useful_area_m2: row.useful_area_m2,
      built_area_m2: row.built_area_m2,
      land_area_m2: row.land_area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parking_spaces: row.parking_spaces,
    })
  }

  const usableRows = result.rows.filter((row) =>
    Boolean(row.source_listing_id)
    && Boolean(row.url)
    && Boolean(row.address)
    && Number(row.price_uf) >= 100
    && (Number(row.useful_area_m2) > 5 || Number(row.built_area_m2) > 5),
  )

  assert.ok(result.listingUrls.length > 0, 'Portal search returned zero listing URLs')
  assert.ok(result.rows.length > 0, 'Portal detail parser returned zero rows')
  assert.ok(result.rows.some((row) => Boolean(row.source_listing_id)), 'Portal rows are missing stable listing IDs')
  assert.ok(result.rows.every((row) => row.price_uf == null || Number(row.price_uf) >= 100), 'Portal UF price normalization produced an implausibly small value')
  assert.ok(usableRows.length > 0, 'Portal smoke found no row with address, UF price and usable area; the data is not sufficient for valuation comparables')
  console.log('[portal-smoke] usable', usableRows.length)
  console.log('[portal-smoke] PASS')
}

main().catch((error) => {
  console.error('[portal-smoke] FAIL', error)
  process.exitCode = 1
})
