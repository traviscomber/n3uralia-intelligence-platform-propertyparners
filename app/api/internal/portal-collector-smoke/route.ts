import { NextResponse } from 'next/server'
import { discoverPortalVitacuraUniverse } from '@/lib/portal-inmobiliario-collector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  try {
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

    return NextResponse.json({
      ok: fullSnapshot,
      observedAt: collection.observedAt,
      discovered: collection.listingUrls.length,
      discovery: collection.discovery,
      coverageRatio,
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
