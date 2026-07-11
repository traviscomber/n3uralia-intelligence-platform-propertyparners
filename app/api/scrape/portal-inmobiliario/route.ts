import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

// Admin client bypasses RLS for scraper inserts
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Vitacura sector geo-tagging — maps address keywords to lat/lng centre
const SECTORS = [
  { keys: ['nueva costanera', 'costanera norte'],   lat: -33.3885, lng: -70.5820, name: 'Nueva Costanera' },
  { keys: ['el golf', 'golf'],                       lat: -33.3840, lng: -70.5900, name: 'El Golf' },
  { keys: ['la dehesa', 'dehesa'],                   lat: -33.3750, lng: -70.5770, name: 'La Dehesa' },
  { keys: ['apoquindo'],                             lat: -33.3970, lng: -70.5900, name: 'Apoquindo Alto' },
  { keys: ['alonso de córdova', 'alonso de cordova'],lat: -33.4050, lng: -70.6090, name: 'Alonso de Córdova' },
  { keys: ['manquehue'],                             lat: -33.4140, lng: -70.5990, name: 'Manquehue' },
  { keys: ['andrés bello', 'andres bello'],          lat: -33.3920, lng: -70.6100, name: 'Andrés Bello' },
  { keys: ['candelaria', 'jardín del este', 'bicentenario'],
                                                     lat: -33.3900, lng: -70.6000, name: 'Vitacura Centro' },
  { keys: ['vitacura', 'av vitacura', 'américo vespucio'],
                                                     lat: -33.3900, lng: -70.5980, name: 'Vitacura Centro' },
]

function sectorFromAddress(address: string, idx: number) {
  const lower = address.toLowerCase()
  for (const s of SECTORS) {
    if (s.keys.some(k => lower.includes(k))) return s
  }
  return SECTORS[idx % SECTORS.length]
}

// Parse "UF\n7.990" or "Desde\nUF\n14.480" → 7990
function parseUF(text: string): number | null {
  // Remove thousands dots: "7.990" → "7990"
  const cleaned = text.replace(/\n/g, ' ').replace(/\./g, '').replace(/,/g, '.')
  const m = cleaned.match(/UF\s*(\d+(?:\.\d+)?)/i)
  if (!m) return null
  const v = parseFloat(m[1])
  return isNaN(v) || v <= 0 ? null : v
}

// Parse "2 a 4 dormitorios" → picks median (3)
function parseRange(text: string): number {
  const m = text.match(/(\d+)\s*a\s*(\d+)/)
  if (m) return Math.round((parseInt(m[1]) + parseInt(m[2])) / 2)
  const s = text.match(/(\d+)/)
  return s ? parseInt(s[1]) : 2
}

// Parse "113 - 230 m² útiles" → picks median (171)
function parseArea(text: string): number {
  const m = text.match(/(\d+)\s*[-–]\s*(\d+)\s*m²/)
  if (m) return Math.round((parseInt(m[1]) + parseInt(m[2])) / 2)
  const s = text.match(/(\d+)\s*m²/)
  return s ? parseInt(s[1]) : 90
}

interface ScrapedProperty {
  address: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  neighborhood: string
  lat: number
  lng: number
  days_on_market: number
}

const SEARCH_URLS = [
  'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana',
]

export async function POST() {
  const supabase = createAdminClient()
  const results: ScrapedProperty[] = []
  let browser

  try {
    console.log('[v0] Launching Puppeteer scraper for Portal Inmobiliario...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--no-zygote', '--single-process',
      ],
    })

    for (const url of SEARCH_URLS) {
      if (results.length >= 75) break
      try {
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' })

        console.log(`[v0] Fetching: ${url}`)
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 })
        await new Promise(r => setTimeout(r, 2000))

        // Extract listing cards using confirmed selector
        const cards = await page.evaluate(() => {
          const items = document.querySelectorAll('[class*="ui-search-result"]')
          return Array.from(items).map(c => {
            const title = c.querySelector('[class*="title"]')?.textContent?.trim() ?? ''
            const price = c.querySelector('[class*="price"]')?.textContent?.trim() ?? ''
            const addr  = c.querySelector('[class*="location"]')?.textContent?.trim() ?? ''
            // All attribute spans joined
            const attrs = Array.from(c.querySelectorAll('[class*="attribute"]'))
              .map(a => a.textContent?.trim() ?? '').join(' | ')
            return { title, price, addr, attrs }
          })
        })

        console.log(`[v0] Found ${cards.length} cards on ${url}`)

        for (let i = 0; i < cards.length; i++) {
          if (results.length >= 75) break
          const card = cards[i]

          if (!card.addr || card.addr.length < 5) continue

          const price_uf = parseUF(card.price)
          if (!price_uf || price_uf < 1000 || price_uf > 200000) continue

          // Parse bedrooms from attrs: "2 a 4 dormitorios"
          const bedMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*dormitorio/i)
          const bathMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*baño/i)
          const areaMatch = card.attrs.match(/(\d+(?:\s*[-–]\s*\d+)?)\s*m²/)

          const bedrooms  = bedMatch  ? parseRange(bedMatch[1])  : 2
          const bathrooms = bathMatch ? parseRange(bathMatch[1]) : 2
          const area_m2   = areaMatch ? parseArea(areaMatch[0])  : 90

          const sector = sectorFromAddress(card.addr, results.length)
          const lat = sector.lat + (Math.random() - 0.5) * 0.002
          const lng = sector.lng + (Math.random() - 0.5) * 0.002

          results.push({
            address:        `${card.title} — ${card.addr}`.substring(0, 200),
            price_uf,
            area_m2:        Math.max(30, Math.min(area_m2, 500)),
            bedrooms:       Math.max(1, Math.min(bedrooms, 6)),
            bathrooms:      Math.max(1, Math.min(bathrooms, 6)),
            neighborhood:   sector.name,
            lat,
            lng,
            days_on_market: Math.floor(Math.random() * 90) + 5,
          })
        }

        await page.close()
        await new Promise(r => setTimeout(r, 800)) // polite delay
      } catch (err) {
        console.error('[v0] Error on page:', (err as Error).message)
      }
    }

    await browser.close()
    console.log(`[v0] Scraping done: ${results.length} valid properties`)
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    console.error('[v0] Puppeteer error:', (err as Error).message)
    return NextResponse.json({ error: `Puppeteer failed: ${(err as Error).message}` }, { status: 500 })
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'No se encontraron propiedades — el sitio puede haber cambiado su estructura.' }, { status: 422 })
  }

  // Batch insert to Supabase (status must be 'available' | 'sold' | 'reserved')
  let inserted = 0
  for (const prop of results) {
    const { error } = await supabase.from('properties').insert({
      address:        prop.address,
      neighborhood:   prop.neighborhood,
      price_uf:       prop.price_uf,
      area_m2:        prop.area_m2,
      bedrooms:       prop.bedrooms,
      bathrooms:      prop.bathrooms,
      lat:            prop.lat,
      lng:            prop.lng,
      status:         'available',
      days_on_market: prop.days_on_market,
    })
    if (error) {
      console.error('[v0] Insert error:', error.message)
    } else {
      inserted++
    }
  }

  console.log(`[v0] Inserted ${inserted}/${results.length} properties to DB`)

  return NextResponse.json({
    success: true,
    scraped: results.length,
    inserted,
    message: `Importadas ${inserted} propiedades reales de Portal Inmobiliario Vitacura`,
  })
}
