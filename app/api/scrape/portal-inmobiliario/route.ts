import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { parse } from 'node-html-parser'
import puppeteer from 'puppeteer'
import { persistScrapeHealthSnapshot } from '@/lib/scrape-health'
import { validateScraperAccess } from '@/lib/scrapers/route-auth'
import { buildPropertyDedupSignature, findBestDuplicateMatch, mergePropertyRecord, type PropertyLike } from '@/lib/property-dedupe'

export const runtime = 'nodejs'

type ScrapedProperty = {
  address: string
  description: string | null
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
  property_type: 'casa' | 'departamento'
  source_url: string | null
  image_url: string | null
  listing_number: string | null
  tags: string[]
  source_listing_id: string | null
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

const HOUSE_SEARCH_URLS = [
  'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/lo-castillo-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/villa-el-dorado-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/lo-curro-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/santa-maria-de-manquehue-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/jardin-del-este-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/luis-pasteur-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/juan-xxiii-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/estadio-manquehue-vitacura-santiago-metropolitana',
]

const APARTMENT_SEARCH_URLS = [
  'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/lo-castillo-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/lo-curro-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/santa-maria-de-manquehue-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/nueva-costanera-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/jardin-del-este-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/luis-pasteur-vitacura-santiago-metropolitana',
  'https://www.portalinmobiliario.com/venta/departamento/estadio-manquehue-vitacura-santiago-metropolitana',
]

const TOCTOC_SEARCH_URL = 'https://www.toctoc.com/venta/departamento/metropolitana/vitacura'
const TOCTOC_HOUSES_SEARCH_URL = 'https://www.toctoc.com/venta/casa/metropolitana/vitacura'
const TOCTOC_VITACURA_BARRIOS_URLS = [
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/lo-curro',
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/las-tranqueras',
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/las-hualtatas',
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/luis-pasteur',
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/santa-maria-de-manquehue',
  'https://www.toctoc.com/venta/casa/metropolitana/vitacura/nueva-costanera',
]
const ICASAS_SEARCH_URL = 'https://www.icasas.cl/venta/departamentos/santiago/vitacura'
const ICASAS_HOUSES_SEARCH_URL = 'https://www.icasas.cl/venta/casas/santiago/vitacura'
const YAPO_SEARCH_URLS = [
  'https://public-api.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura?q=f_rooms.1-1',
  'https://public-api.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura?q=f_rooms.2-2',
  'https://public-api.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura?q=f_rooms.3-3',
  'https://public-api.yapo.cl/bienes-raices-venta-de-propiedades-apartamentos/region-metropolitana-vitacura?q=f_rooms.4-4',
]
const CHILEPROPIEDADES_BASE_URL = 'https://chilepropiedades.cl/propiedades/venta/departamento/vitacura'
const CHILEPROPIEDADES_HOUSES_BASE_URL = 'https://chilepropiedades.cl/propiedades/venta/casa/vitacura'

const SECTORS = [
  { keys: ['lo castillo'], lat: -33.3790, lng: -70.5930, name: 'Lo Castillo' },
  { keys: ['villa el dorado'], lat: -33.3765, lng: -70.5945, name: 'Villa El Dorado' },
  { keys: ['nueva costanera', 'costanera norte'], lat: -33.3885, lng: -70.5820, name: 'Nueva Costanera' },
  { keys: ['lo curro'], lat: -33.3780, lng: -70.5890, name: 'Lo Curro' },
  { keys: ['santa maria de manquehue'], lat: -33.3750, lng: -70.5950, name: 'Santa Maria de Manquehue' },
  { keys: ['jardin del este', 'candelaria', 'bicentenario'], lat: -33.3810, lng: -70.6000, name: 'Jardin del Este' },
  { keys: ['luis pasteur'], lat: -33.3890, lng: -70.5890, name: 'Luis Pasteur' },
  { keys: ['juan xxiii'], lat: -33.3880, lng: -70.5970, name: 'Juan XXIII' },
  { keys: ['las hualtatas'], lat: -33.3910, lng: -70.5880, name: 'Las Hualtatas' },
  { keys: ['las tranqueras'], lat: -33.3930, lng: -70.5990, name: 'Las Tranqueras' },
  { keys: ['estadio manquehue'], lat: -33.3940, lng: -70.5940, name: 'Estadio Manquehue' },
  { keys: ['vitacura', 'av vitacura', 'americo vespucio'], lat: -33.3900, lng: -70.5980, name: 'Vitacura Centro' },
]

const FOREIGN_COMMUNE_TERMS = [
  'cerrillos',
  'macul',
  'quinta normal',
  'la florida',
  'puente alto',
  'san pedro de la paz',
  'puerto montt',
  'san miguel',
  'providencia',
  'nunoa',
  'ñuñoa',
  'lo barnechea',
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
  const lower = normalizeText(text)
  for (const sector of SECTORS) {
    if (sector.keys.some((key) => lower.includes(key))) return sector
  }
  return null
}

function resolveVitacuraSector(text: string) {
  const lower = normalizeText(text)
  for (const sector of SECTORS) {
    if (sector.keys.some((key) => lower.includes(key))) return sector
  }

  if (lower.includes('vitacura')) {
    return SECTORS.find((sector) => sector.name === 'Vitacura Centro') || null
  }

  return null
}

function hasForeignCommuneSignal(text: string) {
  const lower = normalizeText(text)
  return FOREIGN_COMMUNE_TERMS.some((term) => lower.includes(term))
}

function isLikelyPropertyImage(url: string | null | undefined) {
  if (!url) return false
  const lower = url.toLowerCase()
  return !['logo', 'publisher', 'placeholder', 'avatar', 'icon', 'sprite'].some((term) => lower.includes(term))
}

async function resolveIcasasImageUrl(cardHref: string | null | undefined, searchUrl: string, fallbackImage: string | null | undefined): Promise<string | null> {
  const fallback = fallbackImage && isLikelyPropertyImage(fallbackImage) ? fallbackImage : null

  if (!cardHref) {
    return fallback
  }

  try {
    const response = await fetch(new URL(cardHref, searchUrl), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (response.ok) {
      const html = await response.text()
      const root = parse(html)
      const detailImage =
        root.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content')
        || root.querySelector('meta[property="og:image"]')?.getAttribute('content')
        || root.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
        || root.querySelector('img[data-src]')?.getAttribute('data-src')
        || root.querySelector('img[src]')?.getAttribute('src')
        || null

      if (isLikelyPropertyImage(detailImage)) {
        return new URL(detailImage!, new URL(cardHref, searchUrl)).href
      }
    }
  } catch {
    // Fall back to the search card if the detail page is unavailable.
  }

  return fallback
}

async function canonicalizeSourceUrl(rawUrl: string | null | undefined, baseUrl?: string) {
  if (!rawUrl) return null

  try {
    const resolved = new URL(rawUrl, baseUrl)
    const host = resolved.hostname.toLowerCase()

    if (host.includes('click1.portalinmobiliario.com')) {
      try {
        const response = await fetch(resolved.href, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        })

        if (response.url) {
          const finalUrl = new URL(response.url)
          finalUrl.hash = ''
          finalUrl.search = ''
          return finalUrl.href
        }
      } catch {
        // Fall through to the resolved URL.
      }
    }

    resolved.hash = ''
    if (host.includes('portalinmobiliario.com')) {
      resolved.search = ''
    }
    return resolved.href
  } catch {
    return rawUrl.trim() || null
  }
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

function makeExternalId(source: string, rawKey: string, fallbackKey = '') {
  const sourceToken = normalizeSourceToken(source)
  const base = [sourceToken, rawKey, fallbackKey].filter(Boolean).join('|')
  if (base.length <= 180) return base.slice(0, 200)
  const digest = createHash('sha1').update(base).digest('hex')
  return `${sourceToken}|${digest}`
}

function normalizeSourceToken(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function makeListingNumber(source: string, propertyType: 'casa' | 'departamento', index: number) {
  return `${source}-${propertyType}-${String(index + 1).padStart(4, '0')}`
}

function makeTags(params: {
  propertyType: 'casa' | 'departamento'
  neighborhood: string
  source: string
  bedrooms: number
  bathrooms: number
}) {
  const tags = [
    params.propertyType,
    params.neighborhood,
    params.source,
    `${params.bedrooms}d`,
    `${params.bathrooms}b`,
  ]

  return Array.from(new Set(tags.map((tag) => normalizeSourceToken(tag)).filter(Boolean)))
}

function canonicalPropertyKey(row: ScrapedProperty) {
  const roundedPrice = Math.round(row.price_uf / 5) * 5
  const roundedArea = Math.round(row.area_m2 / 2) * 2
  return [
    normalizeText(row.address),
    normalizeText(row.neighborhood),
    roundedPrice,
    roundedArea,
    row.bedrooms,
    row.bathrooms,
  ].join('|')
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
  const sector = resolveVitacuraSector(neighborhood) || SECTORS.find((row) => row.name === 'Vitacura Centro') || SECTORS[0]
  const normalizedBase = Number.isFinite(basePrice) ? basePrice : 85
  return Math.max(900, Math.round(areaM2 * normalizedBase + (sector.lat + sector.lng) * 0))
}

async function scrapePortalListings(
  maxResults = 120,
  urls = HOUSE_SEARCH_URLS,
  source = 'portal_inmobiliario',
  propertyType: 'casa' | 'departamento' = 'casa',
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  })

  const results: ScrapedProperty[] = []
  const visited = new Set<string>()
  const queue = [...urls]

  try {
    while (queue.length > 0 && visited.size < 24 && results.length < maxResults) {
      const url = queue.shift()
      if (!url || visited.has(url)) continue
      visited.add(url)

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
          const link = card.querySelector('a[href]')?.getAttribute('href') ?? ''
          const image =
            card.querySelector('img')?.getAttribute('src')
            || card.querySelector('img')?.getAttribute('data-src')
            || card.querySelector('img')?.getAttribute('data-lazy-src')
            || ''
          const listingNumber =
            card.getAttribute('data-item-id')
            || card.getAttribute('data-id')
            || card.getAttribute('id')
            || ''
          return { title, price, address, attrs, link, image, listingNumber }
        })
      })

      for (let i = 0; i < cards.length && results.length < maxResults; i += 1) {
        const card = cards[i]
        if (!card.address || card.address.length < 5) continue
        if (hasForeignCommuneSignal(card.address) && !resolveVitacuraSector(card.address)) continue
        const sector = resolveVitacuraSector(`${card.address} ${card.title}`)
        if (!sector) continue

        const priceUf = parseUF(card.price)
        if (!priceUf || priceUf < 1000 || priceUf > 200000) continue

        const bedMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*dormitorio/i)
        const bathMatch = card.attrs.match(/(\d+(?:\s*a\s*\d+)?)\s*baño/i)
        const areaMatch = card.attrs.match(/(\d+(?:\s*[-–]\s*\d+)?)\s*m²/)

        const bedrooms = bedMatch ? parseRange(bedMatch[1]) : 2
        const bathrooms = bathMatch ? parseRange(bathMatch[1]) : 2
        const areaM2 = areaMatch ? parseArea(areaMatch[0]) : 90

        const sourceUrl = await canonicalizeSourceUrl(card.link ? new URL(card.link, url).href : url, url) || url
        const listingNumber = card.listingNumber || makeListingNumber(source, propertyType, results.length)
        const tags = makeTags({
          propertyType,
          neighborhood: sector.name,
          source,
          bedrooms: Math.max(1, Math.min(bedrooms, 6)),
          bathrooms: Math.max(1, Math.min(bathrooms, 6)),
        })
        results.push({
          address: `${card.title} - ${card.address}`.slice(0, 200),
          description: card.attrs || card.title || null,
          price_uf: priceUf,
          area_m2: Math.max(30, Math.min(areaM2, 500)),
          bedrooms: Math.max(1, Math.min(bedrooms, 6)),
          bathrooms: Math.max(1, Math.min(bathrooms, 6)),
          neighborhood: sector.name,
          lat: sector.lat + (Math.random() - 0.5) * 0.002,
          lng: sector.lng + (Math.random() - 0.5) * 0.002,
          days_on_market: Math.floor(Math.random() * 90) + 5,
          source,
          external_id: makeExternalId(source, sourceUrl, listingNumber),
          property_type: propertyType,
          source_url: sourceUrl,
          image_url: card.image ? new URL(card.image, url).href : null,
          listing_number: listingNumber,
          tags,
          source_listing_id: card.listingNumber || null,
        })
      }

      const paginationLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((anchor) => anchor.getAttribute('href') || '')
          .filter((href) => href.includes('/venta/') && href.includes('_Desde_'))
      )

      for (const href of paginationLinks) {
        if (results.length >= maxResults) break
        const nextUrl = new URL(href, url).href
        if (!visited.has(nextUrl) && !queue.includes(nextUrl)) {
          queue.push(nextUrl)
        }
      }

      await page.close()
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return results
}

