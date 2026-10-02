import { NextResponse } from 'next/server'
import {
  collectPortalListingDetailsViaBrightData,
  discoverPortalVitacuraViaBrightData,
} from '@/lib/brightdata-portal-collector'
import type { PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
// Redeploy marker: Bright Data preview env refreshed.

const VALIDATION_BRANCH = 'feat/brightdata-vitacura-smoke-20261002'
const TOTAL_DETAIL_BUDGET = 10
const DATASETS: PortalDatasetKind[] = ['portal_houses', 'portal_apartments']

export async function GET() {
  if (process.env.VERCEL_GIT_COMMIT_REF !== VALIDATION_BRANCH) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const startedAt = Date.now()
    const perDatasetBudget = Math.max(1, Math.floor(TOTAL_DETAIL_BUDGET / DATASETS.length))
    const results: Array<Record<string, unknown>> = []
    let requestedDetails = 0
    let parsedDetails = 0
    let totalFailures = 0

    for (const datasetKind of DATASETS) {
      const discovery = await discoverPortalVitacuraViaBrightData({
        datasetKind,
        commune: 'vitacura-metropolitana',
        operation: 'venta',
        maxPages: 1,
      })

      const detailUrls = discovery.listingUrls.slice(0, perDatasetBudget)
      const details = await collectPortalListingDetailsViaBrightData({
        datasetKind,
        listingUrls: detailUrls,
      })

      requestedDetails += detailUrls.length
      parsedDetails += details.rows.length
      totalFailures += details.failures.length

      results.push({
        datasetKind,
        discovery: {
          pagesVisited: discovery.discovery.pagesVisited,
          rawCandidates: discovery.discovery.rawListingCandidates,
          duplicates: discovery.discovery.duplicateListingCandidates,
          uniqueListings: discovery.discovery.uniqueListings,
          capped: discovery.discovery.capped,
        },
        details: {
          requested: detailUrls.length,
          parsed: details.rows.length,
          failures: details.failures.length,
          sample: details.rows.map((row) => ({
            source_listing_id: row.source_listing_id,
            property_type: row.property_type,
            title: row.title,
            address: row.address,
            price_uf: row.price_uf,
            useful_area_m2: row.useful_area_m2,
            built_area_m2: row.built_area_m2,
            land_area_m2: row.land_area_m2,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            parking_spaces: row.parking_spaces,
            url: row.url,
          })),
        },
      })
    }

    const ok = requestedDetails === TOTAL_DETAIL_BUDGET
      && parsedDetails > 0
      && totalFailures === 0

    return NextResponse.json({
      ok,
      mode: 'brightdata_bounded_smoke',
      readOnly: true,
      writes: 0,
      target: {
        commune: 'Vitacura',
        operation: 'venta',
        datasets: DATASETS,
      },
      costGuard: {
        discoveryPagesPerDataset: 1,
        detailBudgetTotal: TOTAL_DETAIL_BUDGET,
        maximumProviderRequests: DATASETS.length + TOTAL_DETAIL_BUDGET,
        responseFormat: 'raw',
        screenshots: false,
        unchangedListingRefresh: false,
      },
      requestedDetails,
      parsedDetails,
      totalFailures,
      runtimeMs: Date.now() - startedAt,
      results,
    }, {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[portal-brightdata-smoke] collection failed', error)
    return NextResponse.json({
      ok: false,
      mode: 'brightdata_bounded_smoke',
      error: 'No fue posible completar la prueba acotada de Bright Data.',
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
