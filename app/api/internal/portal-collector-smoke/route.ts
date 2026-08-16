import { NextResponse } from 'next/server'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'
import type { PortalDatasetKind } from '@/lib/market-source-import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supportedDatasets = new Set<PortalDatasetKind>([
  'portal_apartments',
  'portal_houses',
  'portal_projects',
])

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const requestedDataset = new URL(request.url).searchParams.get('dataset') ?? 'portal_apartments'
  if (!supportedDatasets.has(requestedDataset as PortalDatasetKind)) {
    return NextResponse.json({ ok: false, error: 'Unsupported dataset.' }, { status: 400 })
  }
  const datasetKind = requestedDataset as PortalDatasetKind

  try {
    const collection = await collectPortalVitacura({
      datasetKind,
      commune: 'vitacura-metropolitana',
      operation: 'venta',
      maxPages: 1,
      maxListings: 3,
      waitMs: 300,
    })

    const usableForValuation = collection.rows.filter((row) =>
      Boolean(row.source_listing_id)
      && Boolean(row.url)
      && Boolean(row.address)
      && Number(row.price_uf) >= 100
      && (Number(row.useful_area_m2) > 5 || Number(row.built_area_m2) > 5 || Number(row.land_area_m2) > 5),
    )
    const ok = collection.listingUrls.length > 0 && collection.rows.length > 0 && usableForValuation.length > 0

    return NextResponse.json({
      ok,
      datasetKind,
      searchUrls: collection.searchUrls,
      discovered: collection.listingUrls.length,
      parsed: collection.rows.length,
      usableForValuation: usableForValuation.length,
      failures: collection.failures,
      sample: collection.rows.map((row) => ({
        source_listing_id: row.source_listing_id,
        url: row.url,
        title: row.title,
        address: row.address,
        property_type: row.property_type,
        price_uf: row.price_uf,
        useful_area_m2: row.useful_area_m2,
        built_area_m2: row.built_area_m2,
        land_area_m2: row.land_area_m2,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        parking_spaces: row.parking_spaces,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
    }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      datasetKind,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