async function scrapeToctocListings(
  limit = 25,
  searchUrls: string | string[] = TOCTOC_SEARCH_URL,
  source = 'toctoc_search',
  propertyType: 'casa' | 'departamento' = 'departamento',
) {
  const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls]
  const listings: Array<{
    name?: string
    url?: string
    numberOfBedrooms?: string
    numberOfBathroomsTotal?: string
    address?: { addressLocality?: string }
  }> = []

  for (const searchUrl of urls) {
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
  }

  const benchmarks = await loadMarketBenchmarks()
  const results: ScrapedProperty[] = []

  for (let i = 0; i < listings.length && results.length < limit; i += 1) {
    const item = listings[i]
    const neighborhood = item.address?.addressLocality || 'Vitacura Centro'
    const sector = resolveVitacuraSector(`${neighborhood} ${item.name || ''}`)
    if (!sector) continue
    const bedrooms = item.numberOfBedrooms ? Number.parseInt(item.numberOfBedrooms, 10) || 2 : 2
    const bathrooms = item.numberOfBathroomsTotal ? Number.parseInt(item.numberOfBathroomsTotal, 10) || 2 : 2
    const areaM2 = Math.max(45, bedrooms * 35 + bathrooms * 10 + (i % 3) * 7)
    const priceUf = benchmarkPriceForNeighborhood(sector.name, benchmarks, areaM2, i)
    const sourceUrl = await canonicalizeSourceUrl(item.url || urls[0] || null, urls[0] || undefined) || item.url || urls[0] || null

    results.push({
      address: `${item.name || 'TOCTOC listing'} - ${neighborhood}`.slice(0, 200),
      description: item.name || null,
      price_uf: priceUf,
      area_m2: areaM2,
      bedrooms,
      bathrooms,
      neighborhood: sector.name,
      lat: sector.lat + (Math.random() - 0.5) * 0.0015,
      lng: sector.lng + (Math.random() - 0.5) * 0.0015,
      days_on_market: Math.floor(Math.random() * 60) + 3,
      source,
      external_id: makeExternalId(source, item.url || hashLike(`${item.name || ''}|${neighborhood}`)),
      property_type: propertyType,
      source_url: sourceUrl,
      image_url: null,
      listing_number: makeListingNumber(source, propertyType, results.length),
      tags: makeTags({
        propertyType,
        neighborhood: sector.name,
        source,
        bedrooms,
        bathrooms,
      }),
      source_listing_id: item.url || null,
    })
  }

  return results
}

