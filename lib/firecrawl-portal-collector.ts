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

  for (let attempt = 1; attempt <= 8; attempt += 1) {
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
        waitFor: 2200,
        timeout: 60000,
      }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null) as Record<string, unknown> | null

    if (response.ok && payload) {
      if (payload.success === false) throw new Error('FIRECRAWL_SCRAPE_FAILED')
      const doc = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as FirecrawlDoc
      const title = String(doc.metadata?.title ?? '')
      if (/mercado libre/i.test(title) && !(doc.links ?? []).some((link) => /MLC-?\d+/i.test(link))) {
        throw new Error('FIRECRAWL_PORTAL_BLOCKED')
      }
      return doc
    }

    if (response.status !== 429 || attempt === 8) {
      throw new Error(`FIRECRAWL_HTTP_${response.status}`)
    }

    const retryAfter = Number(response.headers.get('retry-after') ?? 0)
    const waitMs = retryAfter > 0
      ? Math.min(retryAfter * 1000, 30000)
      : Math.min(4000 * attempt, 30000)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  throw new Error('FIRECRAWL_HTTP_429')
}

type FirecrawlBatchStatus = {
  success?: boolean
  status?: string
  id?: string
  total?: number
  completed?: number
  data?: FirecrawlDoc[]
  next?: string | null
  error?: unknown
}

async function firecrawlBatchScrape(urls: string[]): Promise<FirecrawlDoc[]> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY_MISSING')

  const startResponse = await fetch('https://api.firecrawl.dev/v2/batch/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls,
      formats: ['links'],
      maxAge: 0,
      proxy: 'stealth',
      location: { country: 'CL', languages: ['es'] },
      waitFor: 2200,
      timeout: 60000,
      ignoreInvalidURLs: true,
      maxConcurrency: 2,
    }),
    cache: 'no-store',
  })

  const started = await startResponse.json().catch(() => null) as FirecrawlBatchStatus | null
  if (!startResponse.ok || !started?.id) {
    throw new Error(`FIRECRAWL_BATCH_START_HTTP_${startResponse.status}`)
  }

  const deadline = Date.now() + 240_000
  let statusUrl = `https://api.firecrawl.dev/v2/batch/scrape/${started.id}`

  while (Date.now() < deadline) {
    const response = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null) as FirecrawlBatchStatus | null
    if (!response.ok || !payload) throw new Error(`FIRECRAWL_BATCH_STATUS_HTTP_${response.status}`)

    if (payload.status === 'failed') throw new Error('FIRECRAWL_BATCH_FAILED')
    if (payload.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      continue
    }

    const documents: FirecrawlDoc[] = [...(payload.data ?? [])]
    let next = payload.next ?? null
    let pages = 0
    while (next && pages < 20) {
      const pageResponse = await fetch(next, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      const pagePayload = await pageResponse.json().catch(() => null) as FirecrawlBatchStatus | null
      if (!pageResponse.ok || !pagePayload) throw new Error(`FIRECRAWL_BATCH_PAGE_HTTP_${pageResponse.status}`)
      documents.push(...(pagePayload.data ?? []))
      next = pagePayload.next ?? null
      pages += 1
    }
    return documents
  }

  throw new Error('FIRECRAWL_BATCH_TIMEOUT')
}

function sourceUrlOf(doc: FirecrawlDoc) {
  return String(doc.metadata?.sourceURL ?? doc.metadata?.url ?? '')
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
  const searchUrls = Array.from({ length: maxPages }, (_, index) => buildSearchUrl(base, index + 1, datasetKind))
  const docs = await firecrawlBatchScrape(searchUrls)
  const bySource = new Map<string, FirecrawlDoc>()

  for (const doc of docs) {
    const sourceURL = sourceUrlOf(doc)
    if (sourceURL) bySource.set(canonicalListingUrl(sourceURL), doc)
  }

  const urls = new Set<string>()
  const newListingsPerPage: number[] = []
  let rawListingCandidates = 0
  let duplicateListingCandidates = 0
  let exhausted = false
  let pagesVisited = 0

  for (let page = 1; page <= maxPages; page += 1) {
    const searchUrl = buildSearchUrl(base, page, datasetKind)
    const canonicalSearch = canonicalListingUrl(searchUrl)
    const doc = bySource.get(canonicalSearch)
      ?? docs.find((candidate) => sourceUrlOf(candidate).includes(`_Desde_${(page - 1) * pageSize + 1}`))
      ?? (page === 1 ? docs.find((candidate) => !sourceUrlOf(candidate).includes('_Desde_')) : undefined)

    pagesVisited += 1
    const candidates = (doc?.links ?? [])
      .map(canonicalListingUrl)
      .filter((url) => isListingUrl(url, datasetKind))

    rawListingCandidates += candidates.length
    const before = urls.size
    for (const url of candidates) {
      if (urls.has(url)) duplicateListingCandidates += 1
      urls.add(url)
    }
    const added = urls.size - before
    newListingsPerPage.push(added)

    if (page > 1 && (candidates.length === 0 || added === 0)) {
      exhausted = true
      break
    }
    if (candidates.length > 0 && candidates.length < pageSize) {
      exhausted = true
      break
    }
  }

  const listingUrls = [...urls]
  return {
    searchUrls: searchUrls.slice(0, pagesVisited),
    listingUrls,
    observedAt: new Date().toISOString(),
    discovery: {
      pagesVisited,
      newListingsPerPage,
      rawListingCandidates,
      duplicateListingCandidates,
      uniqueListings: listingUrls.length,
      reportedResultCount: exhausted ? listingUrls.length : null,
      exhausted,
      capped: !exhausted && pagesVisited >= maxPages,
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
