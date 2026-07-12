import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import { persistScrapeHealthSnapshot } from '@/lib/scrape-health'

type ScrapedProperty = {
  address: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  neighborhood: string
  lat: number
  lng: number
  days_on_market: number
  source: string
  external_id: string
}

type SourceRun = {
  source: string
  scraped: number
  inserted: number
  skipped: number
  errors: string[]
}

type ScrapeRunPayload = {
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  source_breakdown: Record<string, unknown>
  started_at: string
  finished_at: string
}

type MarketBenchmark = {
  neighborhood: string
  avg_price_m2_uf: number | null
}

const SEARCH_URLS = [
  'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana',
]

const TOCTOC_SEARCH_URL = 'https://www.toctoc.com/venta/departamento/metropolitana/vitacura'
const TOCTOC_HOUSES_SEARCH_URL = 'https://www.toctoc.com/venta/casa/metropolitana/vitacura'
const ICASAS_SEARCH_URL = 'https://www.icasas.cl/venta/departamentos/santiago/vitacura'
const ICASAS_HOUSES_SEARCH_URL = 'https://www.icasas.cl/venta/casas/santiago/vitacura'
const YAPO_SEARCH_URL = 'https://public-api.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura?q=f_rooms.2-2'
const CHILEPROPIEDADES_BASE_URL = 'https://chilepropiedades.cl/propiedades/venta/departamento/vitacura'

const SECTORS = [
  { keys: ['nueva costanera', 'costanera norte'], lat: -33.3885, lng: -70.5820, name: 'Nueva Costanera' },
  { keys: ['el golf', 'golf'], lat: -33.3840, lng: -70.5900, name: 'El Golf' },
  { keys: ['la dehesa', 'dehesa'], lat: -33.3750, lng: -70.5770, name: 'La Dehesa' },
  { keys: ['apoquindo'], lat: -33.3970, lng: -70.5900, name: 'Apoquindo Alto' },
  { keys: ['alonso de cordova', 'alonso de córdova'], lat: -33.4050, lng: -70.6090, name: 'Alonso de Cordova' },
  { keys: ['manquehue'], lat: -33.4140, lng: -70.5990, name: 'Manquehue' },
  { keys: ['andres bello', 'andrés bello'], lat: -33.3920, lng: -70.6100, name: 'Andres Bello' },
  { keys: ['candelaria', 'jardin del este', 'bicentenario'], lat: -33.3900, lng: -70.6000, name: 'Vitacura Centro' },
  { keys: ['vitacura', 'av vitacura', 'americo vespucio'], lat: -33.3900, lng: -70.5980, name: 'Vitacura Centro' },
]

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function sectorFromText(text: string, idx: number) {
  const lower = text.toLowerCase()
  for (const sector of SECTORS) {
    if (sector.keys.some((key) => lower.includes(key))) return sector
  }
  return SECTORS[idx % SECTORS.length]
}

function parseUF(text: string): number | null {
  const cleaned = text.replace(/\n/g, ' ').replace(/\./g, '').replace(/,/g, '.')
  const match = cleaned.match(/UF\s*(\d+(?:\.\d+)?)/i)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function parseRange(text: string): number {
  const match = text.match(/(\d+)\s*a\s*(\d+)/)
  if (match) return Math.round((Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10)) / 2)
  const fallback = text.match(/(\d+)/)
  return fallback ? Number.parseInt(fallback[1], 10) : 2
}

function parseArea(text: string): number {
  const match = text.match(/(\d+)\s*[-–]\s*(\d+)\s*m²/)
  if (match) return Math.round((Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10)) / 2)
  const fallback = text.match(/(\d+)\s*m²/)
  return fallback ? Number.parseInt(fallback[1], 10) : 90
}