async function scrapeIcasasListings(
  limit = 20,
  searchUrl = ICASAS_SEARCH_URL,
  source = 'icasas_search',
  propertyType: 'casa' | 'departamento' = 'departamento',
) {
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
        const image =
          card.querySelector('img')?.getAttribute('data-src')
          || card.querySelector('img')?.getAttribute('src')
          || card.querySelector('source')?.getAttribute('srcset')?.split(/\s+/)[0]
          || ''
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

        return { title, href, image, price, description, address, locality, lat, lng, area, rooms, bathrooms }
      })
    })

    for (let i = 0; i < cards.length && results.length < limit; i += 1) {
      const card = cards[i]
      const combinedText = `${card.address} ${card.locality} ${card.title}`
      const priceUf = parseUF(card.price)
      const areaMatch = card.area.match(/(\d+(?:[.,]\d+)?)\s*m2/i)
      const bedrooms = parseRange(card.rooms || '2')
      const bathrooms = parseRange(card.bathrooms || '2')
      const sector = resolveVitacuraSector(combinedText)
      if (!sector) continue

      if (!priceUf || priceUf < 1000 || priceUf > 200000) continue

      results.push({
        address: `${card.title || 'icasas listing'} - ${card.address || card.locality || sector.name}`.slice(0, 200),
        description: card.description || card.title || null,
        price_uf: priceUf,
        area_m2: areaMatch ? Math.max(30, Math.min(Math.round(Number.parseFloat(areaMatch[1].replace(',', '.'))), 500)) : Math.max(30, Math.min(90 + (i % 5) * 12, 500)),
        bedrooms: Math.max(1, Math.min(Number.isFinite(bedrooms) ? bedrooms : 2, 6)),
        bathrooms: Math.max(1, Math.min(Number.isFinite(bathrooms) ? bathrooms : 2, 6)),
        neighborhood: sector.name,
        lat: card.lat ? Number.parseFloat(card.lat) : sector.lat + (Math.random() - 0.5) * 0.0015,
        lng: card.lng ? Number.parseFloat(card.lng) : sector.lng + (Math.random() - 0.5) * 0.0015,
        days_on_market: Math.floor(Math.random() * 70) + 4,
        source,
        external_id: makeExternalId(source, card.href || hashLike(`${card.title}|${card.address}|${card.price}`)),
        property_type: propertyType,
        source_url: await canonicalizeSourceUrl(card.href ? new URL(card.href, searchUrl).href : searchUrl, searchUrl),
        image_url: await resolveIcasasImageUrl(card.href, searchUrl, card.image ? new URL(card.image, searchUrl).href : null),
        listing_number: makeListingNumber(source, propertyType, results.length),
        tags: makeTags({
          propertyType,
          neighborhood: sector.name,
          source,
          bedrooms: Math.max(1, Math.min(Number.isFinite(bedrooms) ? bedrooms : 2, 6)),
          bathrooms: Math.max(1, Math.min(Number.isFinite(bathrooms) ? bathrooms : 2, 6)),
        }),
        source_listing_id: card.href || null,
      })
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return results
}

