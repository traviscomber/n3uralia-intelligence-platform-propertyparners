import type { Browser, Page } from 'puppeteer-core'
import { parse, type HTMLElement } from 'node-html-parser'
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

function normalizeLabel(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function numeric(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = text(value)
  if (!raw) return null
  const cleaned = raw.replace(/\s+/g, '').replace(/\$/g, '').replace(/UF|CLP|m²|m2/gi, '')
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
  const parsed = localizedNumeric(value)
  return parsed == null ? null : Math.round(parsed)
}

function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = integer(value)
  return parsed != null && parsed >= min && parsed <= max ? parsed : null
}

function plausibleArea(value: unknown) {
  const parsed = localizedNumeric(value)
  return parsed != null && parsed > 5 && parsed < 10_000 ? parsed : null
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
    candidates.push(...(decoded.match(/https?:\/\/(?:www\.)?portalinmobiliario\.com\/[^"'<>\\\s]+-nva\/?/gi) ?? []))
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
      try { return JSON.parse(script.textContent) } catch { return null }
    })
    .filter(Boolean)
}

function flattenJsonLd(values: unknown[]): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
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

function firstPrimaryTitle(root: HTMLElement) {
  return text(root.querySelector('h1')?.text)
    || text(root.querySelector('meta[property="og:title"]')?.getAttribute('content'))
}

function primaryPriceTitle(root: HTMLElement, fallback: string | null) {
  return text(root.querySelector('meta[property="og:title"]')?.getAttribute('content')) || fallback
}

function extractPrimarySpecs(root: HTMLElement) {
  const specs = new Map<string, string>()
  for (const row of root.querySelectorAll('.andes-table__row')) {
    const columns = row.querySelectorAll('.andes-table__column')
    if (columns.length < 2) continue
    const label = normalizeLabel(columns[0].textContent)
    const value = text(columns[1].textContent)
    if (label && value && !specs.has(label)) specs.set(label, value)
  }
  return specs
}

function specValue(specs: Map<string, string>, ...labels: string[]) {
  for (const label of labels) {
    const value = specs.get(normalizeLabel(label))
    if (value) return value
  }
  return null
}

function specArea(specs: Map<string, string>, ...labels: string[]) {
  return plausibleArea(specValue(specs, ...labels))
}

function specInteger(specs: Map<string, string>, max: number, ...labels: string[]) {
  return boundedInteger(specValue(specs, ...labels), 0, max)
}

function normalizedBodyText(root: HTMLElement) {
  return text(root.querySelector('body')?.textContent || root.textContent) || ''
}

function primaryListingText(root: HTMLElement, title: string | null) {
  const body = normalizedBodyText(root)
  const start = title ? body.indexOf(title) : -1
  const fromTitle = start >= 0 ? body.slice(start + title!.length) : body
  const end = fromTitle.search(/Características del inmueble|Caracteristicas del inmueble/i)
  return end >= 0 ? fromTitle.slice(0, end) : fromTitle.slice(0, 2_500)
}

function regexArea(source: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = source.match(pattern)
    const value = match?.[1] ? plausibleArea(match[1]) : null
    if (value != null) return value
  }
  return null
}

function regexInteger(source: string, max: number, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = source.match(pattern)
    const value = match?.[1] ? boundedInteger(match[1], 0, max) : null
    if (value != null) return value
  }
  return null
}

function cleanAddress(value: string | null) {
  if (!value) return null
  const cleaned = value
    .split(/(?:UF\s*[\d.]|\$\s*[\d.]|Gastos comunes)/i)[0]
    .replace(/[|·-]+\s*$/, '')
    .trim()
  return cleaned.length >= 4 && cleaned.length <= 260 ? cleaned : null
}

function extractVisiblePrimaryFacts(root: HTMLElement, title: string | null) {
  const body = normalizedBodyText(root)
  const primary = primaryListingText(root, title)
  const usefulArea = regexArea(body, [
    /Superficie útil\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /Superficie util\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /Superficie cubierta\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
  ]) || regexArea(primary, [/([\d.,]+)\s*m(?:²|2)\s*útiles/i, /([\d.,]+)\s*m(?:²|2)\s*utiles/i])
  const totalArea = regexArea(body, [
    /Superficie total\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /Superficie construida\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
  ]) || regexArea(primary, [/([\d.,]+)\s*m(?:²|2)\s*totales/i, /([\d.,]+)\s*m(?:²|2)\s*total/i])
  const landArea = regexArea(body, [
    /Superficie de terreno\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /Superficie terreno\s*[:|]?\s*([\d.,]+)\s*m(?:²|2)/i,
  ])
  const bedrooms = regexInteger(primary, 15, [/(\d+)\s*dorm(?:\.|itorios?|itorio)?/i, /(\d+)\s*habitaciones?/i])
  const bathrooms = regexInteger(primary, 15, [/(\d+)\s*bañ(?:os?|o)?/i, /(\d+)\s*ban(?:os?|o)?/i])
  const parkingSpaces = regexInteger(body, 20, [/Estacionamientos?\s*[:|]?\s*(\d+)/i])

  let address: string | null = null
  if (title) {
    const titleIndex = body.indexOf(title)
    if (titleIndex >= 0) {
      const afterTitle = body.slice(titleIndex + title.length, titleIndex + title.length + 600)
      const priceIndex = afterTitle.search(/(?:UF\s*[\d.]|\$\s*[\d.])/i)
      address = cleanAddress(priceIndex >= 0 ? afterTitle.slice(0, priceIndex) : null)
    }
  }
  return { usefulArea, totalArea, landArea, bedrooms, bathrooms, parkingSpaces, address }
}

