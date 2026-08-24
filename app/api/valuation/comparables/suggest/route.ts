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
  robustScope?: string
  cohortCount?: number
  robustMedianUfM2?: number | null
  iqrOutlier?: boolean
  cohortRatioOutlier?: boolean
  rolRatioOutlier?: boolean
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

type HouseCandidate = {
  id: string
  sourceType: 'CBRS'
  sourceReference: string
  address: string
  neighborhood: string
  propertyType: 'Casa' | 'Departamento'
  builtAreaM2: number
  landAreaM2?: number
  priceUf: number
  priceUfM2: number
  similarityScore: number
  rankingScore: number
  strictPhysicalCompatibility: boolean
  selected: boolean
  adjustmentPct: number
  adjustmentNotes: string
  distanceMeters?: number
  transactionDate: string
  quality: 'usable' | 'canonical'
  areaSemantics: string
}

const HOUSE_PHYSICAL_MIN_RATIO = 0.7
const HOUSE_PHYSICAL_MAX_RATIO = 1.43
const LAND_DOMINANT_RATIO = 5
const LAND_DOMINANT_BONUS = 0.3
const TIGHT_GUARD_BARRIOS = new Set(['Tabancura', 'El Aromo'])
const TIGHT_GUARD_MIN = 0.8
const TIGHT_GUARD_MAX = 1.5

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

function streetNumber(value: unknown) {
  const matches = String(value ?? '').match(/\b\d{2,5}\b/g)
  if (!matches?.length) return 0
  return Number(matches[0]) || 0
}

function numberSimilarity(subjectAddress: unknown, candidateAddress: unknown) {
  if (!streetBase(subjectAddress) || streetBase(subjectAddress) !== streetBase(candidateAddress)) return 0
  const subjectNumber = streetNumber(subjectAddress)
  const candidateNumber = streetNumber(candidateAddress)
  if (!subjectNumber || !candidateNumber) return 0
  return Math.max(0, 1 - Math.min(Math.abs(subjectNumber - candidateNumber) / 1000, 1))
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

function physicalRatio(subject: number, candidate: number) {
  if (subject <= 0 || candidate <= 0) return 0
  return candidate / subject
}

function isStrictPhysicalMatch(payload: SuggestPayload, row: CbrsRow) {
  if (payload.propertyType !== 'Casa') return true
  const builtRatio = physicalRatio(num(payload.builtAreaM2), num(row.built_area_m2))
  const landRatio = physicalRatio(num(payload.landAreaM2), num(row.land_area_m2))
  return builtRatio >= HOUSE_PHYSICAL_MIN_RATIO && builtRatio <= HOUSE_PHYSICAL_MAX_RATIO &&
    landRatio >= HOUSE_PHYSICAL_MIN_RATIO && landRatio <= HOUSE_PHYSICAL_MAX_RATIO
}

function passesBarrioEconomicGuard(canonicalBarrio: string, row: CbrsRow) {
  if (!TIGHT_GUARD_BARRIOS.has(canonicalBarrio)) return true
  const ratio = num(row.quality?.ufM2RatioToMedian)
  if (!ratio) return true
  return ratio >= TIGHT_GUARD_MIN && ratio <= TIGHT_GUARD_MAX
}

function weightedMedianRate(items: Array<{ priceUfM2: number; rankingScore: number }>) {
  const usable = items
    .filter((item) => item.priceUfM2 > 0 && item.rankingScore > 0)
    .map((item) => ({ ...item, weight: item.rankingScore ** 2 }))
    .sort((a, b) => a.priceUfM2 - b.priceUfM2)
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0)
  if (!usable.length || totalWeight <= 0) return null
  let cumulative = 0
  for (const item of usable) {
    cumulative += item.weight
    if (cumulative >= totalWeight / 2) return item.priceUfM2
  }
  return usable[usable.length - 1]?.priceUfM2 ?? null
}

function weightedArithmeticRate(items: Array<{ priceUfM2: number; rankingScore: number }>) {
  const usable = items.filter((item) => item.priceUfM2 > 0 && item.rankingScore > 0)
  const totalWeight = usable.reduce((sum, item) => sum + item.rankingScore ** 2, 0)
  if (!usable.length || totalWeight <= 0) return null
  return usable.reduce((sum, item) => sum + item.priceUfM2 * item.rankingScore ** 2, 0) / totalWeight
}