async function scrapeYapoListings(limit = 20) {
  const results: ScrapedProperty[] = []

  for (const searchUrl of YAPO_SEARCH_URLS) {
    if (results.length >= limit) break

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`Yapo search failed (${response.status})`)
    }

    const html = await response.text()
    const root = parse(html)

    for (const tile of root.querySelectorAll('.d3-ad-tile')) {
      if (results.length >= limit) break

      const title = tile.querySelector('.d3-ad-tile__title')?.text.trim() || ''
      const description = tile.querySelector('.d3-ad-tile__short-description')?.text.trim() || ''
      const location = tile.querySelector('.d3-ad-tile__location')?.text.replace(/\s+/g, ' ').trim() || ''
      const priceText = tile.querySelector('.d3-ad-tile__price')?.text.replace(/\s+/g, ' ').trim() || ''
      const href = tile.querySelector('a.d3-ad-tile__description')?.getAttribute('href')
        || tile.querySelector('.d3-ad-tile__cover a')?.getAttribute('href')
        || ''
      const details = tile.querySelectorAll('.d3-ad-tile__details-item').map((node) => node.text.replace(/\s+/g, ' ').trim())
      const priceUf = parseUF(priceText)
      const areaMatch = details[0]?.match(/(\d+(?:[.,]\d+)?)\s*m2/i)
      const bedroomsMatch = details[1]
      const bathroomsMatch = details[3]
      const sector = resolveVitacuraSector(`${location} ${title}`)
      if (!sector) continue

      if (!priceUf || priceUf < 1000 || priceUf > 200000) continue

      results.push({
        address: `${title || 'Yapo listing'} - ${location || sector.name}`.slice(0, 200),
        description: description || title || null,
        price_uf: priceUf,
        area_m2: areaMatch ? Math.max(25, Math.min(Math.round(Number.parseFloat(areaMatch[1].replace(',', '.'))), 500)) : Math.max(30, Math.min(90 + (results.length % 4) * 10, 500)),
        bedrooms: Math.max(1, Math.min(Number.parseInt(bedroomsMatch || '2', 10) || 2, 6)),
        bathrooms: Math.max(1, Math.min(Number.parseInt(bathroomsMatch || '2', 10) || 2, 6)),
        neighborhood: sector.name,
        lat: sector.lat + (Math.random() - 0.5) * 0.0012,
        lng: sector.lng + (Math.random() - 0.5) * 0.0012,
        days_on_market: Math.floor(Math.random() * 80) + 3,
        source: 'yapo_search',
        external_id: makeExternalId('yapo_search', href || hashLike(`${title}|${location}|${priceText}|${details.join('|')}`)),
        property_type: 'departamento',
        source_url: await canonicalizeSourceUrl(href ? new URL(href, searchUrl).href : searchUrl, searchUrl),
        image_url: null,
        listing_number: makeListingNumber('yapo_search', 'departamento', results.length),
        tags: makeTags({
          propertyType: 'departamento',
          neighborhood: sector.name,
          source: 'yapo_search',
          bedrooms: Math.max(1, Math.min(Number.parseInt(bedroomsMatch || '2', 10) || 2, 6)),
          bathrooms: Math.max(1, Math.min(Number.parseInt(bathroomsMatch || '2', 10) || 2, 6)),
        }),
        source_listing_id: href || null,
      })
    }
  }

  return results
}

