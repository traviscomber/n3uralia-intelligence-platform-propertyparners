import { NextResponse } from 'next/server'
import type { Browser } from 'puppeteer-core'
import { requireExecutiveAccess } from '@/lib/api-access'
import { launchServerlessBrowser } from '@/lib/serverless-browser'

export const runtime = 'nodejs'
export const maxDuration = 60

const searches = [
  { type: 'departamento', url: 'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana' },
  { type: 'casa', url: 'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana' },
]

function numberFrom(text: string | null, pattern: RegExp) {
  const match = text?.match(pattern)
  if (!match) return null
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function errorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) return String(error.code)
  return 'UNKNOWN'
}

function logCaptureFailure(error: unknown) {
  console.error('PORTAL_LIVE_CAPTURE_FAILED', { code: errorCode(error) })
}

export async function POST(request: Request) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
  if (request.headers.get('x-live-source-confirmed') !== 'true') {
    return NextResponse.json({ error: 'Activa la confirmación de fuente viva antes de capturar.' }, { status: 428 })
  }

  let browser: Browser | null = null

  try {
    browser = await launchServerlessBrowser()

    const observed = []
    for (const search of searches) {
      const page = await browser.newPage()
      try {
        await page.setViewport({ width: 1440, height: 1000 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7' })
        await page.setRequestInterception(true)
        page.on('request', (pending) => {
          const kind = pending.resourceType()
          if (kind === 'image' || kind === 'media' || kind === 'font') pending.abort()
          else pending.continue()
        })
        await page.goto(search.url, { waitUntil: 'domcontentloaded', timeout: 40000 })
        await new Promise((resolve) => setTimeout(resolve, 800))
        const cards = await page.evaluate(() => Array.from(document.querySelectorAll('[class*="ui-search-result"]')).slice(0, 50).map((card) => {
          const link = card.querySelector('a[href]') as HTMLAnchorElement | null
          return {
            url: link?.href || null,
            title: card.querySelector('[class*="title"]')?.textContent?.trim() || null,
            price: card.querySelector('[class*="price"]')?.textContent?.trim() || null,
            attributes: Array.from(card.querySelectorAll('[class*="attribute"]')).map((item) => item.textContent?.trim()).filter(Boolean).join(' · ') || null,
            location: card.querySelector('[class*="location"]')?.textContent?.trim() || null,
          }
        }))
        for (const card of cards) {
          if (!card.url) continue
          const id = card.url.match(/(?:MLC-?|\/)(\d{6,})/i)?.[1] || null
          const priceUf = numberFrom(card.price, /UF\s*([\d.,]+)/i)
          observed.push({
            source: 'portal_inmobiliario_live',
            capturedAt: new Date().toISOString(),
            operation: 'venta',
            commune: 'Vitacura',
            propertyType: search.type,
            listingId: id,
            sourceUrl: card.url,
            title: card.title,
            priceUf,
            currency: priceUf === null ? null : 'UF',
            publishedAt: null,
            updatedAt: null,
            listingStatus: null,
            areaM2: null,
            usefulAreaM2: null,
            terraceAreaM2: null,
            builtAreaM2: null,
            landAreaM2: null,
            attributesRaw: card.attributes,
            bedrooms: numberFrom(card.attributes, /(\d+)\s*dorm/i),
            bathrooms: numberFrom(card.attributes, /(\d+)\s*bañ/i),
            location: card.location,
            latitude: null,
            longitude: null,
            daysOnMarket: null,
            geographicQuality: 'missing',
          })
        }
      } finally {
        await page.close().catch(() => undefined)
      }
    }

    const valid = observed.filter((row) => row.listingId && row.sourceUrl)
    return NextResponse.json({
      status: 'validation_sample',
      sourceStatus: 'available',
      provenance: 'live_unreconciled',
      eligibleForAuditedViews: false,
      writesPerformed: 0,
      captured: observed.length,
      validForReconciliation: valid.length,
      rejected: observed.length - valid.length,
      records: valid,
      note: 'Muestra observada sin imputaciones. Debe conciliarse con los archivos enviados antes de aprobarse.',
    })
  } catch (error) {
    logCaptureFailure(error)
    return NextResponse.json({
      status: 'source_unavailable',
      sourceStatus: 'error',
      provenance: 'live_unreconciled',
      eligibleForAuditedViews: false,
      writesPerformed: 0,
      captured: 0,
      validForReconciliation: 0,
      rejected: 0,
      error: 'La captura viva no está disponible en este runtime. No se incorporó información al mercado canónico.',
      errorCode: errorCode(error),
    }, { status: 503 })
  } finally {
    if (browser) await browser.close().catch(() => undefined)
  }
}
