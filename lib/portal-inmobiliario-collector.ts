import path from 'node:path'
import type { Browser, Page } from 'puppeteer'
import { parse } from 'node-html-parser'
import type { MarketImportInputRow } from '@/lib/market-import'
import type { PortalDatasetKind } from '@/lib/market-source-import'

export type PortalCollectorOptions = {
  datasetKind: PortalDatasetKind
  commune?: string
  operation?: 'venta' | 'arriendo'
  maxPages?: number
  maxListings?: number
  waitMs?: number
}

export type PortalCollectionResult = {
  searchUrls: string[]
  listingUrls: string[]
  rows: MarketImportInputRow[]
  failures: Array<{ url: string; error: string }>
  observedAt: string
}

const PORTAL_ORIGIN = 'https://www.portalinmobiliario.com'
const DEFAULT_COMMUNE = 'vitacura-metropolitana'

function buildSearchBase(datasetKind: PortalDatasetKind, operation: string, commune: string) {
  const propertyPath = datasetKind === 'portal_houses'
    ? 'casas'
    : datasetKind === 'portal_projects'
      ? 'proyectos'
      : 'departamentos'

  return `${PORTAL_ORIGIN}/${operation}/${propertyPath}/${commune}`
}

function buildSearchUrl(base: string, page: number) {
  if (page <= 1) return base
  const offset = (page - 1) * 48 + 1
  return `${base}_Desde_${offset}_NoIndex_True`
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function text(value: unknown) {
  if (value == null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

function numeric(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = text(value)
  if (!raw) return null
  const cleaned = raw
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/UF|CLP|m²|m2/gi, '')
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.')
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = numeric(value)
  return parsed == null ? null : Math.round(parsed)
}

function extractListingId(url: string) {
  const match = url.match(/MLC-?(\d+)/i) || url.match(/\/p\/(MLC\d+)/i)
  return match ? match[1].replace(/^MLC/i, '') : null
}

function canonicalListingUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, PORTAL_ORIGIN)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rawUrl
  }
}

function collectJsonLd(html: string) {
  const root = parse(html)
  return root.querySelectorAll('script[type="application/ld+json"]')
    .map((script) => {
      try {
        return JSON.parse(script.textContent)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function flattenJsonLd(values: unknown[]): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    output.push(record)
    if (Array.isArray(record['@graph'])) record['@graph'].forEach(visit)
    if (record.mainEntity) visit(record.mainEntity)
    if (record.item) visit(record.item)
  }
  values.forEach(visit)
  return output
}

function deepFind(source: unknown, keys: string[]): unknown {
  if (!source || typeof source !== 'object') return undefined
  const wanted = new Set(keys.map((key) => key.toLowerCase()))
  const queue: unknown[] = [source]
  const seen = new Set<unknown>()

  while (queue.length) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)
    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (wanted.has(key.toLowerCase()) && value != null && value !== '') return value
      if (value && typeof value === 'object') queue.push(value)
    }
  }
  return undefined
}

function extractEmbeddedStates(html: string) {
  const states: unknown[] = []
  const root = parse(html)
  for (const script of root.querySelectorAll('script')) {
    const body = script.textContent.trim()
    if (!body || body.length < 2) continue
    if (script.getAttribute('id') === '__NEXT_DATA__' || script.getAttribute('type') === 'application/json') {
      try {
        states.push(JSON.parse(body))
      } catch {
        // Ignore malformed or non-JSON scripts.
      }
    }
  }
  return states
}

function parsePrice(html: string, structured: unknown[]) {
  const priceCurrency = text(deepFind(structured, ['priceCurrency', 'currency_id', 'currency']))?.toUpperCase()
  const amount = numeric(deepFind(structured, ['price', 'amount', 'price_amount', 'priceAmount']))

  if (amount != null && priceCurrency === 'UF') return { price_uf: amount, price_clp: null }
  if (amount != null && (priceCurrency === 'CLP' || priceCurrency === '$')) return { price_uf: null, price_clp: amount }

  const plain = parse(html).text.replace(/\s+/g, ' ')
  const ufMatch = plain.match(/UF\s*([\d.]+(?:,\d+)?)/i)
  if (ufMatch) return { price_uf: numeric(ufMatch[1]), price_clp: null }
  const clpMatch = plain.match(/\$\s*([\d.]+)/)
  return { price_uf: null, price_clp: clpMatch ? numeric(clpMatch[1]) : null }
}

