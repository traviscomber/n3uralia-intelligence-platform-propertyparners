import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type SuggestPayload = {
  propertyType: 'Casa' | 'Departamento'
  neighborhood: string
  usefulAreaM2?: number
  builtAreaM2?: number
  landAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  latitude?: number
  longitude?: number
}

type ListingRow = {
  id: string
  source_listing_id: string
  url: string | null
  title: string | null
  normalized_address: string | null
  price_uf: number | string | null
  observed_at: string | null
  market_properties: {
    property_type: string | null
    useful_area_m2: number | string | null
    built_area_m2: number | string | null
    land_area_m2: number | string | null
    bedrooms: number | null
    bathrooms: number | null
    parking_spaces: number | null
    latitude: number | string | null
    longitude: number | string | null
    market_neighborhoods: { name: string | null } | null
  } | null
}

const num = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => value * Math.PI / 180
  const earth = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function relativeSimilarity(subject: number, candidate: number) {
  if (subject <= 0 || candidate <= 0) return 0.5
  const delta = Math.abs(subject - candidate) / subject
  return Math.max(0, 1 - Math.min(delta, 1))
}

function scoreCandidate(payload: SuggestPayload, row: ListingRow) {
  const property = row.market_properties
  if (!property) return 0
  const subjectArea = payload.propertyType === 'Departamento'
    ? num(payload.usefulAreaM2)
    : num(payload.builtAreaM2 || payload.usefulAreaM2)
  const candidateArea = payload.propertyType === 'Departamento'
    ? num(property.useful_area_m2)
    : num(property.built_area_m2 || property.useful_area_m2)

  let score = relativeSimilarity(subjectArea, candidateArea) * 0.6
  score += payload.bedrooms && property.bedrooms ? relativeSimilarity(payload.bedrooms, property.bedrooms) * 0.15 : 0.075
  score += payload.bathrooms && property.bathrooms ? relativeSimilarity(payload.bathrooms, property.bathrooms) * 0.15 : 0.075

  const lat1 = num(payload.latitude)
  const lon1 = num(payload.longitude)
  const lat2 = num(property.latitude)
  const lon2 = num(property.longitude)
  if (lat1 && lon1 && lat2 && lon2) {
    const distance = haversineMeters(lat1, lon1, lat2, lon2)
    score += Math.max(0, 1 - Math.min(distance / 3000, 1)) * 0.1
  } else score += 0.05
  return Math.min(1, score)
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'])
    const payload = await request.json() as SuggestPayload
    if (!payload || !['Casa', 'Departamento'].includes(payload.propertyType) || !payload.neighborhood?.trim()) {
      return NextResponse.json({ error: 'Tipo de propiedad y barrio son obligatorios.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: neighborhood, error: neighborhoodError } = await supabase
      .from('market_neighborhoods')
      .select('id,name')
      .ilike('name', payload.neighborhood.trim())
      .limit(1)
      .maybeSingle()

    if (neighborhoodError) return NextResponse.json({ error: 'No fue posible resolver el barrio.' }, { status: 422 })
    if (!neighborhood) return NextResponse.json({ error: 'El barrio no existe en la capa territorial canónica.' }, { status: 404 })

    const { data: listings, error: listingError } = await supabase
      .from('market_current_listings')
      .select('id,source_listing_id,url,title,normalized_address,price_uf,observed_at,market_properties!inner(property_type,useful_area_m2,built_area_m2,land_area_m2,bedrooms,bathrooms,parking_spaces,latitude,longitude,market_neighborhoods(name))')
      .eq('status', 'active')
      .eq('market_properties.property_type', payload.propertyType)
      .eq('market_properties.neighborhood_id', neighborhood.id)
      .gt('price_uf', 0)
      .limit(80)

    if (listingError) return NextResponse.json({ error: 'No fue posible consultar comparables de mercado.' }, { status: 422 })

    const unique = new Map<string, ListingRow>()
    for (const item of (listings ?? []) as ListingRow[]) {
      const key = item.source_listing_id || item.url || item.id
      if (!unique.has(key)) unique.set(key, item)
    }

    const suggestions = [...unique.values()]
      .map((item) => {
        const property = item.market_properties
        if (!property) return null
        const useful = num(property.useful_area_m2)
        const built = num(property.built_area_m2)
        const land = num(property.land_area_m2)
        const price = num(item.price_uf)
        if (price <= 0) return null
        const canonicalArea = payload.propertyType === 'Departamento' ? useful : (built > 0 ? built + land / 4 : useful)
        if (canonicalArea <= 0) return null

        const latitude = num(property.latitude) || undefined
        const longitude = num(property.longitude) || undefined
        const distanceMeters = payload.latitude && payload.longitude && latitude && longitude
          ? Math.round(haversineMeters(payload.latitude, payload.longitude, latitude, longitude))
          : undefined
        const incompleteHouseArea = payload.propertyType === 'Casa' && built <= 0

        return {
          id: `auto-${item.id}`,
          sourceType: 'Portal' as const,
          sourceReference: item.url || item.source_listing_id,
          address: item.normalized_address || item.title || 'Comparable Portal',
          neighborhood: property.market_neighborhoods?.name || neighborhood.name,
          propertyType: payload.propertyType,
          totalAreaM2: payload.propertyType === 'Departamento' ? useful || undefined : undefined,
          usefulAreaM2: useful || undefined,
          builtAreaM2: built || undefined,
          landAreaM2: land || undefined,
          bedrooms: property.bedrooms ?? undefined,
          bathrooms: property.bathrooms ?? undefined,
          parkingSpaces: property.parking_spaces ?? undefined,
          priceUf: price,
          priceUfM2: Number((price / canonicalArea).toFixed(2)),
          similarityScore: Number(scoreCandidate(payload, item).toFixed(4)),
          selected: false,
          adjustmentPct: 0,
          adjustmentNotes: incompleteHouseArea
            ? 'Superficie construida/terreno incompleta en fuente live; revisar antes de seleccionar.'
            : payload.propertyType === 'Departamento'
              ? 'Fuente live sin terraza separada: superficie total igualada a útil para no inventar metros adicionales.'
              : undefined,
          distanceMeters,
          observedAt: item.observed_at,
          quality: incompleteHouseArea ? 'review' : 'usable',
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 12)

    const { data: cbrs } = await supabase
      .from('market_cbrs_reference_metrics')
      .select('transactions,priced_transactions,median_price_uf,median_area_m2,median_uf_m2,observed_at')
      .eq('scope', 'neighborhood')
      .eq('property_type', payload.propertyType)
      .eq('neighborhood_id', neighborhood.id)
      .is('year', null)
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      neighborhood: neighborhood.name,
      suggestions,
      cbrsBenchmark: cbrs ?? null,
      methodologyVersion: 'valuation-pp-canonical-v2',
      notes: [
        'Las sugerencias Portal son propuestas revisables y nunca se seleccionan automáticamente.',
        'Cuando faltan metros de terraza/terreno, el sistema lo declara y no inventa superficies.',
        'CBRS se presenta como benchmark territorial hasta completar la materialización fila-a-fila de ventas canónicas.',
      ],
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