function weightedGeometricRate(items: Array<{ priceUfM2: number; rankingScore: number }>) {
  const usable = items.filter((item) => item.priceUfM2 > 0 && item.rankingScore > 0)
  const totalWeight = usable.reduce((sum, item) => sum + item.rankingScore ** 2, 0)
  if (!usable.length || totalWeight <= 0) return null
  const weightedLog = usable.reduce((sum, item) => sum + Math.log(item.priceUfM2) * item.rankingScore ** 2, 0) / totalWeight
  return Math.exp(weightedLog)
}

function rateSpread(items: Array<{ priceUfM2: number }>) {
  const rates = items.map((item) => item.priceUfM2).filter((rate) => rate > 0).sort((a, b) => a - b)
  if (rates.length < 2) return 1
  const middle = Math.floor(rates.length / 2)
  const median = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2
  if (!median) return 1
  return (rates[rates.length - 1] - rates[0]) / median
}

function isStrongSiblingEvidence(payload: SuggestPayload, row: CbrsRow) {
  if (payload.propertyType !== 'Casa' || !payload.address || !row.address) return false
  const subjectBase = addressBase(payload.address)
  const candidateBase = addressBase(row.address)
  if (!subjectBase || subjectBase !== candidateBase) return false
  return !row.quality?.sameRolPriceConflict && !row.quality?.iqrOutlier && !row.quality?.rolRatioOutlier
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
  const builtScore = relativeSimilarity(
    payload.propertyType === 'Casa' ? num(payload.builtAreaM2) : num(payload.usefulAreaM2),
    num(row.built_area_m2),
  )
  const landScore = payload.propertyType === 'Casa' ? relativeSimilarity(num(payload.landAreaM2), num(row.land_area_m2)) : 1
  const coords = [num(payload.latitude), num(payload.longitude), num(row.latitude), num(row.longitude)]

  if (payload.propertyType !== 'Casa') {
    let score = builtScore * 0.65
    score += coords.every(Boolean) ? Math.max(0, 1 - Math.min(haversineMeters(coords[0], coords[1], coords[2], coords[3]) / 3000, 1)) * 0.15 : 0.075
    score += recencyScore(row.transaction_date) * 0.2
    return score
  }

  const subjectBuilt = num(payload.builtAreaM2)
  const subjectLand = num(payload.landAreaM2)
  const candidateBuilt = num(row.built_area_m2)
  const candidateLand = num(row.land_area_m2)
  const subjectEconomicArea = subjectBuilt + subjectLand / 4
  const candidateEconomicArea = candidateBuilt + candidateLand / 4
  const economicAreaScore = relativeSimilarity(subjectEconomicArea, candidateEconomicArea)
  const subjectRatio = subjectBuilt > 0 ? subjectLand / subjectBuilt : 0
  const candidateRatio = candidateBuilt > 0 ? candidateLand / candidateBuilt : 0
  const ratioScore = relativeSimilarity(subjectRatio, candidateRatio)
  const sameStreet = streetBase(payload.address) && streetBase(payload.address) === streetBase(row.address) ? 1 : 0
  const numberScore = numberSimilarity(payload.address, row.address)
  const program = parseProgram(row.bedrooms_bathrooms)
  const bedroomScore = payload.bedrooms && program ? relativeSimilarity(payload.bedrooms, program.bedrooms) : 0.5
  const bathroomScore = payload.bathrooms && program ? relativeSimilarity(payload.bathrooms, program.bathrooms) : 0.5
  const programScore = (bedroomScore + bathroomScore) / 2
  const landDominantBonus = subjectRatio >= LAND_DOMINANT_RATIO && candidateRatio >= LAND_DOMINANT_RATIO ? LAND_DOMINANT_BONUS : 0

  return (
    builtScore * 0.22 +
    landScore * 0.10 +
    economicAreaScore * 0.22 +
    ratioScore * 0.06 +
    houseYearScore(num(payload.constructionYear), num(row.construction_year)) * 0.10 +
    programScore * 0.05 +
    recencyScore(row.transaction_date) * 0.10 +
    sameStreet * 0.025 +
    numberScore * 0.025 +
    (sameStreet * numberScore) * 0.05 +
    landDominantBonus
  )
}

