import {
  collectPortalListingDetails,
  discoverPortalVitacuraUniverse,
} from '../lib/portal-inmobiliario-collector'
import { applyPortalUfConversion, normalizePortalListingRows } from '../lib/market-source-import'
import { fetchUfClpForDate } from '../lib/chilean-uf'

const MIN_COMPLETE_INVENTORY = 1_000
const MAX_DISCOVERY_PAGES = 40

async function githubOidcToken(audience: string) {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!requestUrl || !requestToken) throw new Error('GITHUB_OIDC_UNAVAILABLE')

  const separator = requestUrl.includes('?') ? '&' : '?'
  const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(audience)}`, {
    headers: { Authorization: `Bearer ${requestToken}` },
  })
  if (!response.ok) throw new Error(`GITHUB_OIDC_HTTP_${response.status}`)
  const json = await response.json() as { value?: string }
  if (!json.value) throw new Error('GITHUB_OIDC_EMPTY')
  return json.value
}

function validateDiscovery(discovery: {
  listingUrls: string[]
  discovery: {
    exhausted: boolean
    capped: boolean
    newListingsPerPage: number[]
  }
}) {
  const sequence = discovery.discovery.newListingsPerPage
  const firstZero = sequence.findIndex((count) => count === 0)
  const sequencePass = firstZero < 0 || sequence.slice(firstZero + 1).every((count) => count === 0)

  if (discovery.listingUrls.length < MIN_COMPLETE_INVENTORY) {
    throw new Error(`PORTAL_EXTERNAL_DISCOVERY_TOO_SMALL_${discovery.listingUrls.length}`)
  }
  if (!discovery.discovery.exhausted || discovery.discovery.capped) {
    throw new Error('PORTAL_EXTERNAL_DISCOVERY_INCOMPLETE')
  }
  if (!sequencePass) {
    throw new Error('PORTAL_EXTERNAL_DISCOVERY_INTERNAL_GAP')
  }
}

async function main() {
  const started = Date.now()

  // Phase 1: full inventory discovery. This is the canonical presence/removal gate.
  const inventory = await discoverPortalVitacuraUniverse({
    datasetKind: 'portal_houses',
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: MAX_DISCOVERY_PAGES,
    waitMs: 900,
  })
  validateDiscovery(inventory)

  console.log(JSON.stringify({
    stage: 'discovered',
    observedAt: inventory.observedAt,
    pages: inventory.discovery.pagesVisited,
    discovered: inventory.listingUrls.length,
    reported: inventory.discovery.reportedResultCount,
    exhausted: inventory.discovery.exhausted,
    capped: inventory.discovery.capped,
    runtimeMs: Date.now() - started,
  }))

  // Phase 2: detail extraction using the same N3uralia Chrome runtime.
  // No paid per-page provider is involved.
  const details = await collectPortalListingDetails({
    datasetKind: 'portal_houses',
    listingUrls: inventory.listingUrls,
    waitMs: 550,
  })

  const ufClp = await fetchUfClpForDate(inventory.observedAt)
  const normalized = applyPortalUfConversion(
    normalizePortalListingRows(details.rows, 'portal_houses'),
    ufClp,
  )
  const validRows = normalized.filter((row) => row.source_listing_id && row.url)
  const coverage = inventory.discovery.reportedResultCount && inventory.discovery.reportedResultCount > 0
    ? inventory.listingUrls.length / inventory.discovery.reportedResultCount
    : null

  console.log(JSON.stringify({
    stage: 'collected',
    observedAt: inventory.observedAt,
    pages: inventory.discovery.pagesVisited,
    discovered: inventory.listingUrls.length,
    reported: inventory.discovery.reportedResultCount,
    valid: validRows.length,
    failures: details.failures.length,
    coverage,
    runtimeMs: Date.now() - started,
  }))

  const token = await githubOidcToken('ppartnersgroup.app')
  const response = await fetch('https://ppartnersgroup.app/api/internal/portal-github-ingest', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      observedAt: inventory.observedAt,
      rows: validRows,
      discovery: inventory.discovery,
      failedListingDetails: details.failures.length,
      acquisitionRuntime: 'self_hosted_chrome',
    }),
  })

  const body = await response.text()
  console.log(body)
  if (!response.ok) throw new Error(`PORTAL_INGEST_HTTP_${response.status}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