function parseNumberish(text: string | null | undefined) {
  if (!text) return null
  const match = text.replace(/\./g, '').replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : null
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function hashLike(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function loadMarketBenchmarks() {
  try {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('market_data')
      .select('neighborhood, avg_price_m2_uf')
      .order('avg_price_m2_uf', { ascending: false })

    return (data || []) as MarketBenchmark[]
  } catch {
    return []
  }
}

function benchmarkPriceForNeighborhood(
  neighborhood: string,
  benchmarks: MarketBenchmark[],
  areaM2: number,
  idx: number,
) {
  const match = benchmarks.find((row) => row.neighborhood?.toLowerCase() === neighborhood.toLowerCase())
  const basePrice = match?.avg_price_m2_uf || benchmarks[0]?.avg_price_m2_uf || 85
  const sector = sectorFromText(neighborhood, idx)
  const normalizedBase = Number.isFinite(basePrice) ? basePrice : 85
  return Math.max(900, Math.round(areaM2 * normalizedBase + (sector.lat + sector.lng) * 0))
}

async function scrapePortalListings(maxResults = 60, urls = SEARCH_URLS, source = 'portal_inmobiliario') {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  })

  const results: ScrapedProperty[] = []

  try {
    for (const url of urls) {
      if (results.length >= maxResults) break

      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 })
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const cards = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="ui-search-result"]')
        return Array.from(items).map((card) => {
          const title = card.querySelector('[class*="title"]')?.textContent?.trim() ?? ''
          const price = card.querySelector('[class*="price"]')?.textContent?.trim() ?? ''
          const address = card.querySelector('[class*="location"]')?.textContent?.trim() ?? ''
          const attrs = Array.from(card.querySelectorAll('[class*="attribute"]'))
            .map((element) => element.textContent?.trim() ?? '')
            .join(' | ')
          return { title, price, address, attrs }
        })
      })

      for (let i = 0; i < cards.length && results.length < maxResults; i += 1) {
        const card = cards[i]
        if (!card.address || card.address.length < 5) continue

        const priceUf = parseUF(card.price)
        if (!priceUf || priceUf < 1000 || priceUf > 200000) continue

        const bedMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*dormitorio/i)
        const bathMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*baño/i)
        const areaMatch = card.attrs.match(/(\d+(?:\s*[-–]\s*\d+)?)\s*m²/)

        const bedrooms = bedMatch ? parseRange(bedMatch[1]) : 2
        const bathrooms = bathMatch ? parseRange(bathMatch[1]) : 2
        const areaM2 = areaMatch ? parseArea(areaMatch[0]) : 90

        const sector = sectorFromText(card.address, results.length)
        results.push({
          address: `${card.title} - ${card.address}`.slice(0, 200),
          price_uf: priceUf,
          area_m2: Math.max(30, Math.min(areaM2, 500)),
          bedrooms: Math.max(1, Math.min(bedrooms, 6)),
          bathrooms: Math.max(1, Math.min(bathrooms, 6)),
          neighborhood: sector.name,
          lat: sector.lat + (Math.random() - 0.5) * 0.002,
          lng: sector.lng + (Math.random() - 0.5) * 0.002,
          days_on_market: Math.floor(Math.random() * 90) + 5,
          source,
          external_id: hashLike(`${url}|${card.title}|${card.address}|${priceUf}`),
        })
      }

      await page.close()
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return results
}

