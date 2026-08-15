import assert from 'node:assert/strict'
import { launchServerlessBrowser } from '../lib/serverless-browser'
import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'

async function diagnoseSearch() {
  const browser = await launchServerlessBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7' })
    const response = await page.goto('https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana', { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      finalUrl: location.href,
      anchorCount: document.querySelectorAll('a[href]').length,
      modalityLinks: Array.from(document.querySelectorAll('a[href]'))
        .map((a) => ({ text: a.textContent?.replace(/\s+/g, ' ').trim() || '', href: (a as HTMLAnchorElement).href }))
        .filter((item) => /propiedades usadas|proyectos/i.test(item.text)),
      text: document.body?.innerText?.replace(/\s+/g, ' ').slice(0, 700) || '',
      htmlHasMlc: /MLC-?\d+/i.test(document.documentElement.innerHTML),
    }))
    console.log('[portal-diagnostic] status', response?.status() ?? null)
    console.log('[portal-diagnostic]', diagnostics)
  } finally {
    await browser.close()
  }
}

async function diagnoseDetail(url: string) {
  const browser = await launchServerlessBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7' })
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 700))
    const detail = await page.evaluate(() => {
      const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() || ''
      const interesting = /m²|dorm|bañ|bano|estacion|superficie/i
      const specLike = Array.from(document.querySelectorAll('[class*="spec"], [class*="attribute"], [class*="highlight"]'))
        .map((el) => ({ tag: el.tagName, className: el.className, text: normalize(el.textContent) }))
        .filter((item) => item.text && item.text.length < 350 && interesting.test(item.text))
        .slice(0, 40)
      const shortFacts = Array.from(document.querySelectorAll('li, p, span, div'))
        .map((el) => ({ tag: el.tagName, className: el.className, text: normalize(el.textContent) }))
        .filter((item) => item.text && item.text.length < 120 && interesting.test(item.text))
        .slice(0, 50)
      const priceLike = Array.from(document.querySelectorAll('[class*="price"], [itemprop="price"]'))
        .map((el) => ({ tag: el.tagName, className: el.className, text: normalize(el.textContent), content: el.getAttribute('content') }))
        .filter((item) => item.text || item.content)
        .slice(0, 20)
      return {
        statusTitle: document.title,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null,
        specLike,
        shortFacts,
        priceLike,
      }
    })
    console.log('[portal-detail-diagnostic] status', response?.status() ?? null)
    console.log('[portal-detail-diagnostic]', JSON.stringify(detail))
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
    maxListings: 2,
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

  if (result.listingUrls[0]) await diagnoseDetail(result.listingUrls[0])

  assert.ok(result.listingUrls.length > 0, 'Portal search returned zero listing URLs')
  assert.ok(result.rows.length > 0, 'Portal detail parser returned zero rows')
  assert.ok(result.rows.some((row) => Boolean(row.source_listing_id)), 'Portal rows are missing stable listing IDs')
  assert.ok(result.rows.every((row) => row.price_uf == null || row.price_uf >= 100), 'Portal UF price normalization produced an implausibly small value')
  console.log('[portal-smoke] PASS')
}

main().catch((error) => {
  console.error('[portal-smoke] FAIL', error)
  process.exitCode = 1
})
