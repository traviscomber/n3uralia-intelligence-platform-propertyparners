import type { MarketImportInputRow } from '@/lib/market-import'
import type { PortalDatasetKind } from '@/lib/market-source-import'
import {
  parsePortalListing,
  portalListingIdFromUrl,
  type PortalCollectorOptions,
  type PortalDiscoveryResult,
} from '@/lib/portal-inmobiliario-collector'
import {
  decidePortalPageCompletion,
  extractPortalReportedCount,
  portalChallengeDetected,
  portalExplicitNoResults,
} from '@/lib/portal-discovery-evidence'

const PORTAL_ORIGIN = 'https://www.portalinmobiliario.com'
const DEFAULT_COMMUNE = 'vitacura-metropolitana'
const BRIGHTDATA_ENDPOINT = 'https://api.brightdata.com/request'
const DEFAULT_ZONE = 'portal_inmobiliario_unlocker'
const REQUEST_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 2

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
    if (parsed.hostname.toLowerCase() === 'portalinmobiliario.com') {
      parsed.hostname = 'www.portalinmobiliario.com'
    }
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return rawUrl
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

function isListingUrl(rawUrl: string, datasetKind: PortalDatasetKind) {
  try {
    const parsed = new URL(rawUrl, PORTAL_ORIGIN)
    const host = parsed.hostname.toLowerCase()
    if (!['portalinmobiliario.com', 'www.portalinmobiliario.com'].includes(host)) return false
    if (datasetKind === 'portal_projects') {
      return /MLC-?\d+/i.test(parsed.href)
        || /\/p\/MLC\d+/i.test(parsed.pathname)
        || /\/\d+-[^/]+-nva\/?$/i.test(parsed.pathname)
    }
    return /MLC-?\d+/i.test(parsed.href) || /\/p\/MLC\d+/i.test(parsed.pathname)
  } catch {
    return false
  }
}