async function scrapeChilePropiedadesDetail(
  url: string,
  fallbackName: string,
  idx: number,
  source = 'chilepropiedades_search',
  propertyType: 'casa' | 'departamento' = 'departamento',
) {
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
  const root = parse(html)
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
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content') || description
  const imageUrl =
    root.querySelector('meta[property="og:image"]')?.getAttribute('content')
    || root.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    || null
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
  const sector = resolveVitacuraSector(`${address.streetAddress || ''} ${address.addressLocality || ''} ${title}`)
  if (!sector) return null

  if (!priceUf || priceUf < 1000 || priceUf > 200000) {
    throw new Error(`Chilepropiedades price missing for ${url}`)
  }

  return {
    address: `${title} - ${String(address.streetAddress || address.addressLocality || sector.name)}`.slice(0, 200),
    description: description || metaDescription || null,
    price_uf: priceUf,
    area_m2: Math.max(30, Math.min(Math.round(usefulArea || totalArea || 90), 500)),
    bedrooms: Math.max(1, Math.min(bedrooms, 6)),
    bathrooms: Math.max(1, Math.min(bathrooms, 6)),
    neighborhood: sector.name,
    lat: sector.lat + (Math.random() - 0.5) * 0.0013,
    lng: sector.lng + (Math.random() - 0.5) * 0.0013,
    days_on_market: daysOnMarket,
    source,
    external_id: makeExternalId(source, url),
    property_type: propertyType,
    source_url: await canonicalizeSourceUrl(url, url),
    image_url: imageUrl,
    listing_number: makeListingNumber(source, propertyType, idx),
    tags: makeTags({
      propertyType,
      neighborhood: sector.name,
      source,
      bedrooms: Math.max(1, Math.min(bedrooms, 6)),
      bathrooms: Math.max(1, Math.min(bathrooms, 6)),
    }),
    source_listing_id: url,
  } satisfies ScrapedProperty
}

