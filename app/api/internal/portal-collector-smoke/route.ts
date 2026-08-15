import { NextResponse } from 'next/server'
import { collectPortalVitacura } from '@/lib/portal-inmobiliario-collector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const collection = await collectPortalVitacura({
      datasetKind: 'portal_apartments',
      commune: 'vitacura-metropolitana',
      operation: 'venta',
      maxPages: 1,
      maxListings: 2,
      waitMs: 300,
    })

    return NextResponse.json({
      ok: collection.listingUrls.length > 0 && collection.rows.length > 0,
      searchUrls: collection.searchUrls,
      discovered: collection.listingUrls.length,
      parsed: collection.rows.length,
      failures: collection.failures,
      sample: collection.rows.map((row) => ({
        source_listing_id: row.source_listing_id,
        url: row.url,
        property_type: row.property_type,
        price_uf: row.price_uf,
        useful_area_m2: row.useful_area_m2,
        built_area_m2: row.built_area_m2,
        land_area_m2: row.land_area_m2,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