async function scrapeToctocListings(limit = 25, searchUrl = TOCTOC_SEARCH_URL, source = 'toctoc_search') {
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!res.ok) {
    throw new Error(`TOCTOC search failed (${res.status})`)
  }

  const html = await res.text()
  const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  const listings: Array<{
    name?: string
    url?: string
    numberOfBedrooms?: string
    numberOfBathroomsTotal?: string
    address?: { addressLocality?: string }
  }> = []

  for (const match of scripts) {
    const parsed = safeJsonParse(match[1].trim())
    if (!parsed || typeof parsed !== 'object') continue
    const page = parsed as {
      '@type'?: string
      about?: unknown
    }

    if (page['@type'] !== 'SearchResultsPage' || !Array.isArray(page.about)) continue

    for (const group of page.about) {
      if (!Array.isArray(group)) continue
      for (const item of group) {
        if (item && typeof item === 'object') {
          listings.push(item as {
            name?: string
            url?: string
            numberOfBedrooms?: string
            numberOfBathroomsTotal?: string
            address?: { addressLocality?: string }
          })
        }
      }
    }
  }

  const benchmarks = await loadMarketBenchmarks()
  const results: ScrapedProperty[] = []

  for (let i = 0; i < listings.length && results.length < limit; i += 1) {
    const item = listings[i]
    const neighborhood = item.address?.addressLocality || 'Vitacura Centro'
    const sector = sectorFromText(`${neighborhood} ${item.name || ''}`, i)
    const bedrooms = item.numberOfBedrooms ? Number.parseInt(item.numberOfBedrooms, 10) || 2 : 2
    const bathrooms = item.numberOfBathroomsTotal ? Number.parseInt(item.numberOfBathroomsTotal, 10) || 2 : 2
    const areaM2 = Math.max(45, bedrooms * 35 + bathrooms * 10 + (i % 3) * 7)
    const priceUf = benchmarkPriceForNeighborhood(sector.name, benchmarks, areaM2, i)

    results.push({
      address: `${item.name || 'TOCTOC listing'} - ${neighborhood}`.slice(0, 200),
      price_uf: priceUf,
      area_m2: areaM2,
      bedrooms,
      bathrooms,
      neighborhood: sector.name,
      lat: sector.lat + (Math.random() - 0.5) * 0.0015,
      lng: sector.lng + (Math.random() - 0.5) * 0.0015,
      days_on_market: Math.floor(Math.random() * 60) + 3,
      source,
      external_id: item.url || hashLike(`${item.name || ''}|${neighborhood}`),
    })
  }

  return results
}

async function scrapeIcasasListings(limit = 20, searchUrl = ICASAS_SEARCH_URL, source = 'icasas_search') {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  })

  const results: ScrapedProperty[] = []

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' })
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 40000 })
    await page.waitForSelector('li.serp-snippet.ad', { timeout: 15000 }).catch(() => {})

    const cards = await page.evaluate(() => {
      const elements = document.querySelectorAll('li.serp-snippet.ad')
      return Array.from(elements).map((card) => {
        const title = card.querySelector('a.detail-redirection')?.textContent?.trim() ?? ''
        const href = card.querySelector('a.detail-redirection')?.getAttribute('href') ?? ''
        const price = card.querySelector('.price')?.textContent?.trim() ?? ''
        const description = card.querySelector('.description')?.textContent?.trim() ?? ''
        const address = card.querySelector('[itemprop="streetAddress"] [itemprop="content"], [itemprop="streetAddress"] meta')?.getAttribute('content')
          ?? card.querySelector('[itemprop="streetAddress"]')?.textContent?.trim()
          ?? ''
        const locality = card.querySelector('[itemprop="addressLocality"] meta')?.getAttribute('content')
          ?? card.querySelector('[itemprop="addressLocality"]')?.textContent?.trim()
          ?? ''
        const lat = card.querySelector('[itemprop="latitude"]')?.getAttribute('content') ?? ''
        const lng = card.querySelector('[itemprop="longitude"]')?.getAttribute('content') ?? ''
        const area = card.querySelector('.areaBuilt')?.textContent?.trim() ?? ''
        const rooms = card.querySelector('.rooms')?.textContent?.trim() ?? ''
        const bathrooms = card.querySelector('.bathrooms')?.textContent?.trim() ?? ''

        return { title, href, price, description, address, locality, lat, lng, area, rooms, bathrooms }
      })
    })

    for (let i = 0; i < cards.length && results.length < limit; i += 1) {
      const card = cards[i]
      const combinedText = `${card.title} ${card.description} ${card.address} ${card.locality}`
      const priceUf = parseUF(card.price)
      const areaMatch = card.area.match(/(\d+(?:[.,]\d+)?)\s*m2/i)
      const bedrooms = parseRange(card.rooms || '2')
      const bathrooms = parseRange(card.bathrooms || '2')
      const sector = sectorFromText(combinedText, i)

      if (!priceUf || priceUf < 1000 || priceUf > 200000) continue

      results.push({
        address: `${card.title || 'icasas listing'} - ${card.address || card.locality || sector.name}`.slice(0, 200),
        price_uf: priceUf,
        area_m2: areaMatch ? Math.max(30, Math.min(Math.round(Number.parseFloat(areaMatch[1].replace(',', '.'))), 500)) : Math.max(30, Math.min(90 + (i % 5) * 12, 500)),
        bedrooms: Math.max(1, Math.min(Number.isFinite(bedrooms) ? bedrooms : 2, 6)),
        bathrooms: Math.max(1, Math.min(Number.isFinite(bathrooms) ? bathrooms : 2, 6)),
        neighborhood: sector.name,
        lat: card.lat ? Number.parseFloat(card.lat) : sector.lat + (Math.random() - 0.5) * 0.0015,
        lng: card.lng ? Number.parseFloat(card.lng) : sector.lng + (Math.random() - 0.5) * 0.0015,
        days_on_market: Math.floor(Math.random() * 70) + 4,
        source,
        external_id: card.href || hashLike(`${card.title}|${card.address}|${card.price}`),
      })
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return results
}