function extractListingUrls(html: string, datasetKind: PortalDatasetKind) {
  const decoded = decodeEmbeddedMarkup(html)
  const candidates: string[] = []
  const absoluteMlc = decoded.match(/https?:\/\/(?:www\.)?portalinmobiliario\.com\/(?:MLC-?\d+|p\/MLC\d+)[^"'<>\\\s]*/gi) ?? []
  const relativeMlc = decoded.match(/\/(?:MLC-?\d+|p\/MLC\d+)[^"'<>\\\s]*/gi) ?? []
  candidates.push(...absoluteMlc, ...relativeMlc.map((value) => new URL(value, PORTAL_ORIGIN).toString()))

  if (datasetKind === 'portal_projects') {
    const projects = decoded.match(/https?:\/\/(?:www\.)?portalinmobiliario\.com\/[^"'<>\\\s]+-nva\/?/gi) ?? []
    candidates.push(...projects)
  }

  return candidates
    .map(canonicalListingUrl)
    .filter((url) => isListingUrl(url, datasetKind))
}

function brightDataConfig() {
  const apiKey = process.env.BRIGHTDATA_API_KEY
  if (!apiKey) throw new Error('BRIGHTDATA_API_KEY_MISSING')
  return {
    apiKey,
    zone: process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || DEFAULT_ZONE,
  }
}

async function brightDataRaw(url: string, options?: {
  requestTimeoutMs?: number
  maxAttempts?: number
}) {
  const { apiKey, zone } = brightDataConfig()
  const requestTimeoutMs = Math.min(Math.max(options?.requestTimeoutMs ?? REQUEST_TIMEOUT_MS, 5_000), REQUEST_TIMEOUT_MS)
  const maxAttempts = Math.min(Math.max(options?.maxAttempts ?? MAX_ATTEMPTS, 1), MAX_ATTEMPTS)
  let lastStatus: number | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(BRIGHTDATA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone,
        url,
        format: 'raw',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(requestTimeoutMs),
    })

    lastStatus = response.status
    const body = await response.text()

    if (response.ok) {
      if (body.trim()) return body
      if (attempt === maxAttempts) throw new Error('BRIGHTDATA_EMPTY_BODY')
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt))
      continue
    }

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === maxAttempts) {
      throw new Error(`BRIGHTDATA_HTTP_${response.status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 800 * attempt))
  }

  throw new Error(`BRIGHTDATA_HTTP_${lastStatus ?? 'UNKNOWN'}`)
}

export async function discoverPortalVitacuraViaBrightData(
  options: PortalCollectorOptions,
): Promise<PortalDiscoveryResult> {
  const datasetKind = options.datasetKind
  const commune = options.commune ?? DEFAULT_COMMUNE
  const operation = options.operation ?? 'venta'
  const maxPages = Math.min(Math.max(options.maxPages ?? 1, 1), 80)
  const pageSize = datasetKind === 'portal_projects' ? 20 : 48
  const base = buildSearchBase(datasetKind, operation, commune)

  const listingUrls = new Set<string>()
  const searchUrls: string[] = []
  const newListingsPerPage: number[] = []
  let rawListingCandidates = 0
  let duplicateListingCandidates = 0
  let repeatedHtmlReferences = 0
  let repeatedAcrossPages = 0
  const identities = new Set<string>()
  let exhausted = false
  let reportedResultCount: number | null = null

  const discoveryConcurrency = 4

  for (let startPage = 1; startPage <= maxPages; startPage += discoveryConcurrency) {
    const pages = Array.from(
      { length: Math.min(discoveryConcurrency, maxPages - startPage + 1) },
      (_, index) => startPage + index,
    )
    const urls = pages.map((page) => buildSearchUrl(base, page, datasetKind))
    const htmlPages = await Promise.all(urls.map((url) => brightDataRaw(url)))

    let shouldStop = false
    for (let index = 0; index < pages.length; index += 1) {
      const searchUrl = urls[index]
      searchUrls.push(searchUrl)

      const html = htmlPages[index]
      const candidates = extractListingUrls(html, datasetKind)
      if (reportedResultCount === null) reportedResultCount = extractPortalReportedCount(html)
      rawListingCandidates += candidates.length

      // Distinguish repeated HTML references from repeated listings on later pages.
      const pageIdentities = new Set<string>()
      const pageUrls = new Map<string, string>()
      for (const url of candidates) {
        const identity = portalListingIdFromUrl(url, datasetKind) ?? url
        if (pageIdentities.has(identity)) {
          repeatedHtmlReferences += 1
          continue
        }
        pageIdentities.add(identity)
        pageUrls.set(identity, url)
      }
      const before = listingUrls.size
      for (const [identity, url] of pageUrls) {
        if (identities.has(identity)) {
          repeatedAcrossPages += 1
          continue
        }
        identities.add(identity)
        listingUrls.add(url)
      }
      const added = listingUrls.size - before
      duplicateListingCandidates = repeatedHtmlReferences + repeatedAcrossPages
      newListingsPerPage.push(added)

      const decision = decidePortalPageCompletion({
        candidateCount: pageIdentities.size,
        newlyDiscovered: added,
        uniqueTotal: identities.size,
        publishedTotal: reportedResultCount,
        pageSize,
        challenge: portalChallengeDetected(html),
        explicitNoResults: portalExplicitNoResults(html),
      })
      if (decision === 'exhausted') {
        exhausted = true
        shouldStop = true
        break
      }
    }
    if (shouldStop) break
  }

  return {
    searchUrls,
    listingUrls: [...listingUrls],
    observedAt: new Date().toISOString(),
    discovery: {
      pagesVisited: searchUrls.length,
      newListingsPerPage,
      rawListingCandidates,
      duplicateListingCandidates,
      repeatedHtmlReferences,
      repeatedAcrossPages,
      uniqueListingIdentities: identities.size,
      uniqueListings: listingUrls.size,
      reportedResultCount,
      exhausted,
      capped: !exhausted && searchUrls.length >= maxPages,
    },
  }
}

export async function collectPortalListingDetailsViaBrightData(args: {
  datasetKind: PortalDatasetKind
  listingUrls: string[]
  concurrency?: number
  requestTimeoutMs?: number
  maxAttempts?: number
}) {
  const rows: MarketImportInputRow[] = []
  const failures: Array<{ url: string; error: string }> = []

  // Keep concurrency deliberately low: the first objective is reliable,
  // low-bandwidth evidence collection rather than maximum throughput.
  const concurrency = Math.min(Math.max(args.concurrency ?? 4, 1), 8)

  for (let start = 0; start < args.listingUrls.length; start += concurrency) {
    const batch = args.listingUrls.slice(start, start + concurrency)
    const results = await Promise.all(batch.map(async (url) => {
      try {
        const html = await brightDataRaw(url, {
          requestTimeoutMs: args.requestTimeoutMs,
          maxAttempts: args.maxAttempts,
        })
        const row = parsePortalListing(html, url, args.datasetKind)
        if (!row.source_listing_id) {
          row.source_listing_id = portalListingIdFromUrl(url, args.datasetKind) ?? ''
        }
        if (!row.source_listing_id) throw new Error('BRIGHTDATA_MISSING_LISTING_ID')
        return { row, failure: null as { url: string; error: string } | null }
      } catch (error) {
        return {
          row: null,
          failure: {
            url,
            error: error instanceof Error ? error.message : String(error),
          },
        }
      }
    }))

    for (const result of results) {
      if (result.row) rows.push(result.row)
      if (result.failure) failures.push(result.failure)
    }
  }

  return {
    observedAt: new Date().toISOString(),
    rows,
    failures,
  }
}
