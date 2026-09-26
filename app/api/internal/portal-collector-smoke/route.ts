import { NextResponse } from 'next/server'
import { discoverPortalVitacuraUniverse } from '@/lib/portal-inmobiliario-collector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  if (process.env.VERCEL_GIT_COMMIT_REF !== 'fix/portal-daily-intelligence-sweep') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const startedAt = Date.now()
    const collection = await discoverPortalVitacuraUniverse({
      datasetKind: 'portal_houses',
      commune: 'vitacura-metropolitana',
      operation: 'venta',
      maxPages: 40,
      waitMs: 150,
    })

    const coverageRatio = collection.discovery.reportedResultCount && collection.discovery.reportedResultCount > 0
      ? collection.listingUrls.length / collection.discovery.reportedResultCount
      : null
    const fullSnapshot = collection.discovery.exhausted
      && !collection.discovery.capped
      && collection.listingUrls.length >= 30
      && coverageRatio != null
      && coverageRatio >= 0.97
      && coverageRatio <= 1.05

    const runtimeMs = Date.now() - startedAt
    console.info(
      '[portal-collector-smoke-summary]',
      JSON.stringify({
        ok: fullSnapshot,
        reported: collection.discovery.reportedResultCount,
        unique: collection.listingUrls.length,
        coverageRatio,
        pagesVisited: collection.discovery.pagesVisited,
        duplicateCandidates: collection.discovery.duplicateListingCandidates,
        exhausted: collection.discovery.exhausted,
        capped: collection.discovery.capped,
        runtimeMs,
      }),
    )

    return NextResponse.json({
      ok: fullSnapshot,
      observedAt: collection.observedAt,
      discovered: collection.listingUrls.length,
      discovery: collection.discovery,
      coverageRatio,
      runtimeMs,
      sample: collection.listingUrls.slice(0, 10),
    }, { status: fullSnapshot ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[portal-collector-smoke] collection failed', error)
    return NextResponse.json({
      ok: false,
      error: 'No fue posible completar la prueba del colector.',
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
