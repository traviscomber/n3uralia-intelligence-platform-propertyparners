import { NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { hasCapability } from '@/lib/access-control'
import { createServiceClient } from '@/lib/supabase/service'
import type { DecisionTraceItem } from '@/lib/intelligence-decision-trace'
import { hasDecisionGradeComparableSample, isVitacuraComparableAddress } from '@/lib/property360-comparables'

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

function boundedScore(value: number) {
  return Math.max(0, Math.min(1, value))
}


export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let scope: Awaited<ReturnType<typeof requireCapability>>
  try {
    scope = await requireCapability('market.read')
  } catch (error) {
    return accessErrorResponse(error)
  }

  const supabase = createServiceClient()
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

  const canReadProperties = hasCapability(scope.role, 'properties.global.read')
    || hasCapability(scope.role, 'properties.office.read')
    || hasCapability(scope.role, 'properties.self.read')
  const canReadValuations = hasCapability(scope.role, 'valuations.global.read')
    || hasCapability(scope.role, 'valuations.office.read')
    || hasCapability(scope.role, 'valuations.self.read')

  const [assignmentResult, assignmentHistoryResult, valuationResult, prospectLeadResult] = await Promise.all([
        canReadProperties
          ? supabase
              .from('property_assignments')
              .select('id,property_id,assigned_to,assignment_role,status,notes,assigned_at,ended_at,updated_at')
              .eq('property_id', property.id)
              .order('assigned_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
        canReadProperties
          ? supabase
              .from('property_assignment_history')
              .select('id,assignment_id,property_id,assigned_to,action,created_at')
              .eq('property_id', property.id)
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [], error: null }),
        canReadValuations
          ? supabase
              .from('valuation_cases')
              .select('id,subject_property_id,requested_by,status,valuation_date,estimated_value_uf,low_value_uf,high_value_uf,confidence,methodology_version,version_number,created_at,updated_at,reviewed_at,approved_at,issued_at')
              .eq('subject_property_id', property.id)
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('property_prospect_leads')
          .select('id,status,priority,director_key,assigned_at,first_contact_at,last_follow_up_at,next_follow_up_at,won_at,lost_at,latest_note,updated_at')
          .eq('property_id', property.id)
          .maybeSingle(),
      ])

  if (assignmentResult.error || assignmentHistoryResult.error || valuationResult.error || prospectLeadResult.error) {
    return NextResponse.json({ error: 'No fue posible completar la operación interna vinculada.' }, { status: 500 })
  }

  const assignmentRows = assignmentResult.data ?? []
  const assignmentHistoryRows = assignmentHistoryResult.data ?? []
  const valuationRows = valuationResult.data ?? []
  const prospectLead = prospectLeadResult.data ?? null
  const visibleAssignments = assignmentRows.filter((row) => !row.assigned_to || scope.visibleProfileIds.includes(String(row.assigned_to)))
  const visibleAssignmentHistory = assignmentHistoryRows.filter((row) => !row.assigned_to || scope.visibleProfileIds.includes(String(row.assigned_to)))
  const visibleValuations = valuationRows.filter((row) => !row.requested_by || scope.visibleProfileIds.includes(String(row.requested_by)))
  const profileIds = [...new Set([
    ...visibleAssignments.map((row) => row.assigned_to),
    ...visibleAssignmentHistory.map((row) => row.assigned_to),
  ].filter((value): value is string => Boolean(value)))]
  const profileResult = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,role,team').in('id', profileIds)
    : { data: [], error: null }
  if (profileResult.error) return NextResponse.json({ error: 'No fue posible completar responsables internos.' }, { status: 500 })
  const profileById = new Map((profileResult.data ?? []).map((profile) => [String(profile.id), profile]))

  const currentAssignment = visibleAssignments.find((row) => row.status === 'active' && !row.ended_at) ?? visibleAssignments[0] ?? null
  const latestValuation = visibleValuations[0] ?? null

  const [prospectEventsResult, prospectDirectorResult] = await Promise.all([
    prospectLead
      ? supabase
          .from('property_prospect_events')
          .select('id,event_type,from_status,to_status,note,occurred_at')
          .eq('lead_id', prospectLead.id)
          .order('occurred_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
    prospectLead?.director_key
      ? supabase
          .from('property_director_directory')
          .select('director_key,full_name,role,office_name')
          .eq('director_key', prospectLead.director_key)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (prospectEventsResult.error || prospectDirectorResult.error) {
    return NextResponse.json({ error: 'No fue posible completar la trazabilidad comercial de la propiedad.' }, { status: 500 })
  }
  const prospectDirector = prospectDirectorResult.data ?? null
  const prospectEvents = prospectEventsResult.data ?? []

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
  const firstPrice = priceHistory[0]?.priceUf ?? null
  const latestPrice = priceHistory.at(-1)?.priceUf ?? null

  const lifecycleTimeline = [
    property.first_seen_at ? {
      id: `market:first-seen:${property.id}`,
      occurredAt: property.first_seen_at,
      type: 'market_observed',
      domain: 'market',
      label: 'Primera evidencia observada',
      detail: 'La plataforma observó por primera vez esta identidad de propiedad.',
      valueUf: null,
      href: currentListing?.url ?? legacySubject?.source_url ?? null,
    } : null,
    lifecycle?.first_published_at ? {
      id: `market:first-published:${property.id}`,
      occurredAt: lifecycle.first_published_at,
      type: 'listing_published',
      domain: 'market',
      label: 'Publicación observada',
      detail: 'Inicio publicado según el lifecycle canónico disponible.',
      valueUf: firstPrice,
      href: currentListing?.url ?? legacySubject?.source_url ?? null,
    } : null,
    ...priceHistory.reduce<Array<Record<string, unknown>>>((events, row, index) => {
      const previous = index > 0 ? priceHistory[index - 1] : null
      if (!previous || previous.priceUf === row.priceUf) return events
      const changePct = previous.priceUf > 0 ? (row.priceUf / previous.priceUf - 1) * 100 : null
      events.push({
        id: `market:price:${row.sourceListingId}:${row.observedAt}`,
        occurredAt: row.observedAt,
        type: 'price_changed',
        domain: 'market',
        label: changePct != null && changePct < 0 ? 'Precio publicado reducido' : 'Precio publicado actualizado',
        detail: changePct == null ? 'Cambio de precio observado.' : `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% respecto de la observación previa.`,
        valueUf: row.priceUf,
        href: currentListing?.url ?? legacySubject?.source_url ?? null,
      })
      return events
    }, []),
    lifecycle?.removed_at ? {
      id: `market:removed:${property.id}`,
      occurredAt: lifecycle.removed_at,
      type: 'listing_removed',
      domain: 'market',
      label: 'Publicación retirada',
      detail: 'Retiro observado por el lifecycle de mercado. No implica por sí solo una venta.',
      valueUf: latestPrice,
      href: null,
    } : null,
    ...transactions.map((transaction) => ({
      id: `registry:transaction:${transaction.id}`,
      occurredAt: transaction.transaction_date,
      type: 'registered_sale',
      domain: 'registry',
      label: 'Venta registral confirmada',
      detail: 'Transacción vinculada en la fuente registral. No se interpreta automáticamente como cierre comercial Property Partners.',
      valueUf: numberOrNull(transaction.price_uf),
      href: null,
    })),
    ...visibleAssignmentHistory.map((row) => ({
      id: `internal:assignment:${row.id}`,
      occurredAt: row.created_at,
      type: 'assignment',
      domain: 'internal',
      label: row.action === 'created' ? 'Propiedad asignada' : 'Asignación actualizada',
      detail: row.assigned_to
        ? `${profileById.get(String(row.assigned_to))?.full_name ?? 'Responsable visible'} · ${row.action}`
        : `Cambio de asignación · ${row.action}`,
      valueUf: null,
      href: null,
    })),
    ...visibleValuations.flatMap((row) => [
      row.created_at ? {
        id: `internal:valuation-created:${row.id}`,
        occurredAt: row.created_at,
        type: 'valuation_created',
        domain: 'internal',
        label: 'Valorización creada',
        detail: `${row.methodology_version ?? 'Metodología PP'} · versión ${row.version_number ?? 1}`,
        valueUf: numberOrNull(row.estimated_value_uf),
        href: `/dashboard/valuations/${row.id}`,
      } : null,
      row.reviewed_at ? {
        id: `internal:valuation-reviewed:${row.id}`,
        occurredAt: row.reviewed_at,
        type: 'valuation_reviewed',
        domain: 'internal',
        label: 'Valorización revisada',
        detail: 'El expediente registró revisión interna.',
        valueUf: numberOrNull(row.estimated_value_uf),
        href: `/dashboard/valuations/${row.id}`,
      } : null,
      row.approved_at ? {
        id: `internal:valuation-approved:${row.id}`,
        occurredAt: row.approved_at,
        type: 'valuation_approved',
        domain: 'internal',
        label: 'Valorización aprobada',
        detail: 'El expediente registró aprobación.',
        valueUf: numberOrNull(row.estimated_value_uf),
        href: `/dashboard/valuations/${row.id}`,
      } : null,
      row.issued_at ? {
        id: `internal:valuation-issued:${row.id}`,
        occurredAt: row.issued_at,
        type: 'valuation_issued',
        domain: 'internal',
        label: 'Valorización emitida',
        detail: 'Existe versión emitida del expediente.',
        valueUf: numberOrNull(row.estimated_value_uf),
        href: `/dashboard/valuations/${row.id}`,
      } : null,
    ]),
  ]
    .filter((event): event is NonNullable<typeof event> => Boolean(event?.occurredAt))
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .slice(0, 30)

  const targetArea = area
  let comparableProperties: Array<Record<string, unknown>> = []
  if (targetArea != null && targetArea > 0) {
    let comparableQuery = supabase
      .from('market_properties')
      .select(propertyFields)
      .neq('id', property.id)
      .eq('property_type', property.property_type)
      .limit(500)
    if (property.neighborhood_id) comparableQuery = comparableQuery.eq('neighborhood_id', property.neighborhood_id)
    const result = await comparableQuery
    if (!result.error) comparableProperties = (result.data ?? []).filter((candidate) => {
      const candidateArea = numberOrNull(candidate.useful_area_m2) ?? numberOrNull(candidate.built_area_m2)
      const bedrooms = numberOrNull(candidate.bedrooms)
      const bathrooms = numberOrNull(candidate.bathrooms)
      const areaOk = candidateArea != null && candidateArea >= targetArea * 0.75 && candidateArea <= targetArea * 1.25
      const bedroomOk = property.bedrooms == null || bedrooms == null || Math.abs(Number(property.bedrooms) - bedrooms) <= 1
      const bathroomOk = property.bathrooms == null || bathrooms == null || Math.abs(Number(property.bathrooms) - bathrooms) <= 1
      const geographyOk = isVitacuraComparableAddress(candidate.normalized_address)
      return areaOk && bedroomOk && bathroomOk && geographyOk
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
  const comparableDecisionEligible = hasDecisionGradeComparableSample(comparableRows.length)
  const decisionMedianUfM2 = comparableDecisionEligible ? medianUfM2 : null
  const decisionMedianSourceDom = comparableDecisionEligible ? medianSourceDom : null
  const impliedPriceAtMedian = decisionMedianUfM2 != null && area != null ? decisionMedianUfM2 * area : null
  const priceVsMedianPct = currentUfM2 != null && decisionMedianUfM2 != null && decisionMedianUfM2 !== 0 ? (currentUfM2 / decisionMedianUfM2 - 1) * 100 : null
  const domVsMedianMultiple = sourceReportedDom != null && decisionMedianSourceDom != null && decisionMedianSourceDom > 0 ? sourceReportedDom / decisionMedianSourceDom : null

  const comparableFreshRows = comparableRows.filter((row) => {
    const age = daysBetween(String(row.observedAt ?? ''), nowIso)
    return age != null && age <= 30
  })
  const comparableConfirmedRows = comparableRows.filter((row) => row.identityStatus === 'confirmed')
  const comparableWithSourceDom = comparableRows.filter((row) => row.sourceReportedDom != null)
  const comparableFreshnessCoverage = comparableRows.length ? comparableFreshRows.length / comparableRows.length : 0
  const comparableIdentityCoverage = comparableRows.length ? comparableConfirmedRows.length / comparableRows.length : 0
  const comparableDomCoverage = comparableRows.length ? comparableWithSourceDom.length / comparableRows.length : 0
  const iqr = p25 != null && p75 != null ? p75 - p25 : null
  const relativeIqrPct = iqr != null && medianUfM2 != null && medianUfM2 > 0 ? iqr / medianUfM2 * 100 : null
  const comparableQualityScore = boundedScore(
    (Math.min(comparableRows.length, 10) / 10) * 0.4
      + comparableFreshnessCoverage * 0.25
      + comparableIdentityCoverage * 0.2
      + comparableDomCoverage * 0.15,
  )

  const priceChangePct = firstPrice != null && latestPrice != null && firstPrice > 0 ? (latestPrice / firstPrice - 1) * 100 : null
  const sequentialPriceChanges = priceHistory.slice(1).map((row, index) => {
    const previous = priceHistory[index]?.priceUf
    return previous && previous > 0 ? (row.priceUf / previous - 1) * 100 : null
  }).filter((value): value is number => value != null && Number.isFinite(value))
  const maxSequentialPriceChangePct = sequentialPriceChanges.length ? Math.max(...sequentialPriceChanges.map((value) => Math.abs(value))) : null
  const anomalies: Array<{ id: string; severity: 'warning' | 'info'; label: string; detail: string }> = []
  if (relativeIqrPct != null && relativeIqrPct > 35) anomalies.push({ id: 'comparable-dispersion', severity: 'warning', label: 'Alta dispersión de comparables', detail: `El rango intercuartil equivale a ${relativeIqrPct.toFixed(1)}% de la mediana UF/m²; la referencia de precio requiere cautela.` })
  if (maxSequentialPriceChangePct != null && maxSequentialPriceChangePct >= 15) anomalies.push({ id: 'price-jump', severity: 'warning', label: 'Cambio abrupto de precio', detail: `La serie contiene al menos un cambio de ${maxSequentialPriceChangePct.toFixed(1)}% entre observaciones consecutivas.` })
  if (distinctPrices.length >= 4) anomalies.push({ id: 'price-volatility', severity: 'info', label: 'Múltiples precios observados', detail: `Se registran ${distinctPrices.length} precios distintos en ${history.length} observaciones.` })
  if (comparableRows.length > 0 && comparableFreshnessCoverage < 0.5) anomalies.push({ id: 'comparable-staleness', severity: 'warning', label: 'Comparables con baja vigencia', detail: `Sólo ${(comparableFreshnessCoverage * 100).toFixed(0)}% de los comparables tiene observación de los últimos 30 días.` })

  const missingEvidence: string[] = []
  if (property.identity_status !== 'confirmed') missingEvidence.push('Identidad canónica pendiente de confirmación humana.')
  if (evidenceAgeDays == null || evidenceAgeDays > 7) missingEvidence.push('Vigencia de publicación sin observación reciente (más de 7 días).')
  if (history.length < 2) missingEvidence.push('Sin serie temporal suficiente para reconstruir cambios de precio o estado.')
  if (!transactions.length) missingEvidence.push('Sin transacción confirmada vinculada; no existe precio efectivo de cierre.')
  if (!matches.length) missingEvidence.push('Sin otra identidad candidata vinculada para esta propiedad.')
  if (comparableRows.length < 5) missingEvidence.push('Universo comparable reducido; la referencia estadística debe tratarse con cautela.')
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
    comparableQualityScore,
    evidenceAgeDays != null && evidenceAgeDays <= 7 ? 1 : evidenceAgeDays != null && evidenceAgeDays <= 30 ? 0.6 : 0.25,
    history.length >= 2 ? 1 : 0.35,
    transactions.length ? 1 : 0.3,
  ]
  const confidence = confidenceInputs.reduce((sum, value) => sum + value, 0) / confidenceInputs.length
  const confidenceLabel = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'

  const decisionTrace: DecisionTraceItem[] = [
    {
      id: `property:${property.id}:price-position`,
      domain: 'market',
      title: 'Posición de precio',
      evidenceStatus: comparableDecisionEligible && decisionMedianUfM2 != null ? 'external_market' : 'non_evaluable',
      evidenceLabel: !comparableDecisionEligible
        ? `Muestra insuficiente: ${comparableRows.length} comparables válidos; el mínimo decisional es 3.`
        : priceVsMedianPct == null
          ? 'No existe una mediana comparable suficiente para posicionar el precio.'
          : `UF/m² sujeto comparado con mediana de ${comparableRows.length} comparables: ${priceVsMedianPct.toFixed(1)}%.`,
      source: 'Mercado externo normalizado',
      sourceReference: neighborhood?.name ?? null,
      cutoff: currentListing?.observed_at ?? property.last_seen_at ?? null,
      severity: signals.pricePosition === 'above_market' ? 'warning' : 'info',
      confidence: confidenceLabel,
      action: signals.pricePosition === 'above_market' ? 'Revisar posicionamiento junto con exposición y evidencia comercial antes de cambiar precio.' : 'Mantener monitoreo contra comparables vigentes.',
      href: '/dashboard/market',
      evidenceCount: comparableRows.length,
    },
    {
      id: `property:${property.id}:stagnation`,
      domain: 'market',
      title: 'Estancamiento de mercado',
      evidenceStatus: domVsMedianMultiple != null ? 'external_market' : 'non_evaluable',
      evidenceLabel: domVsMedianMultiple == null ? 'No existe cobertura DOM comparable suficiente.' : `DOM reportado por fuente equivale a ${domVsMedianMultiple.toFixed(1)}× la mediana comparable.`,
      source: sourceReportedDomOrigin ?? 'Mercado externo',
      cutoff: currentListing?.observed_at ?? property.last_seen_at ?? null,
      severity: signals.marketStagnation === 'high' ? 'warning' : 'info',
      confidence: confidenceLabel,
      action: 'Validar vigencia y contexto antes de atribuir causa al precio.',
      href: '/dashboard/market',
      evidenceCount: domValues.length,
    },
    {
      id: `property:${property.id}:freshness`,
      domain: 'market',
      title: 'Vigencia de evidencia',
      evidenceStatus: signals.freshness === 'current' ? 'external_market' : 'missing',
      evidenceLabel: evidenceAgeDays == null ? 'No existe fecha suficiente para verificar vigencia.' : `Última observación hace ${evidenceAgeDays} días.`,
      source: legacySubject?.source ?? 'Mercado externo',
      cutoff: property.last_seen_at ?? null,
      severity: signals.freshness === 'very_stale' ? 'warning' : 'info',
      confidence: signals.freshness === 'current' ? 'high' : signals.freshness === 'stale' ? 'medium' : 'low',
      action: signals.freshness === 'current' ? 'Sin acción de vigencia requerida.' : 'Revalidar publicación antes de una decisión operativa.',
      evidenceCount: history.length,
    },
  ]

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
    internalOperations: {
      linked: Boolean(subjectLegacyId || currentAssignment || latestValuation || prospectLead),
      legacyPropertyId: subjectLegacyId,
      permissions: {
        canReadProperties,
        canReadValuations,
      },
      coverage: {
        assignments: !canReadProperties ? 'restricted' : assignmentRows.length > visibleAssignments.length ? 'restricted' : visibleAssignments.length ? 'available' : 'not_informed',
        valuations: !canReadValuations ? 'restricted' : valuationRows.length > visibleValuations.length ? 'restricted' : visibleValuations.length ? 'available' : 'not_informed',
        crmActivity: prospectLead ? 'available' : 'not_informed',
      },
      currentAssignment: currentAssignment ? {
        id: currentAssignment.id,
        assignedTo: currentAssignment.assigned_to,
        assignedToName: currentAssignment.assigned_to ? profileById.get(String(currentAssignment.assigned_to))?.full_name ?? null : null,
        assignedToRole: currentAssignment.assigned_to ? profileById.get(String(currentAssignment.assigned_to))?.role ?? null : null,
        team: currentAssignment.assigned_to ? profileById.get(String(currentAssignment.assigned_to))?.team ?? null : null,
        assignmentRole: currentAssignment.assignment_role,
        status: currentAssignment.status,
        notes: currentAssignment.notes,
        assignedAt: currentAssignment.assigned_at,
        endedAt: currentAssignment.ended_at,
        updatedAt: currentAssignment.updated_at,
      } : null,
      assignmentHistory: visibleAssignmentHistory.slice(0, 8).map((row) => ({
        id: row.id,
        assignmentId: row.assignment_id,
        assignedTo: row.assigned_to,
        action: row.action,
        createdAt: row.created_at,
      })),
      latestValuation: latestValuation ? {
        id: latestValuation.id,
        status: latestValuation.status,
        valuationDate: latestValuation.valuation_date,
        estimatedValueUf: numberOrNull(latestValuation.estimated_value_uf),
        lowValueUf: numberOrNull(latestValuation.low_value_uf),
        highValueUf: numberOrNull(latestValuation.high_value_uf),
        confidence: latestValuation.confidence,
        methodologyVersion: latestValuation.methodology_version,
        versionNumber: latestValuation.version_number,
        createdAt: latestValuation.created_at,
        updatedAt: latestValuation.updated_at,
        reviewedAt: latestValuation.reviewed_at,
        approvedAt: latestValuation.approved_at,
        issuedAt: latestValuation.issued_at,
      } : null,
      prospect: prospectLead ? {
        id: prospectLead.id,
        status: prospectLead.status,
        priority: prospectLead.priority,
        directorKey: prospectLead.director_key,
        directorName: prospectDirector?.full_name ?? null,
        directorRole: prospectDirector?.role ?? null,
        officeName: prospectDirector?.office_name ?? null,
        assignedAt: prospectLead.assigned_at,
        firstContactAt: prospectLead.first_contact_at,
        lastFollowUpAt: prospectLead.last_follow_up_at,
        nextFollowUpAt: prospectLead.next_follow_up_at,
        wonAt: prospectLead.won_at,
        lostAt: prospectLead.lost_at,
        latestNote: prospectLead.latest_note,
        updatedAt: prospectLead.updated_at,
        events: prospectEvents,
      } : null,
      valuations: visibleValuations.slice(0, 8).map((row) => ({
        id: row.id,
        status: row.status,
        valuationDate: row.valuation_date,
        estimatedValueUf: numberOrNull(row.estimated_value_uf),
        confidence: row.confidence,
        methodologyVersion: row.methodology_version,
        versionNumber: row.version_number,
        createdAt: row.created_at,
        issuedAt: row.issued_at,
      })),
      limitation: prospectLead ? 'El lead y su seguimiento están enlazados directamente al property_id canónico. Visitas, ofertas, feedback y cierres internos permanecen fuera hasta contar con evidencia CRM por propiedad equivalente.' : 'Aún no existe un lead Property Partners para esta propiedad. Visitas, ofertas, feedback y cierres internos sólo se incorporarán cuando exista evidencia CRM canónica enlazada a este identificador.',
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
      timeline: lifecycleTimeline,
      commercialClosureLinked: false,
      commercialClosureNote: 'Una transacción registral confirma una venta en la fuente registral, pero el cierre comercial interno de Property Partners permanece no enlazado hasta contar con evidencia CRM por propiedad.',
    },
    comparables: {
      count: comparableRows.length,
      minimumRequired: 3,
      decisionEligible: comparableDecisionEligible,
      sourceDomCoverage: domValues.length,
      priceUfM2: { p25, median: medianUfM2, p75 },
      medianSourceReportedDom: decisionMedianSourceDom,
      impliedPriceAtMedian,
      priceVsMedianPct,
      domVsMedianMultiple,
      methodology: 'Misma tipología y barrio contractual, comuna Vitacura verificada en la dirección normalizada, superficie útil (o construida si falta) ±25%, dormitorios/baños ±1; una publicación vigente más reciente por property_id. Los matches candidatos no se fusionan hasta confirmación humana. El DOM reportado se conserva como evidencia de fuente y no reemplaza el lifecycle canónico.',
      quality: {
        score: Number(comparableQualityScore.toFixed(3)),
        label: comparableQualityScore >= 0.8 ? 'high' : comparableQualityScore >= 0.6 ? 'medium' : 'low',
        freshCount: comparableFreshRows.length,
        confirmedIdentityCount: comparableConfirmedRows.length,
        sourceDomCount: comparableWithSourceDom.length,
        freshnessCoverage: Number(comparableFreshnessCoverage.toFixed(3)),
        identityCoverage: Number(comparableIdentityCoverage.toFixed(3)),
        domCoverage: Number(comparableDomCoverage.toFixed(3)),
        relativeIqrPct: relativeIqrPct == null ? null : Number(relativeIqrPct.toFixed(1)),
      },
      rows: comparableRows.sort((a, b) => Math.abs(Number(a.priceUfM2) - Number(currentUfM2 ?? a.priceUfM2)) - Math.abs(Number(b.priceUfM2) - Number(currentUfM2 ?? b.priceUfM2))).slice(0, 20),
    },
    priceConsistency: {
      firstPriceUf: firstPrice,
      latestPriceUf: latestPrice,
      changePct: priceChangePct == null ? null : Number(priceChangePct.toFixed(1)),
      maxSequentialChangePct: maxSequentialPriceChangePct == null ? null : Number(maxSequentialPriceChangePct.toFixed(1)),
      distinctPriceCount: distinctPrices.length,
    },
    anomalies,
    identityMatches: matches,
    signals,
    recommendation,
    decisionTrace,
    missingEvidence,
    evidenceQuality: {
      comparableScore: Number(comparableQualityScore.toFixed(3)),
      overallScore: Number(confidence.toFixed(3)),
      evidenceAgeDays,
      comparableCount: comparableRows.length,
      observationCount: history.length,
      transactionCount: transactions.length,
    },
    confidence: Number(confidence.toFixed(3)),
    confidenceLabel,
    generatedAt: nowIso,
  }, { headers: { 'Cache-Control': 'no-store' } })
}