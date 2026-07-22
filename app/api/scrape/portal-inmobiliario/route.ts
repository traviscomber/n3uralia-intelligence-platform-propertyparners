import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { requireExecutiveAccess } from '@/lib/api-access'

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

export async function POST(request: Request) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
  if (request.headers.get('x-live-source-confirmed') !== 'true') {
    return NextResponse.json({ error: 'Activa la confirmación de fuente viva antes de capturar.' }, { status: 428 })
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
  try {
    const observed = []
    for (const search of searches) {
      const page = await browser.newPage()
      await page.goto(search.url, { waitUntil: 'domcontentloaded', timeout: 40000 })
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
        observed.push({
          source: 'portal_inmobiliario_live',
          capturedAt: new Date().toISOString(),
          operation: 'venta',
          commune: 'Vitacura',
          propertyType: search.type,
          listingId: id,
          sourceUrl: card.url,
          title: card.title,
          priceUf: numberFrom(card.price, /UF\s*([\d.,]+)/i),
          areaM2: null,
          attributesRaw: card.attributes,
          bedrooms: numberFrom(card.attributes, /(\d+)\s*dorm/i),
          bathrooms: numberFrom(card.attributes, /(\d+)\s*bañ/i),
          location: card.location,
          latitude: null,
          longitude: null,
          daysOnMarket: null,
        })
      }
      await page.close()
    }

    const valid = observed.filter((row) => row.listingId && row.sourceUrl)
    return NextResponse.json({
      status: 'validation_sample',
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible capturar la fuente viva.', writesPerformed: 0 }, { status: 502 })
  } finally {
    await browser.close()
  }
}
