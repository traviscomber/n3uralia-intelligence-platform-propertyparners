import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type SuggestPayload = {
  propertyType: 'Casa' | 'Departamento'
  neighborhood: string
  address?: string
  rol?: string
  eventKey?: string
  usefulAreaM2?: number
  builtAreaM2?: number
  landAreaM2?: number
  bedrooms?: number
  bathrooms?: number
  constructionYear?: number
  latitude?: number
  longitude?: number
}

type PortalRow = {
  id: string
  source_listing_id: string
  url: string | null
  title: string | null
  normalized_address: string | null
  price_uf: number | string | null
  price_uf_m2: number | string | null
  observed_at: string | null
  raw_payload: Record<string, unknown> | null
  property_type: string | null
  useful_area_m2: number | string | null
  built_area_m2: number | string | null
  land_area_m2: number | string | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  latitude: number | string | null
  longitude: number | string | null
  pp_kml_barrio: string
}

type CbrsQuality = {
  priceOutlier?: boolean
  sameRolPriceConflict?: boolean
  geographyConflict?: boolean
  neighborhoodTypeMedianUfM2?: number | null
  ufM2RatioToMedian?: number | null
}

type CbrsRow = {
  id: string
  event_key: string
  transaction_date: string
  address: string | null
  rol: string | null
  price_uf: number | string | null
  built_area_m2: number | string | null
  land_area_m2: number | string | null
  construction_year: number | null
  bedrooms_bathrooms: string | null
  latitude: number | string | null
  longitude: number | string | null
  neighborhood: string | null
  pp_kml_barrio: string
  quality: CbrsQuality | null
}

type PortalBenchmark = {
  scope: string
  listing_count: number
  geocoded_count: number
  priced_count: number
  median_price_uf: number | string | null
  median_uf_m2: number | string | null
  median_area_m2: number | string | null
  top_seller: string | null
  observed_at: string | null
  metadata: Record<string, unknown> | null
}

const num = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function addressBase(value: unknown) {
  return normalizeText(String(value ?? '').replace(/\s+(casa|cs|dp|depto)\s*[a-z0-9-]+\s*$/i, ''))
}

function streetBase(value: unknown) {
  return normalizeText(String(value ?? '').replace(/\s+[0-9].*$/, ''))
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
  return Math.max(0, 1 - Math.min(Math.abs(subject - candidate) / subject, 1))
}

function parseProgram(value: string | null) {
  const match = String(value ?? '').match(/^(\d+)D\/(\d+)B$/i)
  if (!match) return null
  return { bedrooms: Number(match[1]), bathrooms: Number(match[2]) }
}

function houseYearScore(subjectYear: number, candidateYear: number) {
  if (!subjectYear || !candidateYear) return 0.4
  const delta = Math.abs(subjectYear - candidateYear)
  if (delta <= 5) return 1
  if (delta <= 10) return 0.85
  if (delta <= 20) return 0.6
  if (delta <= 30) return 0.35
  return 0.15
}

function recencyScore(date: string) {
  const timestamp = new Date(date).getTime()
  if (!Number.isFinite(timestamp)) return 0.1
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86400000)
  if (ageDays <= 365) return 1
  if (ageDays <= 365 * 2) return 0.8
  if (ageDays <= 365 * 3) return 0.6
  if (ageDays <= 365 * 5) return 0.3
  return 0
}

function withinFiveYears(date: string) {
  const timestamp = new Date(date).getTime()
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 365.25 * 5 * 86400000
}

function trustedPortalListing(item: PortalRow, propertyType: SuggestPayload['propertyType']) {
  const source = String(item.raw_payload?.source ?? '').toLowerCase()
  const allowed = propertyType === 'Departamento'
    ? new Set(['portal_inmobiliario', 'portal_inmobiliario_departments'])
    : new Set(['portal_inmobiliario', 'portal_inmobiliario_houses'])
  if (!allowed.has(source)) return false
  return normalizeText(`${item.normalized_address ?? ''} ${item.title ?? ''}`).includes('vitacura')
}

function isSubjectCbrs(payload: SuggestPayload, row: CbrsRow) {
  if (payload.eventKey && row.event_key === payload.eventKey) return true
  if (payload.rol && row.rol && normalizeText(payload.rol) === normalizeText(row.rol)) return true
  if (payload.address && row.address && normalizeText(payload.address) === normalizeText(row.address)) return true
  const coords = [num(payload.latitude), num(payload.longitude), num(row.latitude), num(row.longitude)]
  if (coords.some((value) => !value)) return false
  const subjectArea = payload.propertyType === 'Casa' ? num(payload.builtAreaM2) : num(payload.usefulAreaM2)
  const candidateArea = num(row.built_area_m2)
  return subjectArea > 0 && candidateArea > 0 && Math.abs(subjectArea - candidateArea) <= 0.5 && haversineMeters(coords[0], coords[1], coords[2], coords[3]) <= 2
}