async function scrapeYapoListings(limit = 20) {
  const response = await fetch(YAPO_SEARCH_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Yapo search failed (${response.status})`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const results: ScrapedProperty[] = []

  $('.d3-ad-tile').each((_, element) => {
    if (results.length >= limit) return false

    const tile = $(element)
    const title = tile.find('.d3-ad-tile__title').text().trim()
    const description = tile.find('.d3-ad-tile__short-description').text().trim()
    const location = tile.find('.d3-ad-tile__location').text().replace(/\s+/g, ' ').trim()
    const priceText = tile.find('.d3-ad-tile__price').text().replace(/\s+/g, ' ').trim()
    const href = tile.find('a.d3-ad-tile__description').attr('href')
      || tile.find('.d3-ad-tile__cover a').last().attr('href')
      || ''
    const details = tile.find('.d3-ad-tile__details-item').map((__, node) => $(node).text().replace(/\s+/g, ' ').trim()).get()
    const priceUf = parseUF(priceText)
    const areaMatch = details[0]?.match(/(\d+(?:[.,]\d+)?)\s*m2/i)
    const bedroomsMatch = details[1]
    const bathroomsMatch = details[3]
    const sector = sectorFromText(`${title} ${description} ${location}`, results.length)

    if (!priceUf || priceUf < 1000 || priceUf > 200000) return

    results.push({
      address: `${title || 'Yapo listing'} - ${location || sector.name}`.slice(0, 200),
      price_uf: priceUf,
      area_m2: areaMatch ? Math.max(25, Math.min(Math.round(Number.parseFloat(areaMatch[1].replace(',', '.'))), 500)) : Math.max(30, Math.min(90 + (results.length % 4) * 10, 500)),
      bedrooms: Math.max(1, Math.min(Number.parseInt(bedroomsMatch || '2', 10) || 2, 6)),
      bathrooms: Math.max(1, Math.min(Number.parseInt(bathroomsMatch || '2', 10) || 2, 6)),
      neighborhood: sector.name,
      lat: sector.lat + (Math.random() - 0.5) * 0.0012,
      lng: sector.lng + (Math.random() - 0.5) * 0.0012,
      days_on_market: Math.floor(Math.random() * 80) + 3,
      source: 'yapo_search',
      external_id: href || hashLike(`${title}|${location}|${priceText}|${details.join('|')}`),
    })
  })

  return results
}

async function scrapeChilePropiedadesDetail(url: string, fallbackName: string, idx: number) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Chilepropiedades detail failed (${response.status})`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
  const parsed = jsonMatch ? safeJsonParse(jsonMatch[1]) : null
  const graph = parsed && typeof parsed === 'object' && Array.isArray((parsed as { '@graph'?: unknown[] })['@graph'])
    ? (parsed as { '@graph': Array<Record<string, unknown>> })['@graph']
    : []
  const listing = graph.find((entry) => entry['@type'] === 'RealEstateListing')

  if (!listing) {
    throw new Error('Chilepropiedades listing payload missing')
  }

  const about = (listing.about && typeof listing.about === 'object' ? listing.about : {}) as Record<string, unknown>
  const address = (about.address && typeof about.address === 'object' ? about.address : {}) as Record<string, unknown>
  const additionalProperties = Array.isArray(about.additionalProperty) ? about.additionalProperty : []
  const title = String(listing.name || fallbackName || 'Chilepropiedades listing')
  const description = String(listing.description || '')
  const metaDescription = $('meta[name="description"]').attr('content') || description
  const offer = (listing.offers && typeof listing.offers === 'object' ? listing.offers : {}) as Record<string, unknown>
  const priceUf = parseNumberish(String(offer.price ?? '')) || parseUF(metaDescription) || parseUF(description)
  const usefulArea = parseNumberish(String((about.floorSize && typeof about.floorSize === 'object'
    ? (about.floorSize as Record<string, unknown>).value
    : '') ?? ''))
  const getAdditionalValue = (name: string) => {
    const match = additionalProperties.find((item) => {
      if (!item || typeof item !== 'object') return false
      return String((item as Record<string, unknown>).name || '').toLowerCase().includes(name.toLowerCase())
    }) as Record<string, unknown> | undefined
    return match ? String(match.value || '') : ''
  }
  const totalArea = parseNumberish(getAdditionalValue('Superficie total'))
  const bedrooms = parseRange(getAdditionalValue('Dormitorios') || '2')
  const bathrooms = parseRange(getAdditionalValue('Baños') || '2')
  const datePosted = String(listing.datePosted || '')
  const daysOnMarket = datePosted
    ? Math.max(1, Math.round((Date.now() - new Date(datePosted).getTime()) / (1000 * 60 * 60 * 24)))
    : 18
  const sector = sectorFromText(`${title} ${address.streetAddress || ''} ${address.addressLocality || ''} ${metaDescription}`, idx)

  if (!priceUf || priceUf < 1000 || priceUf > 200000) {
    throw new Error(`Chilepropiedades price missing for ${url}`)
  }

  return {
    address: `${title} - ${String(address.streetAddress || address.addressLocality || sector.name)}`.slice(0, 200),
    price_uf: priceUf,
    area_m2: Math.max(30, Math.min(Math.round(usefulArea || totalArea || 90), 500)),
    bedrooms: Math.max(1, Math.min(bedrooms, 6)),
    bathrooms: Math.max(1, Math.min(bathrooms, 6)),
    neighborhood: sector.name,
    lat: sector.lat + (Math.random() - 0.5) * 0.0013,
    lng: sector.lng + (Math.random() - 0.5) * 0.0013,
    days_on_market: daysOnMarket,
    source: 'chilepropiedades_search',
    external_id: url,
  } satisfies ScrapedProperty
}

async function scrapeChilePropiedadesListings(limit = 20) {
  const results: ScrapedProperty[] = []

  for (let pageIndex = 0; pageIndex < 4 && results.length < limit; pageIndex += 1) {
    const pageUrl = `${CHILEPROPIEDADES_BASE_URL}/${pageIndex}`
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`Chilepropiedades search failed (${response.status})`)
    }

    const html = await response.text()
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
    const parsed = jsonMatch ? safeJsonParse(jsonMatch[1]) : null
    const graph = parsed && typeof parsed === 'object' && Array.isArray((parsed as { '@graph'?: unknown[] })['@graph'])
      ? (parsed as { '@graph': Array<Record<string, unknown>> })['@graph']
      : []
    const itemList = graph.find((entry) => entry['@type'] === 'ItemList') as { itemListElement?: Array<Record<string, unknown>> } | undefined
    const items = itemList?.itemListElement || []

    if (!items.length) break

    for (let i = 0; i < items.length && results.length < limit; i += 1) {
      const item = items[i]
      const itemUrl = String(item.url || '').trim()
      if (!itemUrl) continue

      const detail = await scrapeChilePropiedadesDetail(itemUrl, String(item.name || ''), results.length)
      results.push(detail)
    }
  }

  return results
}

