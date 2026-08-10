import { NextResponse } from 'next/server'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import type { PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DATASETS: PortalDatasetKind[] = ['portal_apartments', 'portal_houses', 'portal_projects']

function classify(message: string) {
  const value = message.toLowerCase()
  if (value.includes('http 403')) return 'SOURCE_FORBIDDEN'
  if (value.includes('http 429')) return 'SOURCE_RATE_LIMITED'
  if (value.includes('timeout') || value.includes('timed out')) return 'SOURCE_TIMEOUT'
  if (value.includes('network') || value.includes('fetch failed')) return 'NETWORK_FAILURE'
  if (value.includes('non-html')) return 'NON_HTML_RESPONSE'
  if (value.includes('missing stable')) return 'MISSING_STABLE_ID'
  return 'UNKNOWN_FAILURE'
}

export async function GET() {
  const results: Array<Record<string, unknown>> = []

  for (const datasetKind of DATASETS) {
    try {
      const collection = await collectPortalVitacura({
        datasetKind,
        commune: 'vitacura-metropolitana',
        operation: 'venta',
        maxPages: 1,
        maxListings: 1,
        waitMs: 300,
      })

      results.push({
        datasetKind,
        status: collection.rows.length > 0 ? 'ok' : 'no_rows',
        discovered: collection.listingUrls.length,
        parsed: collection.rows.length,
        failures: collection.failures.length,
        failureCodes: [...new Set(collection.failures.map((failure) => classify(failure.error)))],
      })
    } catch (error) {
      results.push({
        datasetKind,
        status: 'failed',
        failureCode: classify(error instanceof Error ? error.message : String(error)),
      })
    }
  }

  const ok = results.every((result) => result.status === 'ok')
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 503 })
}