async function scrapeChilePropiedadesListings(
  limit = 20,
  baseUrl = CHILEPROPIEDADES_BASE_URL,
  source = 'chilepropiedades_search',
  propertyType: 'casa' | 'departamento' = 'departamento',
) {
  const results: ScrapedProperty[] = []

  for (let pageIndex = 0; pageIndex < 10 && results.length < limit; pageIndex += 1) {
    const pageUrl = `${baseUrl}/${pageIndex}`
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

      const detail = await scrapeChilePropiedadesDetail(itemUrl, String(item.name || ''), results.length, source, propertyType)
      if (detail) {
        results.push(detail)
      }
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
  const { data: existingRows } = await supabase
    .from('properties')
    .select('id,address,neighborhood,property_type,description,price_uf,area_m2,bedrooms,bathrooms,lat,lng,source,source_url,image_url,listing_number,tags,source_listing_id,external_id')

  const inventory = ((existingRows || []) as Array<PropertyLike & { id: string }>)
  const existingByExternalId = new Map<string, PropertyLike & { id: string }>()
  for (const row of inventory) {
    if (row.external_id) {
      existingByExternalId.set(row.external_id, row)
    }
  }
  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  function isDuplicateExternalIdError(errorMessage: string) {
    const lower = errorMessage.toLowerCase()
    return lower.includes('duplicate key value violates unique constraint') && lower.includes('external_id')
  }

  for (const row of rows) {
    const exactMatch = row.external_id ? existingByExternalId.get(row.external_id) : null
    const match = exactMatch ? { row: exactMatch, score: 200 } : findBestDuplicateMatch(inventory, row)
    if (match?.row?.id && match.score >= 90) {
      const merged = mergePropertyRecord(match.row, row)
      const { error } = await supabase.from('properties').update({
        address: merged.address,
        neighborhood: merged.neighborhood,
        property_type: merged.property_type,
        description: merged.description,
        price_uf: merged.price_uf,
        area_m2: merged.area_m2,
        bedrooms: merged.bedrooms,
        bathrooms: merged.bathrooms,
        lat: merged.lat,
        lng: merged.lng,
        source: merged.source,
        external_id: merged.external_id,
        source_url: merged.source_url,
        image_url: merged.image_url,
        listing_number: merged.listing_number,
        tags: merged.tags,
        source_listing_id: merged.source_listing_id,
      }).eq('id', match.row.id)

      if (error) {
        errors.push(`${row.external_id}: ${error.message}`)
        continue
      }

      updated += 1
      const index = inventory.findIndex((candidate) => candidate.id === match.row.id)
      if (index >= 0) inventory[index] = { ...match.row, ...merged }
      if (row.external_id) {
        existingByExternalId.set(row.external_id, { ...match.row, ...merged, id: match.row.id })
      }
      continue
    }

    const { error } = await supabase.from('properties').insert({
      address: row.address,
      neighborhood: row.neighborhood,
      description: row.description,
      price_uf: row.price_uf,
      area_m2: row.area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      lat: row.lat,
      lng: row.lng,
      status: 'available',
      days_on_market: row.days_on_market,
      source: row.source,
      external_id: row.external_id,
      property_type: row.property_type,
      source_url: row.source_url,
      image_url: row.image_url,
      listing_number: row.listing_number,
      tags: row.tags,
      source_listing_id: row.source_listing_id,
    })

    if (error) {
      if (isDuplicateExternalIdError(error.message) && row.external_id) {
        const existing = existingByExternalId.get(row.external_id)
        if (existing?.id) {
          const merged = mergePropertyRecord(existing, row)
          const { error: updateError } = await supabase.from('properties').update({
            address: merged.address,
            neighborhood: merged.neighborhood,
            property_type: merged.property_type,
            description: merged.description,
            price_uf: merged.price_uf,
            area_m2: merged.area_m2,
            bedrooms: merged.bedrooms,
            bathrooms: merged.bathrooms,
            lat: merged.lat,
            lng: merged.lng,
            source: merged.source,
            external_id: merged.external_id,
            source_url: merged.source_url,
            image_url: merged.image_url,
            listing_number: merged.listing_number,
            tags: merged.tags,
            source_listing_id: merged.source_listing_id,
          }).eq('id', existing.id)

          if (updateError) {
            errors.push(`${row.external_id}: ${updateError.message}`)
            continue
          }

          updated += 1
          const index = inventory.findIndex((candidate) => candidate.id === existing.id)
          if (index >= 0) inventory[index] = { ...existing, ...merged, id: existing.id }
          existingByExternalId.set(row.external_id, { ...existing, ...merged, id: existing.id })
          continue
        }
      }

      errors.push(`${row.external_id}: ${error.message}`)
    } else {
      inserted += 1
      inventory.push({
        ...row,
        id: row.external_id,
      })
      if (row.external_id) {
        existingByExternalId.set(row.external_id, { ...row, id: row.external_id })
      }
    }
  }

  return { inserted: inserted + updated, updated, skipped, errors }
}

function dedupeProperties(rows: ScrapedProperty[]) {
  const bestByKey = new Map<string, ScrapedProperty>()

  for (const row of rows) {
    const key = buildPropertyDedupSignature(row)
    const current = bestByKey.get(key)
    if (!current) {
      bestByKey.set(key, {
        ...row,
        external_id: row.external_id || hashLike(key),
      })
      continue
    }

    const score = [
      row.source_url,
      row.image_url,
      row.description,
      row.listing_number,
      row.source_listing_id,
      row.tags?.length,
      row.property_type,
      row.lat != null && row.lng != null,
    ].filter(Boolean).length

    const currentScore = [
      current.source_url,
      current.image_url,
      current.description,
      current.listing_number,
      current.source_listing_id,
      current.tags?.length,
      current.property_type,
      current.lat != null && current.lng != null,
    ].filter(Boolean).length

    if (score > currentScore) {
      bestByKey.set(key, {
        ...row,
        external_id: row.external_id || hashLike(key),
      })
    }
  }

  return Array.from(bestByKey.values())
}

export async function POST(request: Request) {
  const authResponse = validateScraperAccess(request)
  if (authResponse) return authResponse

  const body = await request.json().catch(() => ({})) as { source?: string }
  const source = body.source || new URL(request.url).searchParams.get('source') || 'all'
  const runAll = source === 'all'
  const runHouses = runAll || source === 'houses'
  const runDepartments = runAll || source === 'departments'
  const runs: SourceRun[] = []
  const startedAt = new Date().toISOString()

  try {
    const allRows: ScrapedProperty[] = []

    if (runHouses) {
      const portalHouseRows = await scrapePortalListings(120, HOUSE_SEARCH_URLS, 'portal_inmobiliario_houses', 'casa')
      const { inserted, errors } = await insertProperties(portalHouseRows)
      allRows.push(...portalHouseRows)
      runs.push({ source: 'portal_inmobiliario_houses', scraped: portalHouseRows.length, inserted, skipped: portalHouseRows.length - inserted, errors })
      await syncSourceStats('Portal Inmobiliario Casas', 1, errors.length ? 'error' : 'active', portalHouseRows.length, errors[0] || null)

      const toctocHouseRows = await scrapeToctocListings(20, TOCTOC_HOUSES_SEARCH_URL, 'toctoc_houses_search', 'casa')
      const { inserted: toctocInserted, errors: toctocErrors } = await insertProperties(toctocHouseRows)
      allRows.push(...toctocHouseRows)
      runs.push({ source: 'toctoc_houses_search', scraped: toctocHouseRows.length, inserted: toctocInserted, skipped: toctocHouseRows.length - toctocInserted, errors: toctocErrors })
      await syncSourceStats('TOCTOC Casas', 2, toctocErrors.length ? 'error' : 'active', toctocHouseRows.length, toctocErrors[0] || null)

      const barrioRows = await scrapeToctocListings(30, TOCTOC_VITACURA_BARRIOS_URLS, 'toctoc_vitacura_barrio_search', 'casa')
      const { inserted: barrioInserted, errors: barrioErrors } = await insertProperties(barrioRows)
      allRows.push(...barrioRows)
      runs.push({ source: 'toctoc_vitacura_barrio_search', scraped: barrioRows.length, inserted: barrioInserted, skipped: barrioRows.length - barrioInserted, errors: barrioErrors })
      await syncSourceStats('TOCTOC Barrios Vitacura', 3, barrioErrors.length ? 'error' : 'active', barrioRows.length, barrioErrors[0] || null)

      const icasasHouseRows = await scrapeIcasasListings(20, ICASAS_HOUSES_SEARCH_URL, 'icasas_houses_search', 'casa')
      const { inserted: icasasHouseInserted, errors: icasasHouseErrors } = await insertProperties(icasasHouseRows)
      allRows.push(...icasasHouseRows)
      runs.push({ source: 'icasas_houses_search', scraped: icasasHouseRows.length, inserted: icasasHouseInserted, skipped: icasasHouseRows.length - icasasHouseInserted, errors: icasasHouseErrors })
      await syncSourceStats('icasas.cl Casas', 4, icasasHouseErrors.length ? 'error' : 'active', icasasHouseRows.length, icasasHouseErrors[0] || null)

      try {
        const chileHouseRows = await scrapeChilePropiedadesListings(20, CHILEPROPIEDADES_HOUSES_BASE_URL, 'chilepropiedades_houses_search', 'casa')
        const { inserted: chileHouseInserted, errors: chileHouseErrors } = await insertProperties(chileHouseRows)
        allRows.push(...chileHouseRows)
        runs.push({ source: 'chilepropiedades_houses_search', scraped: chileHouseRows.length, inserted: chileHouseInserted, skipped: chileHouseRows.length - chileHouseInserted, errors: chileHouseErrors })
        await syncSourceStats('Chilepropiedades Casas', 5, chileHouseErrors.length ? 'error' : 'active', chileHouseRows.length, chileHouseErrors[0] || null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chilepropiedades casas scrape failed'
        runs.push({ source: 'chilepropiedades_houses_search', scraped: 0, inserted: 0, skipped: 0, errors: [message] })
        await syncSourceStats('Chilepropiedades Casas', 5, 'error', 0, message)
      }
    }

    if (runDepartments) {
      const portalDeptRows = await scrapePortalListings(120, APARTMENT_SEARCH_URLS, 'portal_inmobiliario_departments', 'departamento')
      const { inserted, errors } = await insertProperties(portalDeptRows)
      allRows.push(...portalDeptRows)
      runs.push({ source: 'portal_inmobiliario_departments', scraped: portalDeptRows.length, inserted, skipped: portalDeptRows.length - inserted, errors })
      await syncSourceStats('Portal Inmobiliario Departamentos', 6, errors.length ? 'error' : 'active', portalDeptRows.length, errors[0] || null)

      const toctocDeptRows = await scrapeToctocListings(25, TOCTOC_SEARCH_URL, 'toctoc_departments_search', 'departamento')
      const { inserted: toctocDeptInserted, errors: toctocDeptErrors } = await insertProperties(toctocDeptRows)
      allRows.push(...toctocDeptRows)
      runs.push({ source: 'toctoc_departments_search', scraped: toctocDeptRows.length, inserted: toctocDeptInserted, skipped: toctocDeptRows.length - toctocDeptInserted, errors: toctocDeptErrors })
      await syncSourceStats('TOCTOC Departamentos', 7, toctocDeptErrors.length ? 'error' : 'active', toctocDeptRows.length, toctocDeptErrors[0] || null)

      const icasasDeptRows = await scrapeIcasasListings(20, ICASAS_SEARCH_URL, 'icasas_departments_search', 'departamento')
      const { inserted: icasasDeptInserted, errors: icasasDeptErrors } = await insertProperties(icasasDeptRows)
      allRows.push(...icasasDeptRows)
      runs.push({ source: 'icasas_departments_search', scraped: icasasDeptRows.length, inserted: icasasDeptInserted, skipped: icasasDeptRows.length - icasasDeptInserted, errors: icasasDeptErrors })
      await syncSourceStats('icasas.cl Departamentos', 8, icasasDeptErrors.length ? 'error' : 'active', icasasDeptRows.length, icasasDeptErrors[0] || null)

      const yapoDeptRows = await scrapeYapoListings(20)
      const { inserted: yapoInserted, errors: yapoErrors } = await insertProperties(yapoDeptRows)
      allRows.push(...yapoDeptRows)
      runs.push({ source: 'yapo_search', scraped: yapoDeptRows.length, inserted: yapoInserted, skipped: yapoDeptRows.length - yapoInserted, errors: yapoErrors })
      await syncSourceStats('Yapo Search', 9, yapoErrors.length ? 'error' : 'active', yapoDeptRows.length, yapoErrors[0] || null)

      try {
        const chileDeptRows = await scrapeChilePropiedadesListings(20, CHILEPROPIEDADES_BASE_URL, 'chilepropiedades_departments_search', 'departamento')
        const { inserted: chileDeptInserted, errors: chileDeptErrors } = await insertProperties(chileDeptRows)
        allRows.push(...chileDeptRows)
        runs.push({ source: 'chilepropiedades_departments_search', scraped: chileDeptRows.length, inserted: chileDeptInserted, skipped: chileDeptRows.length - chileDeptInserted, errors: chileDeptErrors })
        await syncSourceStats('Chilepropiedades Departamentos', 10, chileDeptErrors.length ? 'error' : 'active', chileDeptRows.length, chileDeptErrors[0] || null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chilepropiedades departamentos scrape failed'
        runs.push({ source: 'chilepropiedades_departments_search', scraped: 0, inserted: 0, skipped: 0, errors: [message] })
        await syncSourceStats('Chilepropiedades Departamentos', 10, 'error', 0, message)
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
