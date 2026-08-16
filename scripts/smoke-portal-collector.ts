import assert from 'node:assert/strict'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'
import type { PortalDatasetKind } from '../lib/market-source-import'
import { launchServerlessBrowser } from '../lib/serverless-browser'

const datasets: PortalDatasetKind[] = [
  'portal_apartments',
  'portal_houses',
  'portal_projects',
]

async function configuredPage(browser: Awaited<ReturnType<typeof launchServerlessBrowser>>) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7' })
  return page
}

async function diagnoseLocation(url: string) {
  const browser = await launchServerlessBrowser()
  try {
    const page = await configuredPage(browser)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 900))
    const candidates = await page.evaluate(() => Array.from(document.querySelectorAll('body *'))
      .map((el) => ({
        tag: el.tagName,
        className: typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '',
        text: ((el as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((item) => item.text && /Vitacura|Región Metropolitana|Metropolitana|ubicación|ubicacion|dirección|direccion/i.test(item.text))
      .filter((item) => item.text.length <= 320)
      .slice(0, 30))
    console.log('[portal-location-diagnostic]', candidates)
  } finally {
    await browser.close()
  }
}

async function diagnoseEmptySearch(url: string) {
  const browser = await launchServerlessBrowser()
  try {
    const page = await configuredPage(browser)
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const diagnostic = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 3000),
      anchors: Array.from(document.querySelectorAll('a[href]'))
        .map((anchor) => ({ text: (anchor.textContent || '').replace(/\s+/g, ' ').trim(), href: (anchor as HTMLAnchorElement).href }))
        .filter((item) => /proyecto|departamento|vitacura|nva/i.test(`${item.text} ${item.href}`))
        .slice(0, 80),
    }))
    console.log('[portal-empty-search-diagnostic]', { status: response?.status(), ...diagnostic })
  } finally {
    await browser.close()
  }
}

async function smoke(datasetKind: PortalDatasetKind) {
  const result = await collectPortalVitacura({
    datasetKind,
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 1,
    maxListings: 3,
    waitMs: 300,
  })

  console.log(`[portal-smoke:${datasetKind}] search`, result.searchUrls[0])
  console.log(`[portal-smoke:${datasetKind}] discovered`, result.listingUrls.length)
  console.log(`[portal-smoke:${datasetKind}] parsed`, result.rows.length)
  console.log(`[portal-smoke:${datasetKind}] failures`, result.failures.length)

  const usableRows = result.rows.filter((row) =>
    Boolean(row.source_listing_id)
    && Boolean(row.url)
    && Boolean(row.address)
    && Number(row.price_uf) >= 100
    && (Number(row.useful_area_m2) > 5 || Number(row.built_area_m2) > 5 || Number(row.land_area_m2) > 5),
  )

  for (const row of result.rows) {
    console.log(`[portal-smoke:${datasetKind}] row`, {
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
    })
  }

  if (!result.listingUrls.length && result.searchUrls[0]) await diagnoseEmptySearch(result.searchUrls[0])
  else if (!usableRows.length && result.listingUrls[0]) await diagnoseLocation(result.listingUrls[0])

  assert.ok(result.listingUrls.length > 0, `${datasetKind}: Portal search returned zero listing URLs`)
  assert.ok(result.rows.length > 0, `${datasetKind}: Portal detail parser returned zero rows`)
  assert.ok(result.rows.some((row) => Boolean(row.source_listing_id)), `${datasetKind}: rows are missing stable listing IDs`)
  assert.ok(result.rows.every((row) => row.price_uf == null || Number(row.price_uf) >= 100), `${datasetKind}: implausibly small UF price`)
  assert.ok(usableRows.length > 0, `${datasetKind}: no commercially usable row found`)

  console.log(`[portal-smoke:${datasetKind}] usable`, usableRows.length)
}

async function main() {
  for (const datasetKind of datasets) {
    await smoke(datasetKind)
  }
  console.log('[portal-smoke] PASS all datasets')
}

main().catch((error) => {
  console.error('[portal-smoke] FAIL', error)
  process.exitCode = 1
})
