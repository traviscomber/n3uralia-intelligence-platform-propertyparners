import type { Browser, Page } from 'puppeteer-core'
import { parse } from 'node-html-parser'
import type { MarketImportInputRow } from '@/lib/market-import'
import type { PortalDatasetKind } from '@/lib/market-source-import'
import { launchServerlessBrowser } from '@/lib/serverless-browser'

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
  if (datasetKind === 'portal_houses') return `${PORTAL_ORIGIN}/${operation}/casa/propiedades-usadas/${commune}`
  if (datasetKind === 'portal_projects') return `${PORTAL_ORIGIN}/${operation}/departamento/proyectos/${commune}`
  return `${PORTAL_ORIGIN}/${operation}/departamento/propiedades-usadas/${commune}`
}

function buildSearchUrl(base: string, page: number, datasetKind: PortalDatasetKind) {
  if (page <= 1) return base
  const pageSize = datasetKind === 'portal_projects' ? 20 : 48
  const offset = (page - 1) * pageSize + 1
  return `${base}/_Desde_${offset}_NoIndex_True`
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

function localizedNumeric(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = text(value)
  if (!raw) return null
  const cleaned = raw
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/UF|CLP|m²|m2/gi, '')
    .replace(/[^0-9,.-]/g, '')
  if (!cleaned) return null

  const thousands = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/
  const normalized = thousands.test(cleaned)
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = numeric(value)
  return parsed == null ? null : Math.round(parsed)
}

function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = integer(value)
  return parsed != null && parsed >= min && parsed <= max ? parsed : null
}

function extractListingId(url: string, datasetKind: PortalDatasetKind) {
  const mlcMatch = url.match(/MLC-?(\d+)/i) || url.match(/\/p\/(MLC\d+)/i)
  if (mlcMatch) return mlcMatch[1].replace(/^MLC/i, '')

  if (datasetKind === 'portal_projects') {
    try {
      const pathname = new URL(url, PORTAL_ORIGIN).pathname
      const projectMatch = pathname.match(/\/(\d+)-[^/]+-nva\/?$/i)
      if (projectMatch) return `project-${projectMatch[1]}`
    } catch {
      return null
    }
  }

  return null
}

function canonicalListingUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl, PORTAL_ORIGIN)
    if (parsedUrl.hostname.toLowerCase() === 'portalinmobiliario.com') parsedUrl.hostname = 'www.portalinmobiliario.com'
    parsedUrl.search = ''
    parsedUrl.hash = ''
    return parsedUrl.toString()
  } catch {
    return rawUrl
  }
}

function isDatasetListingUrl(rawUrl: string, datasetKind: PortalDatasetKind) {
  try {
    const parsedUrl = new URL(rawUrl, PORTAL_ORIGIN)
    const hostname = parsedUrl.hostname.toLowerCase()
    if (hostname !== 'www.portalinmobiliario.com' && hostname !== 'portalinmobiliario.com') return false
    if (datasetKind === 'portal_projects') return /\/\d+-[^/]+-nva\/?$/i.test(parsedUrl.pathname)
    return /MLC-?\d+/i.test(parsedUrl.href) || /\/p\/MLC\d+/i.test(parsedUrl.pathname)
  } catch {
    return false
  }
}

function decodeEmbeddedMarkup(html: string) {
  return html
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003A/gi, ':')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003D/gi, '=')
    .replace(/\\u003F/gi, '?')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
}

