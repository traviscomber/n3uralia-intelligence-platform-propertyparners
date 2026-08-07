import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DAY_MS = 86_400_000
const LEGACY_PREFIX = 'legacy-property:'

function numberOrNull(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function daysBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.max(0, Math.floor((b - a) / DAY_MS))
}

function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  const high = Math.ceil(index)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

function legacyId(canonicalKey: unknown) {
  const key = String(canonicalKey ?? '')
  return key.startsWith(LEGACY_PREFIX) ? key.slice(LEGACY_PREFIX.length) : null
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await context.params
  const propertyFields = 'id,canonical_key,property_type,normalized_address,neighborhood_id,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces,identity_status,identity_confidence,identity_evidence,first_seen_at,last_seen_at'

  let propertyResult = await supabase.from('market_properties').select(propertyFields).eq('id', id).maybeSingle()
  if (!propertyResult.data && !propertyResult.error) {
    propertyResult = await supabase.from('market_properties').select(propertyFields).eq('canonical_key', `${LEGACY_PREFIX}${id}`).maybeSingle()
  }
  if (propertyResult.error) return NextResponse.json({ error: 'No fue posible consultar la identidad de la propiedad.' }, { status: 500 })
  const property = propertyResult.data
  if (!property) return NextResponse.json({ error: 'Propiedad no encontrada.' }, { status: 404 })

  const subjectLegacyId = legacyId(property.canonical_key)
  const [listingResult, historyResult, transactionResult, lifecycleResult, matchResult, neighborhoodResult, legacySubjectResult] = await Promise.all([
    supabase.from('market_current_listings').select('id,property_id,source_listing_id,status,operation,url,title,raw_address,normalized_address,price_uf,price_uf_m2,published_at,observed_at,removed_at,raw_payload').eq('property_id', property.id).order('observed_at', { ascending: false }),
    supabase.from('market_listings').select('id,source_id,source_listing_id,status,operation,url,price_uf,price_uf_m2,published_at,observed_at,removed_at').eq('property_id', property.id).order('observed_at', { ascending: true }),
    supabase.from('market_transactions').select('id,transaction_date,price_uf,price_uf_m2,description').eq('property_id', property.id).order('transaction_date', { ascending: true }),
    supabase.from('market_property_lifecycle').select('property_id,first_published_at,last_observed_at,removed_at,first_confirmed_sale_date,days_on_market').eq('property_id', property.id).maybeSingle(),
    supabase.from('market_property_matches').select('id,left_entity_id,right_entity_id,score,status,evidence,contradictions').or(`left_entity_id.eq.${property.id},right_entity_id.eq.${property.id}`).order('score', { ascending: false }),
    property.neighborhood_id ? supabase.from('market_neighborhoods').select('id,name,micro_neighborhood,assignment_status').eq('id', property.neighborhood_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    subjectLegacyId ? supabase.from('properties').select('id,days_on_market,source,source_url,description,created_at').eq('id', subjectLegacyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])

  const queryErrors = [listingResult.error, historyResult.error, transactionResult.error, lifecycleResult.error, matchResult.error, neighborhoodResult.error, legacySubjectResult.error].filter(Boolean)
  if (queryErrors.length) return NextResponse.json({ error: 'No fue posible completar la evidencia de la propiedad.' }, { status: 500 })

  const listings = listingResult.data ?? []
  const history = historyResult.data ?? []
  const transactions = transactionResult.data ?? []
  const lifecycle = lifecycleResult.data ?? null
  const matches = matchResult.data ?? []
  const neighborhood = neighborhoodResult.data ?? null
  const legacySubject = legacySubjectResult.data ?? null
  const currentListing = listings.find((item) => ['active', 'observed'].includes(String(item.status))) ?? listings[0] ?? null
  const area = numberOrNull(property.useful_area_m2) ?? numberOrNull(property.built_area_m2)
  const currentPrice = numberOrNull(currentListing?.price_uf)
  const currentUfM2 = numberOrNull(currentListing?.price_uf_m2) ?? (currentPrice != null && area != null && area > 0 ? currentPrice / area : null)
  const rawPayload = currentListing?.raw_payload && typeof currentListing.raw_payload === 'object' ? currentListing.raw_payload as Record<string, unknown> : {}
  const listingReportedDom = numberOrNull(rawPayload.days_on_market)
  const legacyReportedDom = numberOrNull(legacySubject?.days_on_market)
  const sourceReportedDom = listingReportedDom ?? legacyReportedDom
  const sourceReportedDomOrigin = listingReportedDom != null ? 'current_listing_payload' : legacyReportedDom != null ? 'legacy_source_bridge' : null
  const nowIso = new Date().toISOString()
  const observedSpanDays = daysBetween(property.first_seen_at, property.last_seen_at)
  const openAgeSinceFirstObservation = currentListing && ['active', 'observed'].includes(String(currentListing.status)) ? daysBetween(property.first_seen_at, nowIso) : null
  const evidenceAgeDays = daysBetween(property.last_seen_at, nowIso)
  const confirmedDom = numberOrNull(lifecycle?.days_on_market)

  const priceHistory = history.filter((row) => row.price_uf != null).map((row) => ({ observedAt: row.observed_at, priceUf: Number(row.price_uf), status: row.status, sourceListingId: row.source_listing_id }))
  const distinctPrices = [...new Set(priceHistory.map((row) => row.priceUf))]

  const targetArea = area
  let comparableProperties: Array<Record<string, unknown>> = []
  if (targetArea != null && targetArea > 0) {
    let comparableQuery = supabase
      .from('market_properties')
      .select(propertyFields)
      .neq('id', property.id)
      .eq('property_type', property.property_type)
      .gte('useful_area_m2', targetArea * 0.75)
      .lte('useful_area_m2', targetArea * 1.25)
      .limit(250)
    if (property.neighborhood_id) comparableQuery = comparableQuery.eq('neighborhood_id', property.neighborhood_id)
    const result = await comparableQuery
    if (!result.error) comparableProperties = (result.data ?? []).filter((candidate) => {
      const bedrooms = numberOrNull(candidate.bedrooms)
      const bathrooms = numberOrNull(candidate.bathrooms)
      const bedroomOk = property.bedrooms == null || bedrooms == null || Math.abs(Number(property.bedrooms) - bedrooms) <= 1
      const bathroomOk = property.bathrooms == null || bathrooms == null || Math.abs(Number(property.bathrooms) - bathrooms) <= 1
      return bedroomOk && bathroomOk
    })
  }

  const comparableIds = comparableProperties.map((candidate) => String(candidate.id))
  const comparableLegacyIds = comparableProperties.map((candidate) => legacyId(candidate.canonical_key)).filter((value): value is string => Boolean(value))
  const [comparableListingResult, comparableLegacyResult] = await Promise.all([
    comparableIds.length
      ? supabase.from('market_current_listings').select('id,property_id,status,url,normalized_address,price_uf,price_uf_m2,observed_at,published_at,raw_payload').in('property_id', comparableIds).in('status', ['active', 'observed']).not('price_uf', 'is', null).order('observed_at', { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
    comparableLegacyIds.length
      ? supabase.from('properties').select('id,days_on_market,source_url').in('id', comparableLegacyIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (comparableListingResult.error || comparableLegacyResult.error) {
    return NextResponse.json({ error: 'No fue posible completar los comparables.' }, { status: 500 })
  }

  const propertyById = new Map(comparableProperties.map((candidate) => [String(candidate.id), candidate]))
  const legacyById = new Map((comparableLegacyResult.data ?? []).map((row) => [String(row.id), row]))
  const latestListingByProperty = new Map<string, Record<string, unknown>>()
  for (const listing of comparableListingResult.data ?? []) {
    const key = String(listing.property_id)
    if (!latestListingByProperty.has(key)) latestListingByProperty.set(key, listing as Record<string, unknown>)
  }

  const comparableRows = [...latestListingByProperty.entries()].map(([propertyId, listing]) => {
    const candidate = propertyById.get(propertyId) ?? {}
    const candidateArea = numberOrNull(candidate.useful_area_m2) ?? numberOrNull(candidate.built_area_m2)
    const price = numberOrNull(listing.price_uf)
    const priceUfM2 = numberOrNull(listing.price_uf_m2) ?? (price != null && candidateArea != null && candidateArea > 0 ? price / candidateArea : null)
    const payload = listing.raw_payload && typeof listing.raw_payload === 'object' ? listing.raw_payload as Record<string, unknown> : {}
    const candidateLegacyId = legacyId(candidate.canonical_key)
    const legacy = candidateLegacyId ? legacyById.get(candidateLegacyId) ?? null : null
    const payloadDom = numberOrNull(payload.days_on_market)
    const bridgeDom = numberOrNull(legacy?.days_on_market)
    return {
      propertyId,
      address: candidate.normalized_address ?? listing.normalized_address ?? null,
      areaM2: candidateArea,
      bedrooms: numberOrNull(candidate.bedrooms),
      bathrooms: numberOrNull(candidate.bathrooms),
      priceUf: price,
      priceUfM2,
      observedAt: listing.observed_at ?? null,
      sourceReportedDom: payloadDom ?? bridgeDom,
      sourceReportedDomOrigin: payloadDom != null ? 'current_listing_payload' : bridgeDom != null ? 'legacy_source_bridge' : null,
      identityStatus: candidate.identity_status ?? null,
      identityConfidence: numberOrNull(candidate.identity_confidence),
      url: listing.url ?? legacy?.source_url ?? null,
    }
  }).filter((row) => row.priceUfM2 != null)

  const ufM2Values = comparableRows.map((row) => Number(row.priceUfM2)).filter(Number.isFinite)
  const domValues = comparableRows.map((row) => row.sourceReportedDom).filter((value): value is number => value != null && Number.isFinite(value))
  const p25 = percentile(ufM2Values, 0.25)
  const medianUfM2 = percentile(ufM2Values, 0.5)
  const p75 = percentile(ufM2Values, 0.75)
  const medianSourceDom = percentile(domValues, 0.5)
  const impliedPriceAtMedian = medianUfM2 != null && area != null ? medianUfM2 * area : null
  const priceVsMedianPct = currentUfM2 != null && medianUfM2 != null && medianUfM2 !== 0 ? (currentUfM2 / medianUfM2 - 1) * 100 : null
  const domVsMedianMultiple = sourceReportedDom != null && medianSourceDom != null && medianSourceDom > 0 ? sourceReportedDom / medianSourceDom : null

  const missingEvidence: string[] = []
  if (property.identity_status !== 'confirmed') missingEvidence.push('Identidad canónica pendiente de confirmación humana.')
  if (evidenceAgeDays == null || evidenceAgeDays > 7) missingEvidence.push('Vigencia de publicación sin observación reciente (más de 7 días).')
  if (history.length < 2) missingEvidence.push('Sin serie temporal suficiente para reconstruir cambios de precio o estado.')
  if (!transactions.length) missingEvidence.push('Sin transacción confirmada vinculada; no existe precio efectivo de cierre.')
  if (!matches.length) missingEvidence.push('Sin otra identidad candidata vinculada para esta propiedad.')
  missingEvidence.push('Sin evidencia vinculada de visitas, ofertas o feedback de compradores en este expediente de mercado.')

  const signals = {
    pricePosition: priceVsMedianPct == null ? 'unknown' : priceVsMedianPct <= -10 ? 'below_market' : priceVsMedianPct >= 10 ? 'above_market' : 'near_market',
    marketStagnation: domVsMedianMultiple == null ? 'unknown' : domVsMedianMultiple >= 3 ? 'high' : domVsMedianMultiple >= 1.5 ? 'medium' : 'low',
    freshness: evidenceAgeDays == null ? 'unknown' : evidenceAgeDays <= 7 ? 'current' : evidenceAgeDays <= 30 ? 'stale' : 'very_stale',
    identity: property.identity_status,
  }

  let recommendation = 'Completar evidencia antes de recomendar una acción comercial.'
  if (signals.marketStagnation === 'high' && signals.pricePosition === 'below_market') {
    recommendation = 'No existe evidencia suficiente para atribuir el estancamiento al precio. Priorizar verificación de vigencia, exposición, visitas, feedback y atributos del inmueble antes de recomendar otra rebaja.'
  } else if (signals.marketStagnation === 'high' && signals.pricePosition === 'above_market') {
    recommendation = 'Revisar posicionamiento de precio junto con exposición, visitas y feedback; el precio aparece sobre la referencia comparable y el tiempo reportado es alto.'
  } else if (signals.freshness !== 'current') {
    recommendation = 'Actualizar la evidencia de publicación antes de emitir una recomendación operativa.'
  }

  const confidenceInputs = [
    property.identity_status === 'confirmed' ? 1 : numberOrNull(property.identity_confidence) ?? 0.4,
    comparableRows.length >= 10 ? 1 : comparableRows.length >= 5 ? 0.7 : comparableRows.length > 0 ? 0.4 : 0,
    evidenceAgeDays != null && evidenceAgeDays <= 7 ? 1 : evidenceAgeDays != null && evidenceAgeDays <= 30 ? 0.6 : 0.25,
    history.length >= 2 ? 1 : 0.35,
    transactions.length ? 1 : 0.3,
  ]
  const confidence = confidenceInputs.reduce((sum, value) => sum + value, 0) / confidenceInputs.length

  return NextResponse.json({
    property: {
      id: property.id,
      requestedId: id,
      canonicalKey: property.canonical_key,
      address: property.normalized_address,
      neighborhood: neighborhood?.name ?? null,
      propertyType: property.property_type,
      areaM2: area,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parkingSpaces: property.parking_spaces,
      identityStatus: property.identity_status,
      identityConfidence: numberOrNull(property.identity_confidence),
      identityEvidence: property.identity_evidence,
    },
    sourceEvidence: {
      legacyPropertyId: subjectLegacyId,
      source: legacySubject?.source ?? null,
      sourceUrl: legacySubject?.source_url ?? currentListing?.url ?? null,
      sourceReportedDom,
      sourceReportedDomOrigin,
      description: legacySubject?.description ?? null,
    },
    currentMarket: {
      listingId: currentListing?.id ?? null,
      status: currentListing?.status ?? null,
      priceUf: currentPrice,
      priceUfM2: currentUfM2,
      observedAt: currentListing?.observed_at ?? null,
      evidenceAgeDays,
      sourceReportedDom,
      sourceReportedDomOrigin,
      observedSpanDays,
      openAgeSinceFirstObservation,
      confirmedDom,
      domMethodology: {
        sourceReportedDom: 'Valor reportado por la fuente o preservado por el bridge legado. Se usa como señal comparativa, nunca como DOM canónico.',
        observedSpanDays: 'Días entre primera y última observación almacenada por la plataforma.',
        openAgeSinceFirstObservation: 'Edad desde primera observación sólo mientras la última publicación siga marcada activa/observada; se degrada con evidencia stale.',
        confirmedDom: 'Sólo existe cuando una transacción confirmada permite cerrar el ciclo contractual.',
      },
    },
    lifecycle: {
      firstObservedAt: property.first_seen_at,
      lastObservedAt: property.last_seen_at,
      firstPublishedAt: lifecycle?.first_published_at ?? null,
      removedAt: lifecycle?.removed_at ?? null,
      firstConfirmedSaleDate: lifecycle?.first_confirmed_sale_date ?? null,
      priceHistory,
      distinctPriceCount: distinctPrices.length,
      observations: history.length,
      transactions: transactions.length,
    },
    comparables: {
      count: comparableRows.length,
      sourceDomCoverage: domValues.length,
      priceUfM2: { p25, median: medianUfM2, p75 },
      medianSourceReportedDom: medianSourceDom,
      impliedPriceAtMedian,
      priceVsMedianPct,
      domVsMedianMultiple,
      methodology: 'Misma tipología y barrio contractual, superficie útil ±25%, dormitorios/baños ±1; una publicación vigente más reciente por property_id. Los matches candidatos no se fusionan hasta confirmación humana. El DOM reportado se conserva como evidencia de fuente y no reemplaza el lifecycle canónico.',
      rows: comparableRows.sort((a, b) => Math.abs(Number(a.priceUfM2) - Number(currentUfM2 ?? a.priceUfM2)) - Math.abs(Number(b.priceUfM2) - Number(currentUfM2 ?? b.priceUfM2))).slice(0, 20),
    },
    identityMatches: matches,
    signals,
    recommendation,
    missingEvidence,
    confidence: Number(confidence.toFixed(3)),
    confidenceLabel: confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
    generatedAt: nowIso,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