function valueNearLabel(html: string, labels: string[]) {
  const root = parse(html)
  const bodyText = root.text.replace(/\s+/g, ' ')
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:]?\\s*([\\d.,]+)`, 'i')
    const match = bodyText.match(pattern)
    if (match) return numeric(match[1])
  }
  return null
}

function normalizeAddress(value: string | null) {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || null
}

function inferPropertyType(datasetKind: PortalDatasetKind) {
  if (datasetKind === 'portal_houses') return 'Casa'
  if (datasetKind === 'portal_projects') return 'Proyecto'
  return 'Departamento'
}

export function parsePortalListing(html: string, url: string, datasetKind: PortalDatasetKind): MarketImportInputRow {
  const root = parse(html)
  const jsonLd = flattenJsonLd(collectJsonLd(html))
  const states = extractEmbeddedStates(html)
  const structured: unknown[] = [...jsonLd, ...states]
  const listingId = extractListingId(url) || text(deepFind(structured, ['id', 'item_id', 'listing_id', 'productID'])) || ''
  const title = text(deepFind(structured, ['name', 'title']))
    || text(root.querySelector('meta[property="og:title"]')?.getAttribute('content'))
    || text(root.querySelector('h1')?.text)
  const addressObject = deepFind(structured, ['address'])
  const address = typeof addressObject === 'object' && addressObject
    ? text(deepFind(addressObject, ['streetAddress', 'addressLocality', 'name']))
    : text(addressObject)
      || text(deepFind(structured, ['location_name', 'locationName', 'subtitle']))
  const latitude = numeric(deepFind(structured, ['latitude', 'lat']))
  const longitude = numeric(deepFind(structured, ['longitude', 'lng', 'lon']))
  const price = parsePrice(html, structured)
  const usefulArea = numeric(deepFind(structured, ['floorSize', 'usable_area', 'useful_area', 'covered_area']))
    || valueNearLabel(html, ['Superficie útil', 'Superficie total'])
  const builtArea = numeric(deepFind(structured, ['built_area', 'covered_area', 'total_area']))
    || valueNearLabel(html, ['Superficie construida', 'Superficie total'])
  const landArea = numeric(deepFind(structured, ['land_area', 'plot_area']))
    || valueNearLabel(html, ['Superficie de terreno', 'Terreno'])
  const bedrooms = integer(deepFind(structured, ['numberOfBedrooms', 'bedrooms', 'bedroom_count']))
    || integer(valueNearLabel(html, ['Dormitorios', 'Habitaciones']))
  const bathrooms = integer(deepFind(structured, ['numberOfBathroomsTotal', 'bathrooms', 'bathroom_count']))
    || integer(valueNearLabel(html, ['Baños', 'Banos']))
  const parkingSpaces = integer(deepFind(structured, ['parking_spaces', 'parking', 'garage_count']))
    || integer(valueNearLabel(html, ['Estacionamientos', 'Cocheras']))
  const publishedAt = text(deepFind(structured, ['datePosted', 'datePublished', 'start_time', 'published_at']))

  return {
    source_listing_id: String(listingId),
    property_type: inferPropertyType(datasetKind),
    operation: 'Venta',
    status: 'active',
    url: canonicalListingUrl(url),
    title,
    address,
    normalized_address: normalizeAddress(address),
    latitude,
    longitude,
    price_clp: price.price_clp,
    price_uf: price.price_uf,
    price_uf_m2: price.price_uf != null && usefulArea ? price.price_uf / usefulArea : null,
    land_area_m2: landArea,
    built_area_m2: builtArea,
    useful_area_m2: usefulArea,
    bedrooms,
    bathrooms,
    parking_spaces: parkingSpaces,
    construction_year: integer(deepFind(structured, ['yearBuilt', 'construction_year'])),
    published_at: publishedAt,
  }
}

async function configurePage(page: Page) {
  await page.setViewport({ width: 1440, height: 1000 })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-CL,es;q=0.9,en;q=0.7',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  })
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const resourceType = request.resourceType()
    if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') request.abort()
    else request.continue()
  })
}

async function createBrowser() {
  process.env.PUPPETEER_CACHE_DIR = path.join(process.cwd(), 'node_modules', '.puppeteer_cache')
  const { default: puppeteer } = await import('puppeteer')
  const executablePath = await puppeteer.executablePath()

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
}

async function discoverListingUrls(browser: Browser, searchUrls: string[], waitMs: number) {
  const urls: string[] = []
  for (const searchUrl of searchUrls) {
    const page = await browser.newPage()
    try {
      await configurePage(page)
      const response = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      if (!response?.ok()) throw new Error(`Portal search returned HTTP ${response?.status() ?? 'unknown'}`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      const found = await page.$$eval('a[href]', (anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href))
      urls.push(...found.filter((href) => /MLC-?\d+/i.test(href)))
    } finally {
      await page.close()
    }
  }
  return unique(urls.map(canonicalListingUrl))
}

export async function collectPortalVitacura(options: PortalCollectorOptions): Promise<PortalCollectionResult> {
  const commune = options.commune || DEFAULT_COMMUNE
  const operation = options.operation || 'venta'
  const maxPages = Math.min(Math.max(options.maxPages || 1, 1), 10)
  const maxListings = Math.min(Math.max(options.maxListings || 48, 1), 250)
  const waitMs = Math.min(Math.max(options.waitMs || 1_200, 300), 5_000)
  const searchBase = buildSearchBase(options.datasetKind, operation, commune)
  const searchUrls = Array.from({ length: maxPages }, (_, index) => buildSearchUrl(searchBase, index + 1))
  const browser = await createBrowser()

  try {
    const listingUrls = (await discoverListingUrls(browser, searchUrls, waitMs)).slice(0, maxListings)
    const rows: MarketImportInputRow[] = []
    const failures: Array<{ url: string; error: string }> = []

    for (const url of listingUrls) {
      const page = await browser.newPage()
      try {
        await configurePage(page)
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        if (!response?.ok()) throw new Error(`Listing returned HTTP ${response?.status() ?? 'unknown'}`)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        const html = await page.content()
        const row = parsePortalListing(html, url, options.datasetKind)
        if (!row.source_listing_id) throw new Error('Missing stable Portal listing identifier')
        rows.push(row)
      } catch (error) {
        failures.push({ url, error: error instanceof Error ? error.message : String(error) })
      } finally {
        await page.close()
      }
    }

    return {
      searchUrls,
      listingUrls,
      rows,
      failures,
      observedAt: new Date().toISOString(),
    }
  } finally {
    await browser.close()
  }
}