function scorePortal(payload: SuggestPayload, row: PortalRow) {
  const areaScore = relativeSimilarity(
    payload.propertyType === 'Casa' ? num(payload.builtAreaM2) : num(payload.usefulAreaM2),
    payload.propertyType === 'Casa' ? num(row.built_area_m2) : num(row.useful_area_m2 || row.built_area_m2),
  )
  const landScore = payload.propertyType === 'Casa' ? relativeSimilarity(num(payload.landAreaM2), num(row.land_area_m2)) : 1
  let score = payload.propertyType === 'Casa' ? areaScore * 0.4 + landScore * 0.25 : areaScore * 0.65
  score += payload.bedrooms && row.bedrooms ? relativeSimilarity(payload.bedrooms, row.bedrooms) * 0.1 : 0.05
  score += payload.bathrooms && row.bathrooms ? relativeSimilarity(payload.bathrooms, row.bathrooms) * 0.1 : 0.05
  const coords = [num(payload.latitude), num(payload.longitude), num(row.latitude), num(row.longitude)]
  score += coords.every(Boolean) ? Math.max(0, 1 - Math.min(haversineMeters(coords[0], coords[1], coords[2], coords[3]) / 3000, 1)) * 0.15 : 0.075
  return Math.min(1, score)
}

function scoreCbrs(payload: SuggestPayload, row: CbrsRow) {
  const areaScore = relativeSimilarity(
    payload.propertyType === 'Casa' ? num(payload.builtAreaM2) : num(payload.usefulAreaM2),
    num(row.built_area_m2),
  )
  const landScore = payload.propertyType === 'Casa' ? relativeSimilarity(num(payload.landAreaM2), num(row.land_area_m2)) : 1
  const coords = [num(payload.latitude), num(payload.longitude), num(row.latitude), num(row.longitude)]

  if (payload.propertyType !== 'Casa') {
    let score = areaScore * 0.65
    score += coords.every(Boolean) ? Math.max(0, 1 - Math.min(haversineMeters(coords[0], coords[1], coords[2], coords[3]) / 3000, 1)) * 0.15 : 0.075
    score += recencyScore(row.transaction_date) * 0.2
    return Math.min(1, score)
  }

  const distance = coords.every(Boolean) ? haversineMeters(coords[0], coords[1], coords[2], coords[3]) : 3000
  const subjectAddress = payload.address ?? ''
  const candidateAddress = row.address ?? ''
  const microScore = addressBase(subjectAddress) && addressBase(subjectAddress) === addressBase(candidateAddress)
    ? 1
    : streetBase(subjectAddress) && streetBase(subjectAddress) === streetBase(candidateAddress)
      ? 0.8
      : distance <= 250 ? 0.65 : distance <= 500 ? 0.5 : distance <= 1000 ? 0.3 : 0.1
  const program = parseProgram(row.bedrooms_bathrooms)
  const bedroomScore = payload.bedrooms && program ? relativeSimilarity(payload.bedrooms, program.bedrooms) : 0.5
  const bathroomScore = payload.bathrooms && program ? relativeSimilarity(payload.bathrooms, program.bathrooms) : 0.5
  const programScore = (bedroomScore + bathroomScore) / 2

  return Math.min(1,
    microScore * 0.25 +
    houseYearScore(num(payload.constructionYear), num(row.construction_year)) * 0.2 +
    areaScore * 0.2 +
    landScore * 0.15 +
    programScore * 0.1 +
    recencyScore(row.transaction_date) * 0.1,
  )
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability(['valuations.global.read', 'valuations.self.create', 'valuations.office.review', 'valuations.global.approve'])
    const payload = await request.json() as SuggestPayload
    if (!payload || !['Casa', 'Departamento'].includes(payload.propertyType) || !payload.neighborhood?.trim()) {
      return NextResponse.json({ error: 'Tipo de propiedad y barrio son obligatorios.' }, { status: 400 })
    }

    const admin = createAdminClient()
    let canonicalBarrio = payload.neighborhood.trim()
    if (num(payload.latitude) && num(payload.longitude)) {
      const { data: resolved, error } = await admin.rpc('valuation_pp_kml_barrio_at', { p_lat: payload.latitude, p_lon: payload.longitude })
      if (error) return NextResponse.json({ error: 'No fue posible resolver el barrio KML Property Partners.' }, { status: 422 })
      if (!resolved) return NextResponse.json({ error: 'La propiedad no cae dentro de un barrio del KML canónico de Vitacura.' }, { status: 422 })
      canonicalBarrio = String(resolved)
    } else {
      const { data: kmlBarrio } = await admin.from('vitacura_market_neighborhoods').select('barrio_nombre').ilike('barrio_nombre', canonicalBarrio).limit(1).maybeSingle()
      if (!kmlBarrio) return NextResponse.json({ error: 'El barrio no existe en el KML canónico Property Partners.' }, { status: 404 })
      canonicalBarrio = kmlBarrio.barrio_nombre
    }

    if (payload.propertyType === 'Casa' && !payload.constructionYear) {
      let subjectQuery = admin.from('market_cbrs_reference_transactions').select('construction_year').eq('property_type', 'Casa')
      if (payload.eventKey) subjectQuery = subjectQuery.eq('event_key', payload.eventKey)
      else if (payload.rol) subjectQuery = subjectQuery.eq('rol', payload.rol)
      else if (payload.address) subjectQuery = subjectQuery.ilike('address', payload.address)
      const { data: subjectSource } = await subjectQuery.order('transaction_date', { ascending: false }).limit(1).maybeSingle()
      if (subjectSource?.construction_year) payload.constructionYear = Number(subjectSource.construction_year)
    }

    const { data: neighborhood } = await admin.from('market_neighborhoods').select('id,name').ilike('name', canonicalBarrio).limit(1).maybeSingle()
    const [{ data: portalRows, error: portalError }, { data: cbrsRows, error: cbrsError }] = await Promise.all([
      admin.rpc('valuation_portal_pp_kml_candidates', { p_barrio: canonicalBarrio, p_property_type: payload.propertyType, p_limit: 500 }),
      admin.rpc('valuation_cbrs_pp_kml_candidates', { p_barrio: canonicalBarrio, p_property_type: payload.propertyType, p_limit: 500 }),
    ])
    if (portalError) console.error('VALUATION_PORTAL_KML_SUGGESTIONS_FAILED', { code: portalError.code ?? 'UNKNOWN' })
    if (cbrsError) console.error('VALUATION_CBRS_KML_SUGGESTIONS_FAILED', { code: cbrsError.code ?? 'UNKNOWN' })

    const unique = new Map<string, PortalRow>()
    for (const item of (portalRows ?? []) as PortalRow[]) {
      if (!trustedPortalListing(item, payload.propertyType)) continue
      const key = item.source_listing_id || item.url || item.id
      if (!unique.has(key)) unique.set(key, item)
    }

    const portalSuggestions = [...unique.values()].map((item) => {
      const useful = num(item.useful_area_m2)
      const built = num(item.built_area_m2)
      const land = num(item.land_area_m2)
      const price = num(item.price_uf)
      if (price <= 0) return null
      const latitude = num(item.latitude) || undefined
      const longitude = num(item.longitude) || undefined
      const distanceMeters = payload.latitude && payload.longitude && latitude && longitude ? Math.round(haversineMeters(payload.latitude, payload.longitude, latitude, longitude)) : undefined
      const sourceReportedUfM2 = num(item.price_uf_m2) || (useful > 0 ? Number((price / useful).toFixed(2)) : 0)
      return {
        id: `auto-${item.id}`,
        sourceType: 'Portal' as const,
        sourceReference: item.url || item.source_listing_id,
        address: item.normalized_address || item.title || 'Comparable Portal',
        neighborhood: canonicalBarrio,
        propertyType: payload.propertyType,
        usefulAreaM2: useful || undefined,
        builtAreaM2: built || undefined,
        landAreaM2: land || undefined,
        bedrooms: item.bedrooms ?? undefined,
        bathrooms: item.bathrooms ?? undefined,
        parkingSpaces: item.parking_spaces ?? undefined,
        priceUf: price,
        priceUfM2: 0,
        sourceReportedUfM2: sourceReportedUfM2 || undefined,
        similarityScore: Number(scorePortal(payload, item).toFixed(4)),
        selected: false,
        adjustmentPct: 0,
        adjustmentNotes: 'Oferta Portal real dentro del mismo barrio KML PP. Se mantiene como referencia hasta certificar todas las superficies canónicas requeridas.',
        distanceMeters,
        observedAt: item.observed_at,
        quality: 'reference_only' as const,
      }
    }).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 8)

    const rawCbrs = (cbrsRows ?? []) as CbrsRow[]
    const excludedEconomic = rawCbrs.filter((row) => Boolean(row.quality?.priceOutlier)).length
    const excludedStale = payload.propertyType === 'Casa' ? rawCbrs.filter((row) => !withinFiveYears(row.transaction_date)).length : 0
    const cbrsSuggestions = rawCbrs
      .filter((row) => !row.quality?.priceOutlier)
      .filter((row) => payload.propertyType !== 'Casa' || withinFiveYears(row.transaction_date))
      .filter((row) => !isSubjectCbrs(payload, row))
      .map((row) => {
        const built = num(row.built_area_m2)
        const land = num(row.land_area_m2)
        const price = num(row.price_uf)
        const weightedArea = payload.propertyType === 'Casa' ? built + land / 4 : built
        if (price <= 0 || weightedArea <= 0) return null
        const latitude = num(row.latitude) || undefined
        const longitude = num(row.longitude) || undefined
        const distanceMeters = payload.latitude && payload.longitude && latitude && longitude ? Math.round(haversineMeters(payload.latitude, payload.longitude, latitude, longitude)) : undefined
        return {
          id: `cbrs-${row.id}`,
          sourceType: 'CBRS' as const,
          sourceReference: `CBRS ${row.event_key}${row.rol ? ` · ROL ${row.rol}` : ''}`,
          address: row.address || 'Venta registrada CBRS',
          neighborhood: canonicalBarrio,
          propertyType: payload.propertyType,
          builtAreaM2: built,
          landAreaM2: land || undefined,
          priceUf: price,
          priceUfM2: Number((price / weightedArea).toFixed(2)),
          similarityScore: Number(scoreCbrs(payload, row).toFixed(4)),
          selected: false,
          adjustmentPct: 0,
          adjustmentNotes: payload.propertyType === 'Departamento'
            ? 'Venta CBRS en el mismo barrio KML PP; superficie registrada por la fuente.'
            : `Venta CBRS del mismo barrio KML PP; microcomparabilidad considera ubicación, año, superficies, programa y recencia${row.construction_year ? ` · año ${row.construction_year}` : ''}.`,
          distanceMeters,
          transactionDate: row.transaction_date,
          quality: 'canonical' as const,
          areaSemantics: payload.propertyType === 'Departamento' ? 'source_registered_area_not_confirmed_as_useful' : 'canonical_house_weighted_area',
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 8)

    let cbrsBenchmark = null
    let portalBenchmark: PortalBenchmark | null = null
    if (neighborhood) {
      const [{ data: cbrs }, { data: portal }] = await Promise.all([
        admin.from('market_cbrs_reference_metrics').select('transactions,priced_transactions,median_price_uf,median_area_m2,median_uf_m2,observed_at').eq('scope', 'neighborhood').eq('property_type', payload.propertyType).eq('neighborhood_id', neighborhood.id).is('year', null).limit(1).maybeSingle(),
        admin.from('market_portal_reference_metrics').select('scope,listing_count,geocoded_count,priced_count,median_price_uf,median_uf_m2,median_area_m2,top_seller,observed_at,metadata').eq('dataset_kind', payload.propertyType === 'Departamento' ? 'portal_apartments' : 'portal_houses').eq('scope', 'neighborhood').eq('neighborhood_id', neighborhood.id).limit(1).maybeSingle(),
      ])
      cbrsBenchmark = cbrs ?? null
      portalBenchmark = (portal as PortalBenchmark | null) ?? null
    }

    return NextResponse.json({
      neighborhood: canonicalBarrio,
      suggestions: [...portalSuggestions, ...cbrsSuggestions],
      suggestionCounts: { portalReferenceOnly: portalSuggestions.length, cbrs: cbrsSuggestions.length, excludedEconomic, excludedStale },
      cbrsBenchmark,
      portalBenchmark,
      methodologyVersion: payload.propertyType === 'Casa' ? 'property-partners-valuation-v2-kml-house-micro-v1' : 'property-partners-valuation-v2-kml-first',
      notes: [
        `Primer filtro: barrio KML Property Partners = ${canonicalBarrio}. Ningún comparable de otro polígono compite en el ranking.`,
        canonicalBarrio !== payload.neighborhood.trim() ? `El KML corrigió el barrio informado (${payload.neighborhood.trim()} → ${canonicalBarrio}).` : 'El barrio informado coincide con el KML canónico.',
        payload.propertyType === 'Casa'
          ? 'Dentro del barrio, el ranking prioriza micro-ubicación, año de construcción, superficie construida, terreno, programa y recencia. Ventas de más de 5 años no compiten en el top principal.'
          : 'Después del filtro territorial se ordena por superficie, distancia y recencia.',
        excludedEconomic ? `${excludedEconomic} ventas CBRS con anomalía económica extrema fueron retiradas del conjunto seleccionable.` : 'No se detectaron anomalías económicas extremas en el conjunto seleccionable.',
        excludedStale ? `${excludedStale} ventas de casas de más de 5 años quedaron fuera del ranking principal.` : '',
        'Portal representa oferta y permanece como referencia; CBRS representa ventas registradas. Property Partners decide.',
      ].filter(Boolean),
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