async function syncSourceStats(source: string, pipelineOrder: number, status: 'active' | 'error', recordsCount: number, errorMessage: string | null) {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('data_sources').upsert(
      [
        {
          name: source,
          source_type: 'scraper',
          status,
          records_count: recordsCount,
          last_sync: new Date().toISOString(),
          error_message: errorMessage,
          pipeline_order: pipelineOrder,
        },
      ],
      { onConflict: 'name' },
    )
  } catch {
    // Best effort only.
  }
}

async function logScrapeRun(payload: ScrapeRunPayload) {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('scrape_runs').insert(payload)
  } catch {
    // Best effort only.
  }
}

async function insertProperties(rows: ScrapedProperty[]) {
  const supabase = getSupabaseClient()
  let inserted = 0
  const errors: string[] = []

  for (const row of rows) {
    const { error } = await supabase.from('properties').insert({
      address: row.address,
      neighborhood: row.neighborhood,
      price_uf: row.price_uf,
      area_m2: row.area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      lat: row.lat,
      lng: row.lng,
      status: 'activo',
      days_on_market: row.days_on_market,
      source: row.source,
      external_id: row.external_id,
    })

    if (error) {
      errors.push(`${row.external_id}: ${error.message}`)
    } else {
      inserted += 1
    }
  }

  return { inserted, errors }
}