function extractEmbeddedListingUrls(html: string, datasetKind: PortalDatasetKind) {
  const decoded = decodeEmbeddedMarkup(html)
  const candidates: string[] = []

  if (datasetKind === 'portal_projects') {
    const absoluteProjects = decoded.match(/https?:\/\/(?:www\.)?portalinmobiliario\.com\/[^"'<>\\\s]+-nva\/?/gi) ?? []
    candidates.push(...absoluteProjects)
  } else {
    const absoluteListings = decoded.match(/https?:\/\/(?:www\.)?portalinmobiliario\.com\/(?:MLC-?\d+|p\/MLC\d+)[^"'<>\\\s]*/gi) ?? []
    const relativeListings = decoded.match(/\/(?:MLC-?\d+|p\/MLC\d+)[^"'<>\\\s]*/gi) ?? []
    candidates.push(...absoluteListings, ...relativeListings.map((value) => new URL(value, PORTAL_ORIGIN).toString()))
  }

  return unique(candidates.map(canonicalListingUrl).filter((href) => isDatasetListingUrl(href, datasetKind)))
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

function bodyText(html: string) {
  return parse(html).text.replace(/\s+/g, ' ')
}

function parsePrice(html: string, structured: unknown[]) {
  const plain = bodyText(html)
  const ufMatch = plain.match(/UF\s*([\d.]+(?:,\d+)?)/i)
  if (ufMatch) {
    const amount = localizedNumeric(ufMatch[1])
    if (amount != null && amount > 0) return { price_uf: amount, price_clp: null }
  }

  const clpMatch = plain.match(/\$\s*([\d.]+)/)
  if (clpMatch) {
    const amount = localizedNumeric(clpMatch[1])
    if (amount != null && amount > 0) return { price_uf: null, price_clp: amount }
  }

  const priceCurrency = text(deepFind(structured, ['priceCurrency', 'currency_id', 'currency']))?.toUpperCase()
  const amount = numeric(deepFind(structured, ['price', 'amount', 'price_amount', 'priceAmount']))
  if (amount != null && amount > 0 && priceCurrency === 'UF') return { price_uf: amount, price_clp: null }
  if (amount != null && amount > 0 && (priceCurrency === 'CLP' || priceCurrency === '$')) return { price_uf: null, price_clp: amount }
  return { price_uf: null, price_clp: null }
}

function valueNearLabel(html: string, labels: string[]) {
  const plain = bodyText(html)
  for (const label of labels) {
    const after = plain.match(new RegExp(`${label}\\s*[:]?\\s*([\\d.,]+)\\s*(?:m²|m2)?`, 'i'))
    if (after) {
      const value = localizedNumeric(after[1])
      if (value != null) return value
    }
    const before = plain.match(new RegExp(`([\\d.,]+)\\s*(?:m²|m2)?\\s*${label}`, 'i'))
    if (before) {
      const value = localizedNumeric(before[1])
      if (value != null) return value
    }
  }
  return null
}

function integerNearLabel(html: string, labels: string[], max = 20) {
  const plain = bodyText(html)
  for (const label of labels) {
    const before = plain.match(new RegExp(`(\\d+)\\s*${label}`, 'i'))
    if (before) {
      const value = boundedInteger(before[1], 0, max)
      if (value != null) return value
    }
    const after = plain.match(new RegExp(`${label}\\s*[:]?\\s*(\\d+)`, 'i'))
    if (after) {
      const value = boundedInteger(after[1], 0, max)
      if (value != null) return value
    }
  }
  return null
}

function plausibleArea(value: number | null) {
  return value != null && value > 5 && value < 10_000 ? value : null
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
  const listingId = extractListingId(url, datasetKind) || text(deepFind(structured, ['item_id', 'listing_id', 'productID', 'id'])) || ''
  const title = text(root.querySelector('meta[property="og:title"]')?.getAttribute('content'))
    || text(root.querySelector('h1')?.text)
    || text(deepFind(structured, ['title', 'name']))
  const addressObject = deepFind(structured, ['address'])
  const address = typeof addressObject === 'object' && addressObject
    ? text(deepFind(addressObject, ['streetAddress', 'addressLocality', 'name']))
    : text(addressObject)
      || text(deepFind(structured, ['location_name', 'locationName', 'subtitle']))
  const latitude = numeric(deepFind(structured, ['latitude', 'lat']))
  const longitude = numeric(deepFind(structured, ['longitude', 'lng', 'lon']))
  const price = parsePrice(html, structured)

  const visibleUseful = valueNearLabel(html, ['Superficie útil', 'Superficie util', 'Superficie cubierta'])
  const visibleTotal = valueNearLabel(html, ['Superficie total', 'Superficie construida'])
  const visibleLand = valueNearLabel(html, ['Superficie de terreno', 'Superficie terreno', 'Terreno'])
  const structuredUseful = numeric(deepFind(structured, ['usable_area', 'useful_area', 'covered_area']))
  const structuredBuilt = numeric(deepFind(structured, ['built_area', 'total_area']))
  const structuredLand = numeric(deepFind(structured, ['land_area', 'plot_area']))
  const usefulArea = plausibleArea(visibleUseful) ?? plausibleArea(structuredUseful)
  const builtArea = plausibleArea(visibleTotal) ?? plausibleArea(structuredBuilt)
  const landArea = plausibleArea(visibleLand) ?? plausibleArea(structuredLand)

  const bedrooms = integerNearLabel(html, ['dormitorios?', 'dorm\\.?', 'habitaciones?'], 15)
    ?? boundedInteger(deepFind(structured, ['numberOfBedrooms', 'bedrooms', 'bedroom_count']), 0, 15)
  const bathrooms = integerNearLabel(html, ['baños?', 'banos?'], 15)
    ?? boundedInteger(deepFind(structured, ['numberOfBathroomsTotal', 'bathrooms', 'bathroom_count']), 0, 15)
  const parkingSpaces = integerNearLabel(html, ['estacionamientos?', 'cocheras?'], 20)
    ?? boundedInteger(deepFind(structured, ['parking_spaces', 'parking', 'garage_count']), 0, 20)
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
    construction_year: boundedInteger(deepFind(structured, ['yearBuilt', 'construction_year']), 1800, new Date().getFullYear()),
    published_at: publishedAt,
  }
}

async function configurePage(page: Page) {
  await page.setViewport({ width: 1440, height: 1000 })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
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

async function discoverListingUrls(browser: Browser, searchUrls: string[], datasetKind: PortalDatasetKind, waitMs: number) {
  const urls: string[] = []

  for (const searchUrl of searchUrls) {
    const page = await browser.newPage()
    try {
      await configurePage(page)
      const response = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      if (!response?.ok()) throw new Error(`Portal search returned HTTP ${response?.status() ?? 'unknown'}`)
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
      const anchorUrls = await page.$$eval('a[href]', (anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href))
      const html = await page.content()
      const embeddedUrls = extractEmbeddedListingUrls(html, datasetKind)
      urls.push(...[...anchorUrls, ...embeddedUrls].map(canonicalListingUrl).filter((href) => isDatasetListingUrl(href, datasetKind)))
    } finally {
      await page.close()
    }
  }

  return unique(urls)
}

export async function collectPortalVitacura(options: PortalCollectorOptions): Promise<PortalCollectionResult> {
  const commune = options.commune || DEFAULT_COMMUNE
  const operation = options.operation || 'venta'
  const maxPages = Math.min(Math.max(options.maxPages || 1, 1), 10)
  const maxListings = Math.min(Math.max(options.maxListings || 48, 1), 250)
  const waitMs = Math.min(Math.max(options.waitMs || 1_200, 300), 5_000)
  const searchBase = buildSearchBase(options.datasetKind, operation, commune)
  const searchUrls = Array.from({ length: maxPages }, (_, index) => buildSearchUrl(searchBase, index + 1, options.datasetKind))
  const browser = await launchServerlessBrowser()

  try {
    const listingUrls = (await discoverListingUrls(browser, searchUrls, options.datasetKind, waitMs)).slice(0, maxListings)
    const rows: MarketImportInputRow[] = []
    const failures: Array<{ url: string; error: string }> = []

    for (const url of listingUrls) {
      const page = await browser.newPage()
      try {
        await configurePage(page)
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        if (!response?.ok()) throw new Error(`Listing returned HTTP ${response?.status() ?? 'unknown'}`)
        if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
        const html = await page.content()
        const row = parsePortalListing(html, url, options.datasetKind)
        if (!row.source_listing_id) throw new Error('Missing stable Portal listing identifier')
        if (row.price_uf != null && row.price_uf > 0 && row.price_uf < 100) throw new Error('Implausible UF price after normalization')
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
