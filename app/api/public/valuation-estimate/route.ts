import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildPublicCoverageOptions,
  buildPublicValuationEstimate,
  type PublicValuationEvidenceRow,
  type PublicValuationInput,
} from '@/lib/public-valuation'

export const runtime = 'nodejs'

const PUBLIC_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asInteger(value: unknown) {
  const parsed = asFiniteNumber(value)
  return parsed !== null && Number.isInteger(parsed) ? parsed : null
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function loadPublicEvidence(): Promise<PublicValuationEvidenceRow[]> {
  const supabase = createAdminClient()

  const [{ data: neighborhoods, error: neighborhoodsError }, { data: resolutions, error: resolutionsError }] =
    await Promise.all([
      supabase.from('market_neighborhoods').select('id,name'),
      supabase
        .from('market_neighborhood_review_items')
        .select('listing_id,suggested_neighborhood_id,updated_at')
        .eq('classification', 'clear')
        .eq('decision', 'resolved_by_system')
        .eq('resolution_origin', 'system')
        .not('suggested_neighborhood_id', 'is', null)
        .order('updated_at', { ascending: false }),
    ])

  if (neighborhoodsError || resolutionsError) {
    throw neighborhoodsError ?? resolutionsError
  }

  const neighborhoodById = new Map((neighborhoods ?? []).map((row) => [String(row.id), String(row.name)]))
  const latestResolutionByListing = new Map<string, string>()

  for (const row of resolutions ?? []) {
    const listingId = String(row.listing_id ?? '')
    const neighborhoodId = String(row.suggested_neighborhood_id ?? '')
    if (!listingId || !neighborhoodId || latestResolutionByListing.has(listingId)) continue
    latestResolutionByListing.set(listingId, neighborhoodId)
  }

  const listingIds = Array.from(latestResolutionByListing.keys())
  if (listingIds.length === 0) return []

  const { data: listings, error: listingsError } = await supabase
    .from('market_current_listings')
    .select('id,price_uf_m2,observed_at,raw_payload')
    .eq('operation', 'Venta')
    .eq('status', 'active')
    .in('id', listingIds)

  if (listingsError) throw listingsError

  return (listings ?? []).flatMap((listing): PublicValuationEvidenceRow[] => {
    const payload = asPayload(listing.raw_payload)
    if (payload.property_type !== 'Casa') return []

    const neighborhoodId = latestResolutionByListing.get(String(listing.id))
    const neighborhood = neighborhoodId ? neighborhoodById.get(neighborhoodId) : null
    const priceUfM2 = asFiniteNumber(listing.price_uf_m2)
    const builtAreaM2 = asFiniteNumber(payload.built_area_m2) ?? asFiniteNumber(payload.useful_area_m2)
    if (!neighborhood || priceUfM2 === null || priceUfM2 <= 0 || builtAreaM2 === null || builtAreaM2 <= 0) return []

    return [
      {
        neighborhood,
        propertyType: 'Casa',
        priceUfM2,
        builtAreaM2,
        bedrooms: asInteger(payload.bedrooms),
        bathrooms: asInteger(payload.bathrooms),
        observedAt: typeof listing.observed_at === 'string' ? listing.observed_at : null,
      },
    ]
  })
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET() {
  try {
    const rows = await loadPublicEvidence()
    return NextResponse.json(
      {
        ok: true,
        scope: 'Vitacura',
        propertyTypes: ['Casa'],
        coverage: buildPublicCoverageOptions(rows),
        methodology: 'Oferta activa territorialmente resuelta; mínimo 5 observaciones utilizables por sector.',
      },
      { headers: { 'Cache-Control': PUBLIC_CACHE } },
    )
  } catch (error) {
    console.error('[public-valuation] coverage error', error)
    return errorResponse('No pudimos cargar la cobertura de mercado en este momento.', 503)
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse('Solicitud inválida.', 400)
  }

  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : ''
  const propertyType = body.propertyType
  const builtAreaM2 = asFiniteNumber(body.builtAreaM2)
  const bedrooms = body.bedrooms === null || body.bedrooms === '' ? null : asInteger(body.bedrooms)
  const bathrooms = body.bathrooms === null || body.bathrooms === '' ? null : asInteger(body.bathrooms)

  if (!neighborhood || neighborhood.length > 100) return errorResponse('Selecciona un sector válido.', 400)
  if (propertyType !== 'Casa') return errorResponse('La cobertura pública actual está disponible para casas.', 400)
  if (builtAreaM2 === null || builtAreaM2 < 30 || builtAreaM2 > 1500) {
    return errorResponse('La superficie construida debe estar entre 30 y 1.500 m².', 400)
  }
  if (bedrooms !== null && (bedrooms < 1 || bedrooms > 12)) return errorResponse('Número de dormitorios inválido.', 400)
  if (bathrooms !== null && (bathrooms < 1 || bathrooms > 12)) return errorResponse('Número de baños inválido.', 400)

  const input: PublicValuationInput = {
    neighborhood,
    propertyType: 'Casa',
    builtAreaM2,
    bedrooms,
    bathrooms,
  }

  try {
    const rows = await loadPublicEvidence()
    const estimate = buildPublicValuationEstimate(rows, input)

    if (!estimate) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INSUFFICIENT_COVERAGE',
          error: 'Aún no tenemos evidencia suficiente en este sector para publicar una estimación responsable.',
        },
        { status: 422, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        estimate,
        scope: 'Vitacura',
        basis: 'publicaciones activas de oferta',
        disclaimer:
          'Estimación automática referencial. No constituye una tasación ni reemplaza la valorización profesional de Property Partners.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[public-valuation] estimate error', error)
    return errorResponse('No pudimos calcular la estimación en este momento.', 503)
  }
}