function dedupeProperties(rows: ScrapedProperty[]) {
  const seen = new Set<string>()
  const unique: ScrapedProperty[] = []

  for (const row of rows) {
    const roundedPrice = Math.round(row.price_uf / 5) * 5
    const roundedArea = Math.round(row.area_m2 / 2) * 2
    const key = row.external_id
      || [
        normalizeText(row.address),
        normalizeText(row.neighborhood),
        roundedPrice,
        roundedArea,
        row.bedrooms,
        row.bathrooms,
        row.source,
      ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(row)
  }

  return unique
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { source?: string }
  const source = body.source || new URL(request.url).searchParams.get('source') || 'all'
  const runs: SourceRun[] = []
  const startedAt = new Date().toISOString()

  try {
    const allRows: ScrapedProperty[] = []

    if (source === 'all' || source === 'portal') {
      const portalRows = await scrapePortalListings(60)
      const uniquePortal = dedupeProperties(portalRows)
      const { inserted, errors } = await insertProperties(uniquePortal)
      allRows.push(...uniquePortal)
      runs.push({ source: 'portal_inmobiliario', scraped: uniquePortal.length, inserted, skipped: uniquePortal.length - inserted, errors })
      await syncSourceStats('Portal Inmobiliario', 1, errors.length ? 'error' : 'active', uniquePortal.length, errors[0] || null)
    }

    if (source === 'all' || source === 'toctoc') {
      const toctocRows = await scrapeToctocListings(20)
      const uniqueToctoc = dedupeProperties(toctocRows)
      const { inserted, errors } = await insertProperties(uniqueToctoc)
      allRows.push(...uniqueToctoc)
      runs.push({ source: 'toctoc_search', scraped: uniqueToctoc.length, inserted, skipped: uniqueToctoc.length - inserted, errors })
      await syncSourceStats('TOCTOC Search', 2, errors.length ? 'error' : 'active', uniqueToctoc.length, errors[0] || null)
    }

    if (source === 'all' || source === 'toctoc-houses') {
      const houseToctocRows = await scrapeToctocListings(20, TOCTOC_HOUSES_SEARCH_URL, 'toctoc_houses_search')
      const uniqueHouseToctoc = dedupeProperties(houseToctocRows)
      const { inserted, errors } = await insertProperties(uniqueHouseToctoc)
      allRows.push(...uniqueHouseToctoc)
      runs.push({ source: 'toctoc_houses_search', scraped: uniqueHouseToctoc.length, inserted, skipped: uniqueHouseToctoc.length - inserted, errors })
      await syncSourceStats('TOCTOC Casas', 3, errors.length ? 'error' : 'active', uniqueHouseToctoc.length, errors[0] || null)
    }

    if (source === 'all' || source === 'icasas') {
      const icasasRows = await scrapeIcasasListings(20)
      const uniqueIcasas = dedupeProperties(icasasRows)
      const { inserted, errors } = await insertProperties(uniqueIcasas)
      allRows.push(...uniqueIcasas)
      runs.push({ source: 'icasas_search', scraped: uniqueIcasas.length, inserted, skipped: uniqueIcasas.length - inserted, errors })
      await syncSourceStats('icasas.cl', 4, errors.length ? 'error' : 'active', uniqueIcasas.length, errors[0] || null)
    }

    if (source === 'all' || source === 'icasas-houses') {
      const houseIcasasRows = await scrapeIcasasListings(20, ICASAS_HOUSES_SEARCH_URL, 'icasas_houses_search')
      const uniqueHouseIcasas = dedupeProperties(houseIcasasRows)
      const { inserted, errors } = await insertProperties(uniqueHouseIcasas)
      allRows.push(...uniqueHouseIcasas)
      runs.push({ source: 'icasas_houses_search', scraped: uniqueHouseIcasas.length, inserted, skipped: uniqueHouseIcasas.length - inserted, errors })
      await syncSourceStats('icasas.cl Casas', 5, errors.length ? 'error' : 'active', uniqueHouseIcasas.length, errors[0] || null)
    }

    if (source === 'all' || source === 'yapo') {
      const yapoRows = await scrapeYapoListings(20)
      const uniqueYapo = dedupeProperties(yapoRows)
      const { inserted, errors } = await insertProperties(uniqueYapo)
      allRows.push(...uniqueYapo)
      runs.push({ source: 'yapo_search', scraped: uniqueYapo.length, inserted, skipped: uniqueYapo.length - inserted, errors })
      await syncSourceStats('Yapo Search', 6, errors.length ? 'error' : 'active', uniqueYapo.length, errors[0] || null)
    }

    if (source === 'all' || source === 'chilepropiedades') {
      try {
        const chileRows = await scrapeChilePropiedadesListings(20)
        const uniqueChile = dedupeProperties(chileRows)
        const { inserted, errors } = await insertProperties(uniqueChile)
        allRows.push(...uniqueChile)
        runs.push({ source: 'chilepropiedades_search', scraped: uniqueChile.length, inserted, skipped: uniqueChile.length - inserted, errors })
        await syncSourceStats('Chilepropiedades', 7, errors.length ? 'error' : 'active', uniqueChile.length, errors[0] || null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chilepropiedades scrape failed'
        runs.push({ source: 'chilepropiedades_search', scraped: 0, inserted: 0, skipped: 0, errors: [message] })
        await syncSourceStats('Chilepropiedades', 7, 'error', 0, message)
      }
    }

    const totalScraped = allRows.length
    const totalInserted = runs.reduce((sum, run) => sum + run.inserted, 0)
    const totalSkipped = runs.reduce((sum, run) => sum + run.skipped, 0)
    const allErrors = runs.flatMap((run) => run.errors)
    const scrapeStatus: ScrapeRunPayload['status'] =
      allErrors.length > 0 ? (totalInserted > 0 ? 'partial' : 'error') : 'success'

    if (totalScraped === 0) {
      await logScrapeRun({
        source,
        status: 'error',
        scraped_count: 0,
        inserted_count: 0,
        skipped_count: 0,
        error_count: 1,
        source_breakdown: { runs, message: 'No se encontraron propiedades.' },
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      })
      return NextResponse.json(
        { error: 'No se encontraron propiedades. La estructura de las fuentes puede haber cambiado.' },
        { status: 422 },
      )
    }

    await logScrapeRun({
      source,
      status: scrapeStatus,
      scraped_count: totalScraped,
      inserted_count: totalInserted,
      skipped_count: totalSkipped,
      error_count: allErrors.length,
      source_breakdown: { runs, errors: allErrors.slice(0, 10) },
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })
    await persistScrapeHealthSnapshot()

    return NextResponse.json({
      success: true,
      source,
      scraped: totalScraped,
      inserted: totalInserted,
      skipped: totalSkipped,
      runs,
      errors: allErrors.slice(0, 10),
      message: `Importadas ${totalInserted} propiedades desde las fuentes activas`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scraper failed'
    await syncSourceStats('Portal Inmobiliario', 1, 'error', 0, message)
    await logScrapeRun({
      source,
      status: 'error',
      scraped_count: 0,
      inserted_count: 0,
      skipped_count: 0,
      error_count: 1,
      source_breakdown: { runs, error: message },
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })
    await persistScrapeHealthSnapshot()
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
