import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildPublicValuationEstimate,
  buildPublicVitacuraCoverageOptions,
  type PublicValuationEvidenceRow,
  type PublicValuationInput,
} from '@/lib/public-valuation'

export const runtime = 'nodejs'

const PUBLIC_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'
const PORTAL_HOUSES_SOURCE = 'portal-inmobiliario-vitacura-portal-houses'
const VITACURA_KML_SOURCE = 'kml_vitacura_barrios_2026_08_12'

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

type PublicMarketData = {
  rows: PublicValuationEvidenceRow[]
  canonicalNeighborhoods: string[]
}

async function loadPublicMarketData(): Promise<PublicMarketData> {
  const supabase = createAdminClient()

  const { data: sources, error: sourcesError } = await supabase
    .from('market_sources')
    .select('id,code')
    .in('code', [PORTAL_HOUSES_SOURCE, VITACURA_KML_SOURCE])

  if (sourcesError) throw sourcesError

  const portalSourceId = sources?.find((row) => row.code === PORTAL_HOUSES_SOURCE)?.id
  const kmlSourceId = sources?.find((row) => row.code === VITACURA_KML_SOURCE)?.id
  if (!portalSourceId || !kmlSourceId) throw new Error('Canonical Vitacura market sources are not available.')

  const [neighborhoodsResult, listingsResult] = await Promise.all([
    supabase
      .from('market_neighborhoods')
      .select('id,name')
      .eq('geometry_source_id', kmlSourceId)
      .order('name', { ascending: true }),
    supabase
      .from('market_current_listings')
      .select('id,property_id,price_uf,observed_at,raw_payload')
      .eq('source_id', portalSourceId)
      .eq('operation', 'Venta')
      .eq('status', 'active'),
  ])

  if (neighborhoodsResult.error || listingsResult.error) {
    throw neighborhoodsResult.error ?? listingsResult.error
  }

  const neighborhoods = neighborhoodsResult.data ?? []
  const listings = listingsResult.data ?? []
  const neighborhoodById = new Map(neighborhoods.map((row) => [String(row.id), String(row.name)]))

  const listingIds = listings.map((row) => String(row.id)).filter(Boolean)
  const propertyIds = Array.from(
    new Set(listings.map((row) => String(row.property_id ?? '')).filter(Boolean)),
  )

  const [propertiesResult, reviewsResult] = await Promise.all([
    propertyIds.length
      ? supabase.from('market_properties').select('id,neighborhood_id').in('id', propertyIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase
          .from('market_neighborhood_review_items')
          .select('id,listing_id,suggested_neighborhood_id,decision,created_at')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (propertiesResult.error || reviewsResult.error) {
    throw propertiesResult.error ?? reviewsResult.error
  }

  const neighborhoodByPropertyId = new Map(
    (propertiesResult.data ?? []).map((row) => [String(row.id), String(row.neighborhood_id ?? '')]),
  )
  const latestReviewByListing = new Map<
    string,
    { suggestedNeighborhoodId: string; decision: string }
  >()

  for (const row of reviewsResult.data ?? []) {
    const listingId = String(row.listing_id ?? '')
    if (!listingId || latestReviewByListing.has(listingId)) continue
    latestReviewByListing.set(listingId, {
      suggestedNeighborhoodId: String(row.suggested_neighborhood_id ?? ''),
      decision: String(row.decision ?? ''),
    })
  }

  const rows = listings.flatMap((listing): PublicValuationEvidenceRow[] => {
    const payload = asPayload(listing.raw_payload)
    if (payload.property_type !== 'Casa') return []

    const propertyId = String(listing.property_id ?? '')
    const propertyNeighborhoodId = propertyId ? neighborhoodByPropertyId.get(propertyId) : null
    const review = latestReviewByListing.get(String(listing.id))
    const reviewNeighborhoodId =
      review && ['accepted', 'resolved_by_system'].includes(review.decision)
        ? review.suggestedNeighborhoodId
        : null

    const neighborhood =
      (propertyNeighborhoodId ? neighborhoodById.get(propertyNeighborhoodId) : null) ??
      (reviewNeighborhoodId ? neighborhoodById.get(reviewNeighborhoodId) : null)

    const priceUf = asFiniteNumber(listing.price_uf)
    const builtAreaM2 = asFiniteNumber(payload.built_area_m2)
    if (!neighborhood || priceUf === null || priceUf <= 0 || builtAreaM2 === null || builtAreaM2 <= 0) return []

    return [
      {
        neighborhood,
        propertyType: 'Casa',
        priceUfM2: priceUf / builtAreaM2,
        builtAreaM2,
        bedrooms: asInteger(payload.bedrooms),
        bathrooms: asInteger(payload.bathrooms),
        observedAt: typeof listing.observed_at === 'string' ? listing.observed_at : null,
      },
    ]
  })

  return {
    rows,
    canonicalNeighborhoods: neighborhoods.map((row) => String(row.name)),
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET() {
  try {
    const { rows, canonicalNeighborhoods } = await loadPublicMarketData()
    const coverage = buildPublicVitacuraCoverageOptions(rows, canonicalNeighborhoods)
    return NextResponse.json(
      {
        ok: true,
        scope: 'Vitacura',
        propertyTypes: ['Casa'],
        coverage,
        usableMarketSample: rows.length,
        sectorCoverageCount: coverage.filter((option) => option.coverageLevel === 'sector').length,
        methodology:
          'Oferta activa de casas en Vitacura con barrio KML canónico; UF por m² construido derivado desde precio publicado. Con 5 o más observaciones utilizables se usa el sector; bajo ese piso se publica una referencia general de Vitacura claramente identificada.',
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
    const { rows, canonicalNeighborhoods } = await loadPublicMarketData()
    if (!canonicalNeighborhoods.includes(neighborhood)) return errorResponse('Selecciona un sector válido de Vitacura.', 400)

    const estimate = buildPublicValuationEstimate(rows, input)

    if (!estimate) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INSUFFICIENT_COVERAGE',
          error: 'Aún no tenemos evidencia suficiente en Vitacura para publicar una estimación responsable.',
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
