import { NextResponse } from 'next/server'
import { searchVitacuraHouseSales } from '@/lib/mercadolibre-vitacura-collector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function boundedNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.round(boundedNumber(url.searchParams.get('limit'), 5, 1, 20))
  const offset = Math.round(boundedNumber(url.searchParams.get('offset'), 0, 0, 950))
  const minPriceRaw = url.searchParams.get('min_price')
  const maxPriceRaw = url.searchParams.get('max_price')
  const minPrice = minPriceRaw == null ? undefined : boundedNumber(minPriceRaw, 0, 0, 999_999_999)
  const maxPrice = maxPriceRaw == null ? undefined : boundedNumber(maxPriceRaw, 999_999_999, 0, 999_999_999)

  try {
    const result = await searchVitacuraHouseSales({
      limit,
      offset,
      minPrice,
      maxPrice,
    })

    return NextResponse.json({
      ok: true,
      scope: 'vitacura_houses_for_sale',
      tokenConfigured: true,
      categories: result.categories,
      query: result.query,
      paging: result.paging,
      rawCount: result.rawCount,
      vitacuraCount: result.vitacuraCount,
      excludedOutsideVitacura: result.excludedOutsideVitacura,
      rows: result.rows,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const missingToken = message.includes('MERCADOLIBRE_ACCESS_TOKEN_MISSING')
    return NextResponse.json({
      ok: false,
      scope: 'vitacura_houses_for_sale',
      tokenConfigured: !missingToken,
      error: missingToken ? 'MERCADOLIBRE_ACCESS_TOKEN_MISSING' : message,
    }, {
      status: missingToken ? 503 : 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
