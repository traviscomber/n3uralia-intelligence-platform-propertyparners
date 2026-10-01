import {
  parsePortalListing,
  portalListingIdFromUrl,
  type PortalCollectorOptions,
  type PortalDiscoveryResult,
} from '@/lib/portal-inmobiliario-collector'
import type { PortalDatasetKind } from '@/lib/market-source-import'
import type { MarketImportInputRow } from '@/lib/market-import'

const PORTAL_ORIGIN = 'https://www.portalinmobiliario.com'
const DEFAULT_COMMUNE = 'vitacura-metropolitana'

type FirecrawlDoc = {
  links?: string[]
  rawHtml?: string | null
  html?: string | null
  metadata?: Record<string, unknown>
}

function buildSearchBase(datasetKind: PortalDatasetKind, operation: string, commune: string) {
  if (datasetKind === 'portal_houses') return `${PORTAL_ORIGIN}/${operation}/casa/${commune}`
  if (datasetKind === 'portal_projects') return `${PORTAL_ORIGIN}/${operation}/departamento/proyectos/${commune}`
  return `${PORTAL_ORIGIN}/${operation}/departamento/${commune}`
}

function buildSearchUrl(base: string, page: number, datasetKind: PortalDatasetKind) {
  if (page <= 1) return base
  const pageSize = datasetKind === 'portal_projects' ? 20 : 48
  const offset = (page - 1) * pageSize + 1
  return `${base}/_Desde_${offset}_NoIndex_True`
}

function canonicalListingUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, PORTAL_ORIGIN)
    if (parsed.hostname.toLowerCase() === 'portalinmobiliario.com') parsed.hostname = 'www.portalinmobiliario.com'
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rawUrl
  }
}

function isListingUrl(url: string, datasetKind: PortalDatasetKind) {
  try {
    const parsed = new URL(url, PORTAL_ORIGIN)
    const host = parsed.hostname.toLowerCase()
    if (!['portalinmobiliario.com', 'www.portalinmobiliario.com'].includes(host)) return false
    if (datasetKind === 'portal_projects') return /MLC-?\d+/i.test(parsed.href) || /\/p\/MLC\d+/i.test(parsed.pathname) || /\/\d+-[^/]+-nva\/?$/i.test(parsed.pathname)
    return /MLC-?\d+/i.test(parsed.href) || /\/p\/MLC\d+/i.test(parsed.pathname)
  } catch {
    return false
  }
}

async function firecrawlScrape(url: string, formats: string[]): Promise<FirecrawlDoc> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY_MISSING')

  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats,
      maxAge: 0,
      proxy: 'stealth',
      location: { country: 'CL', languages: ['es'] },
      waitFor: 2500,
      timeout: 60000,
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !payload) throw new Error(`FIRECRAWL_HTTP_${response.status}`)
  const success = payload.success
  if (success === false) throw new Error('FIRECRAWL_SCRAPE_FAILED')
  const doc = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as FirecrawlDoc
  const title = String(doc.metadata?.title ?? '')
  if (/mercado libre/i.test(title) && !(doc.links ?? []).some((link) => /MLC-?\d+/i.test(link))) {
    throw new Error('FIRECRAWL_PORTAL_BLOCKED')
  }
  return doc
}

export async function discoverPortalVitacuraViaFirecrawl(
  options: PortalCollectorOptions,
): Promise<PortalDiscoveryResult> {
  const datasetKind = options.datasetKind
  const commune = options.commune ?? DEFAULT_COMMUNE
  const operation = options.operation ?? 'venta'
  const maxPages = Math.max(1, options.maxPages ?? 40)
  const pageSize = datasetKind === 'portal_projects' ? 20 : 48
  const base = buildSearchBase(datasetKind, operation, commune)
  const urls = new Set<string>()
  const searchUrls: string[] = []
  const newListingsPerPage: number[] = []
  let rawListingCandidates = 0
  let duplicateListingCandidates = 0
  let exhausted = false

  for (let page = 1; page <= maxPages; page += 1) {
    const searchUrl = buildSearchUrl(base, page, datasetKind)
    searchUrls.push(searchUrl)
    let doc = await firecrawlScrape(searchUrl, ['links'])
    let candidates = (doc.links ?? [])
      .map(canonicalListingUrl)
      .filter((url) => isListingUrl(url, datasetKind))

    if (candidates.length === 0 && page > 1) {
      for (let retry = 0; retry < 2 && candidates.length === 0; retry += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        doc = await firecrawlScrape(searchUrl, ['links'])
        candidates = (doc.links ?? [])
          .map(canonicalListingUrl)
          .filter((url) => isListingUrl(url, datasetKind))
      }
    }

    rawListingCandidates += candidates.length
    const before = urls.size
    for (const url of candidates) {
      if (urls.has(url)) duplicateListingCandidates += 1
      urls.add(url)
    }
    const added = urls.size - before
    newListingsPerPage.push(added)

    if (candidates.length < pageSize || added === 0) {
      exhausted = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 3200))
  }

  const listingUrls = [...urls]
  return {
    searchUrls,
    listingUrls,
    observedAt: new Date().toISOString(),
    discovery: {
      pagesVisited: searchUrls.length,
      newListingsPerPage,
      rawListingCandidates,
      duplicateListingCandidates,
      uniqueListings: listingUrls.length,
      // Exhaustion is stronger evidence here than a rendered result counter:
      // Firecrawl paginates until Portal returns a short/no-new-results page.
      reportedResultCount: exhausted ? listingUrls.length : null,
      exhausted,
      capped: !exhausted && searchUrls.length >= maxPages,
    },
  }
}

export async function collectPortalListingDetailsViaFirecrawl(args: {
  datasetKind: PortalDatasetKind
  listingUrls: string[]
}) {
  const rows: MarketImportInputRow[] = []
  const failures: Array<{ url: string; error: string }> = []
  const concurrency = 1

  for (let start = 0; start < args.listingUrls.length; start += concurrency) {
    const batch = args.listingUrls.slice(start, start + concurrency)
    const results = await Promise.all(batch.map(async (url) => {
      try {
        const doc = await firecrawlScrape(url, ['rawHtml'])
        const html = doc.rawHtml || doc.html || ''
        if (!html) throw new Error('FIRECRAWL_EMPTY_DETAIL')
        const row = parsePortalListing(html, url, args.datasetKind)
        if (!row.source_listing_id) row.source_listing_id = portalListingIdFromUrl(url, args.datasetKind) ?? ''
        return { row, failure: null }
      } catch (error) {
        return { row: null, failure: { url, error: error instanceof Error ? error.message : String(error) } }
      }
    }))
    for (const result of results) {
      if (result.row) rows.push(result.row)
      if (result.failure) failures.push(result.failure)
    }
    if (start + concurrency < args.listingUrls.length) await new Promise((resolve) => setTimeout(resolve, 1200))
  }

  return { observedAt: new Date().toISOString(), rows, failures }
}