function parsePrimaryPrice(root: HTMLElement, title: string | null, jsonLd: unknown[]) {
  const titleUf = title?.match(/(?:^|[-·|])\s*UF\s*([\d.]+(?:,\d+)?)/i) || title?.match(/UF\s*([\d.]+(?:,\d+)?)/i)
  if (titleUf) {
    const amount = localizedNumeric(titleUf[1])
    if (amount != null && amount > 0) return { price_uf: amount, price_clp: null }
  }
  const mainMoney = text(root.querySelector('.andes-money-amount')?.textContent)
  const moneyUf = mainMoney?.match(/UF\s*([\d.]+(?:,\d+)?)/i)
  if (moneyUf) {
    const amount = localizedNumeric(moneyUf[1])
    if (amount != null && amount > 0) return { price_uf: amount, price_clp: null }
  }
  const moneyClp = mainMoney?.match(/\$\s*([\d.]+)/)
  if (moneyClp) {
    const amount = localizedNumeric(moneyClp[1])
    if (amount != null && amount > 0) return { price_uf: null, price_clp: amount }
  }
  const priceCurrency = text(deepFind(jsonLd, ['priceCurrency']))?.toUpperCase()
  const amount = localizedNumeric(deepFind(jsonLd, ['price']))
  if (amount != null && amount > 0 && priceCurrency === 'UF') return { price_uf: amount, price_clp: null }
  if (amount != null && amount > 0 && (priceCurrency === 'CLP' || priceCurrency === '$')) return { price_uf: null, price_clp: amount }
  return { price_uf: null, price_clp: null }
}

function extractPrimaryGeo(jsonLd: unknown[]) {
  const latitude = numeric(deepFind(jsonLd, ['latitude']))
  const longitude = numeric(deepFind(jsonLd, ['longitude']))
  const valid = latitude != null && longitude != null && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  return valid ? { latitude, longitude } : { latitude: null, longitude: null }
}

function extractPrimaryAddress(jsonLd: unknown[]) {
  const addressObject = deepFind(jsonLd, ['address'])
  if (!addressObject || typeof addressObject !== 'object') return null
  return cleanAddress(text(deepFind(addressObject, ['streetAddress'])) || text(deepFind(addressObject, ['name'])))
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
  const title = firstPrimaryTitle(root)
  const specs = extractPrimarySpecs(root)
  const visible = extractVisiblePrimaryFacts(root, title)
  const price = parsePrimaryPrice(root, primaryPriceTitle(root, title), jsonLd)
  const listingId = extractListingId(url, datasetKind) || text(deepFind(jsonLd, ['productID', 'sku', 'identifier'])) || ''
  const geo = extractPrimaryGeo(jsonLd)
  const address = cleanAddress(extractPrimaryAddress(jsonLd) || visible.address)
  const totalArea = specArea(specs, 'Superficie total', 'Superficie construida') || visible.totalArea
  const usefulArea = specArea(specs, 'Superficie útil', 'Superficie util', 'Superficie cubierta') || visible.usefulArea
  const landArea = specArea(specs, 'Superficie de terreno', 'Superficie terreno', 'Terreno') || visible.landArea
  const bedrooms = specInteger(specs, 15, 'Dormitorios', 'Dormitorio', 'Habitaciones', 'Habitación') ?? visible.bedrooms
  const bathrooms = specInteger(specs, 15, 'Baños', 'Banos', 'Baño', 'Bano') ?? visible.bathrooms
  const parkingSpaces = specInteger(specs, 20, 'Estacionamientos', 'Estacionamiento', 'Cocheras', 'Cochera') ?? visible.parkingSpaces
  const constructionYear = boundedInteger(specValue(specs, 'Año de construcción', 'Ano de construccion'), 1800, new Date().getFullYear())
  const publishedAt = text(deepFind(jsonLd, ['datePosted', 'datePublished']))

  return {
    source_listing_id: String(listingId),
    property_type: inferPropertyType(datasetKind),
    operation: 'Venta',
    status: 'active',
    url: canonicalListingUrl(url),
    title,
    address,
    normalized_address: normalizeAddress(address),
    latitude: geo.latitude,
    longitude: geo.longitude,
    price_clp: price.price_clp,
    price_uf: price.price_uf,
    price_uf_m2: price.price_uf != null && usefulArea ? price.price_uf / usefulArea : null,
    land_area_m2: datasetKind === 'portal_houses' ? landArea : null,
    built_area_m2: totalArea,
    useful_area_m2: usefulArea,
    bedrooms,
    bathrooms,
    parking_spaces: parkingSpaces,
    construction_year: constructionYear,
    published_at: publishedAt,
  }
}

async function configurePage(page: Page) {
  await page.setViewport({ width: 1440, height: 1000 })
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
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

async function waitForPrimaryDetail(page: Page, waitMs: number) {
  await Promise.allSettled([
    page.waitForSelector('.andes-money-amount', { timeout: 4_000 }),
    page.waitForSelector('h1', { timeout: 4_000 }),
  ])
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 250)))
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
        await waitForPrimaryDetail(page, waitMs)
        const html = await page.content()
        const row = parsePortalListing(html, url, options.datasetKind)
        if (!row.source_listing_id) throw new Error('Missing stable Portal listing identifier')
        const parsedPriceUf = numeric(row.price_uf)
        if (parsedPriceUf != null && parsedPriceUf > 0 && parsedPriceUf < 100) throw new Error('Implausible UF price after normalization')
        rows.push(row)
      } catch (error) {
        failures.push({ url, error: error instanceof Error ? error.message : String(error) })
      } finally {
        await page.close()
      }
    }
    return { searchUrls, listingUrls, rows, failures, observedAt: new Date().toISOString() }
  } finally {
    await browser.close()
  }
}
