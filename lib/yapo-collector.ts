import { parse } from 'node-html-parser'
import type { Browser, Page } from 'puppeteer-core'
import type { MarketImportInputRow } from '@/lib/market-import'
import { launchServerlessBrowser } from '@/lib/serverless-browser'

const YAPO_ORIGIN = 'https://www.yapo.cl'
const DEFAULT_SEARCH_URL = `${YAPO_ORIGIN}/paginas/region-metropolitana/vitacura/comprar/casa`

export type YapoCollectorOptions = {
  searchUrl?: string
  maxListings?: number
  waitMs?: number
}

export type YapoCollectionResult = {
  searchUrl: string
  listingUrls: string[]
  rows: MarketImportInputRow[]
  failures: Array<{ url: string; error: string }>
  observedAt: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function compact(value: unknown) {
  if (value == null) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

function localizedNumber(value: unknown) {
  const raw = compact(value)
  if (!raw) return null
  const cleaned = raw
    .replace(/UF|CLP|\$|m²|m2/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '')
  if (!cleaned) return null
  const normalized = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned)
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.includes('.') && cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = localizedNumber(value)
  return parsed == null ? null : Math.round(parsed)
}

function chileDate(value: string | null) {
  if (!value) return null
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}T00:00:00.000Z`
}

function matchText(body: string, pattern: RegExp) {
  return compact(body.match(pattern)?.[1])
}

function matchNumber(body: string, pattern: RegExp) {
  return localizedNumber(matchText(body, pattern))
}

function matchInteger(body: string, pattern: RegExp) {
  return integer(matchText(body, pattern))
}

function listingIdFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, YAPO_ORIGIN)
    if (!['yapo.cl', 'www.yapo.cl'].includes(url.hostname.toLowerCase())) return null
    const match = url.pathname.match(/\/bienes-raices-venta-de-propiedades-casas\/[^/]+\/(\d+)\/?$/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function canonicalListingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, YAPO_ORIGIN)
    const listingId = listingIdFromUrl(url.toString())
    if (!listingId) return null
    url.hostname = 'www.yapo.cl'
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function extractYapoListingUrls(hrefs: string[]) {
  const unique = new Set<string>()
  for (const href of hrefs) {
    const canonical = canonicalListingUrl(href)
    if (canonical) unique.add(canonical)
  }
  return [...unique]
}

export function parseYapoListingHtml(url: string, html: string): MarketImportInputRow {
  const root = parse(html)
  const body = compact(root.textContent) ?? ''
  const listingId = listingIdFromUrl(url) ?? ''
  const title = compact(root.querySelector('h1')?.textContent)
    ?? compact(root.querySelector('meta[property="og:title"]')?.getAttribute('content'))

  const rawAddress = matchText(body, /Direcci[oó]n exacta\s+(.+?)(?=\s+(?:Gastos comunes|Año de construcci[oó]n|Niveles|Balc[oó]n\/Terraza|Piscina|Descripci[oó]n))/i)
  const address = rawAddress && !/pregunta al anunciante/i.test(rawAddress) ? rawAddress : null
  const locality = matchText(body, /Localizaci[oó]n\s+(.+?)(?=\s+(?:Publicado|Precio\/M²|M² totales|Direcci[oó]n exacta|Gastos comunes|Año de construcci[oó]n))/i)
    ?? (/(?:^|\s)Vitacura(?:\s|$)/i.test(body) ? 'Vitacura' : null)
  const publishedText = matchText(body, /Publicado\s+(\d{2}\/\d{2}\/\d{4})/i)
  const reference = matchText(body, /Ref\.?:\s*([^\s]+)/i)

  return {
    source_system: 'yapo',
    source_listing_id: listingId,
    source_reference: reference,
    url: canonicalListingUrl(url) ?? url,
    title,
    address,
    locality,
    property_type: 'Casa',
    operation: 'Venta',
    status: 'active',
    price_uf: matchNumber(body, /Precio\s+UF\s*([\d.,]+)/i) ?? matchNumber(body, /UF\s*([\d.,]+)/i),
    price_uf_m2: matchNumber(body, /Precio\/M² de construcci[oó]n\s+UF\s*([\d.,]+)/i),
    built_area_m2: matchNumber(body, /[ÁA]rea construida\s*\(m²\)\s*([\d.,]+)/i),
    land_area_m2: matchNumber(body, /M² totales\s*([\d.,]+)/i),
    bedrooms: matchInteger(body, /Dormitorios\s*(\d+)/i),
    bathrooms: matchInteger(body, /Baños\s*(\d+)/i),
    parking_spaces: matchInteger(body, /Estacionamientos\s*(\d+)/i),
    construction_year: matchInteger(body, /Año de construcci[oó]n\s*(\d{4})/i),
    published_at: chileDate(publishedText),
  }
}

async function open(page: Page, url: string, waitMs: number) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`)
  await sleep(waitMs)
}

async function discoverListingUrls(page: Page, searchUrl: string, waitMs: number) {
  await open(page, searchUrl, waitMs)
  for (let index = 0; index < 3; index += 1) {
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight, 900)))
    await sleep(Math.max(250, waitMs))
  }
  const hrefs = await page.$$eval('a[href]', (anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href))
  return extractYapoListingUrls(hrefs)
}

async function collectWithBrowser(browser: Browser, options: Required<YapoCollectorOptions>): Promise<YapoCollectionResult> {
  const page = await browser.newPage()
  page.setDefaultTimeout(45_000)
  page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36')
  const observedAt = new Date().toISOString()
  const rows: MarketImportInputRow[] = []
  const failures: Array<{ url: string; error: string }> = []

  try {
    const listingUrls = (await discoverListingUrls(page, options.searchUrl, options.waitMs)).slice(0, options.maxListings)
    for (const url of listingUrls) {
      try {
        await open(page, url, options.waitMs)
        rows.push(parseYapoListingHtml(url, await page.content()))
      } catch (error) {
        failures.push({ url, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { searchUrl: options.searchUrl, listingUrls, rows, failures, observedAt }
  } finally {
    await page.close()
  }
}

export async function collectYapoVitacura(options: YapoCollectorOptions = {}): Promise<YapoCollectionResult> {
  const resolved: Required<YapoCollectorOptions> = {
    searchUrl: options.searchUrl ?? DEFAULT_SEARCH_URL,
    maxListings: Math.max(1, Math.min(options.maxListings ?? 3, 12)),
    waitMs: Math.max(200, options.waitMs ?? 600),
  }
  const browser = await launchServerlessBrowser()
  try {
    return await collectWithBrowser(browser, resolved)
  } finally {
    await browser.close()
  }
}