function chooseHouseSample(candidates: HouseCandidate[]) {
  const strict = candidates.filter((candidate) => candidate.strictPhysicalCompatibility).slice(0, 8)
  if (strict.length >= 6) return { sample: strict, gate: 'strict_6_plus' as const }
  if (strict.length === 4) return { sample: strict, gate: 'strict_4_recovery' as const }
  if (strict.length === 5) {
    const avgScore = strict.reduce((sum, item) => sum + item.rankingScore, 0) / strict.length
    const spread = rateSpread(strict)
    if (avgScore >= 0.75 && spread <= 0.5) return { sample: strict, gate: 'strict_5_coherent_recovery' as const }
  }
  return { sample: [] as HouseCandidate[], gate: 'review_required' as const }
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
    const strongSiblingEvidenceCount = rawCbrs.filter((row) => Boolean(row.quality?.priceOutlier) && isStrongSiblingEvidence(payload, row)).length
    const excludedEconomic = rawCbrs.filter((row) => Boolean(row.quality?.priceOutlier) && !isStrongSiblingEvidence(payload, row)).length
    const excludedStale = payload.propertyType === 'Casa' ? rawCbrs.filter((row) => !withinFiveYears(row.transaction_date)).length : 0
    const excludedBarrioGuard = payload.propertyType === 'Casa'
      ? rawCbrs.filter((row) => !passesBarrioEconomicGuard(canonicalBarrio, row) && !isStrongSiblingEvidence(payload, row)).length
      : 0

    const allCbrsCandidates = rawCbrs
      .filter((row) => !row.quality?.priceOutlier || isStrongSiblingEvidence(payload, row))
      .filter((row) => payload.propertyType !== 'Casa' || withinFiveYears(row.transaction_date))
      .filter((row) => payload.propertyType !== 'Casa' || passesBarrioEconomicGuard(canonicalBarrio, row) || isStrongSiblingEvidence(payload, row))
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
        const strongSibling = isStrongSiblingEvidence(payload, row)
        const rankingScore = scoreCbrs(payload, row)
        const strictPhysicalCompatibility = isStrictPhysicalMatch(payload, row)
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
          similarityScore: Number(Math.min(1, rankingScore).toFixed(4)),
          rankingScore: Number(rankingScore.toFixed(4)),
          strictPhysicalCompatibility,
          selected: false,
          adjustmentPct: 0,
          adjustmentNotes: payload.propertyType === 'Departamento'
            ? 'Venta CBRS en el mismo barrio KML PP; superficie registrada por la fuente.'
            : strongSibling
              ? `Venta CBRS en la misma dirección base del sujeto; se conserva como evidencia micro-local aunque sea extrema para la cohorte amplia, sin conflicto IQR/ROL${row.construction_year ? ` · año ${row.construction_year}` : ''}.`
              : strictPhysicalCompatibility
                ? `Venta CBRS del mismo barrio KML PP y físicamente compatible (construido/terreno dentro de 0,70×–1,43×); ranking considera superficie económica, estructura suelo/construcción, año, programa, recencia y microdirección${row.construction_year ? ` · año ${row.construction_year}` : ''}.`
                : `Venta CBRS del mismo barrio KML PP, pero fuera del rango físico estricto 0,70×–1,43×; queda visible como contexto y no entra al cálculo automático.`,
          distanceMeters,
          transactionDate: row.transaction_date,
          quality: strongSibling ? 'usable' as const : 'canonical' as const,
          areaSemantics: payload.propertyType === 'Departamento' ? 'source_registered_area_not_confirmed_as_useful' : 'canonical_house_weighted_area',
        } satisfies HouseCandidate
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.rankingScore - a.rankingScore)

    const strictPhysicalCount = payload.propertyType === 'Casa'
      ? allCbrsCandidates.filter((candidate) => candidate.strictPhysicalCompatibility).length
      : 0
    const excludedPhysical = payload.propertyType === 'Casa' ? allCbrsCandidates.length - strictPhysicalCount : 0
    const sampleDecision = payload.propertyType === 'Casa' ? chooseHouseSample(allCbrsCandidates as HouseCandidate[]) : { sample: [] as HouseCandidate[], gate: 'review_required' as const }
    const cbrsSuggestions = payload.propertyType === 'Casa' && strictPhysicalCount >= 4
      ? allCbrsCandidates.filter((candidate) => candidate.strictPhysicalCompatibility).slice(0, 8)
      : allCbrsCandidates.slice(0, 8)

    const houseRecommendation = payload.propertyType === 'Casa' && sampleDecision.sample.length
      ? (() => {
          const sample = sampleDecision.sample
          const geometricRate = weightedGeometricRate(sample)
          const arithmeticRate = weightedArithmeticRate(sample)
          const medianRate = weightedMedianRate(sample)
          const weightedArea = num(payload.builtAreaM2) + num(payload.landAreaM2) / 4
          const averageSimilarity = sample.reduce((sum, item) => sum + item.rankingScore, 0) / sample.length
          const spread = rateSpread(sample)
          if (!geometricRate || !arithmeticRate || !medianRate || weightedArea <= 0) return null
          const championRate = geometricRate * 0.5 + arithmeticRate * 0.3 + medianRate * 0.2
          const confidence = sample.length >= 6 && averageSimilarity >= 0.75 && spread <= 0.5
            ? 'high'
            : sample.length >= 4 && spread <= 0.5 ? 'medium' : 'low'
          return {
            weightedRateUfM2: Number(championRate.toFixed(2)),
            builtRateUfM2: Number(championRate.toFixed(2)),
            landRateUfM2: Number((championRate / 4).toFixed(2)),
            estimatedValueUf: Math.round(championRate * weightedArea),
            comparableCount: sample.length,
            strictComparableCount: strictPhysicalCount,
            averageSimilarity: Number(averageSimilarity.toFixed(3)),
            comparableSpread: Number(spread.toFixed(3)),
            confidence,
            evidenceGate: sampleDecision.gate,
            nonBinding: true,
            method: 'champion_v5_geo50_mean30_median20_similarity_squared',
          }
        })()
      : null

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
      suggestionCounts: {
        portalReferenceOnly: portalSuggestions.length,
        cbrs: cbrsSuggestions.length,
        excludedEconomic,
        excludedStale,
        excludedBarrioGuard,
        excludedPhysical,
        strictPhysical: strictPhysicalCount,
        strongSiblingEvidence: strongSiblingEvidenceCount,
      },
      cbrsBenchmark,
      portalBenchmark,
      houseRecommendation,
      methodologyVersion: payload.propertyType === 'Casa' ? 'property-partners-house-champion-v5' : 'property-partners-valuation-v2-kml-first',
      notes: [
        `Primer filtro: barrio KML Property Partners = ${canonicalBarrio}. Ningún comparable de otro polígono compite en el ranking.`,
        canonicalBarrio !== payload.neighborhood.trim() ? `El KML corrigió el barrio informado (${payload.neighborhood.trim()} → ${canonicalBarrio}).` : 'El barrio informado coincide con el KML canónico.',
        payload.propertyType === 'Casa'
          ? 'Champion v5: construido y terreno compatibles entre 0,70×–1,43×; ranking usa construido 22%, terreno 10%, superficie económica 22%, estructura suelo/construcción 6%, año 10%, programa 5%, recencia 10% y microdirección 10%. Terreno dominante recibe prioridad sólo contra terreno dominante.'
          : 'Después del filtro territorial se ordena por superficie, distancia y recencia.',
        TIGHT_GUARD_BARRIOS.has(canonicalBarrio) && payload.propertyType === 'Casa'
          ? `Guard reforzado ${canonicalBarrio}: sólo ventas entre 0,80× y 1,50× de la mediana robusta de su cohorte compiten automáticamente.`
          : '',
        excludedEconomic ? `${excludedEconomic} ventas CBRS atípicas para su cohorte de tamaño/terreno fueron retiradas del conjunto seleccionable.` : 'No se detectaron anomalías económicas generales en la cohorte seleccionable.',
        excludedBarrioGuard ? `${excludedBarrioGuard} ventas adicionales quedaron fuera por el guard económico reforzado del barrio.` : '',
        excludedPhysical ? `${excludedPhysical} ventas del mismo KML quedaron sólo como contexto por no ser físicamente equivalentes al sujeto.` : '',
        strongSiblingEvidenceCount ? `${strongSiblingEvidenceCount} venta(s) extrema(s) para la cohorte se conservaron por corresponder a la misma dirección base y no presentar conflicto duro de IQR/ROL.` : '',
        excludedStale ? `${excludedStale} ventas de casas de más de 5 años quedaron fuera del ranking principal.` : '',
        houseRecommendation
          ? `Referencia estadística no vinculante: ${houseRecommendation.weightedRateUfM2.toLocaleString('es-CL')} UF/m² ponderado, equivalente a ~${houseRecommendation.estimatedValueUf.toLocaleString('es-CL')} UF con ${houseRecommendation.comparableCount} ventas físicamente compatibles. Property Partners confirma la tasa final.`
          : payload.propertyType === 'Casa'
            ? 'No hay evidencia física suficiente para una recomendación automática robusta. El caso requiere revisión profesional; no se rellena la muestra con comparables débiles.'
            : '',
        'Portal representa oferta y permanece como referencia; CBRS representa ventas registradas. Property Partners decide.',
      ].filter(Boolean),
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
