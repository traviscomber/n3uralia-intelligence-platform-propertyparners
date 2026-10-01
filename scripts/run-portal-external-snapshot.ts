import { collectPortalVitacura } from '../lib/portal-inmobiliario-collector'
import { applyPortalUfConversion, normalizePortalListingRows } from '../lib/market-source-import'
import { fetchUfClpForDate } from '../lib/chilean-uf'

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

async function main() {
  const started = Date.now()
  const collection = await collectPortalVitacura({
    datasetKind: 'portal_houses',
    commune: 'vitacura-metropolitana',
    operation: 'venta',
    maxPages: 40,
    maxListings: 2200,
    waitMs: 700,
  })

  if (collection.listingUrls.length < 1000) {
    throw new Error(`PORTAL_EXTERNAL_DISCOVERY_TOO_SMALL_${collection.listingUrls.length}`)
  }

  const ufClp = await fetchUfClpForDate(collection.observedAt)
  const normalized = applyPortalUfConversion(
    normalizePortalListingRows(collection.rows, 'portal_houses'),
    ufClp,
  )
  const validRows = normalized.filter((row) => row.source_listing_id && row.url)
  const coverage = collection.discovery.reportedResultCount && collection.discovery.reportedResultCount > 0
    ? collection.listingUrls.length / collection.discovery.reportedResultCount
    : null

  console.log(JSON.stringify({
    stage: 'collected',
    observedAt: collection.observedAt,
    pages: collection.discovery.pagesVisited,
    discovered: collection.listingUrls.length,
    reported: collection.discovery.reportedResultCount,
    valid: validRows.length,
    failures: collection.failures.length,
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
      observedAt: collection.observedAt,
      rows: validRows,
      discovery: collection.discovery,
      failedListingDetails: collection.failures.length,
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
