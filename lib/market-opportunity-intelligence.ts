import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export type MarketOpportunitySignal =
  | 'price_reduction'
  | 'long_exposure'
  | 'below_neighborhood_median'
  | 'repeated_observation'

export type MarketOpportunityRow = {
  sourceListingId: string
  propertyId: string | null
  propertyType: 'Casa' | 'Departamento'
  title: string | null
  address: string | null
  neighborhoodName: string | null
  url: string | null
  priceUf: number | null
  priceUfM2: number | null
  firstSeenAt: string | null
  lastSeenAt: string | null
  daysObserved: number | null
  observationCount: number
  historicalMinPriceUf: number | null
  historicalMaxPriceUf: number | null
  priceReductionFromMaxPct: number | null
  neighborhoodMedianUfM2: number | null
  relativeToNeighborhoodMedianPct: number | null
  signals: Array<{ type: MarketOpportunitySignal; label: string; value: number | null }>
}

export type MarketOpportunityPulse = {
  rows: MarketOpportunityRow[]
  evaluatedListings: number
  withPriceReduction: number
  longExposure: number
  belowNeighborhoodMedian: number
  generatedAt: string
  methodology: string
  error?: string
}

type ListingRow = {
  source_id: string
  source_listing_id: string
  property_id: string | null
  title: string | null
  raw_address: string | null
  url: string | null
  price_uf: number | string | null
  price_uf_m2: number | string | null
  observed_at: string | null
  created_at: string | null
}

type HistoryRow = {
  source_listing_id: string
  first_seen_at: string | null
  last_seen_at: string | null
  minimum_price_uf: number | string | null
  maximum_price_uf: number | string | null
  observation_count: number | string | null
}

function numeric(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function daysBetween(start: string | null, end: string | null) {
  if (!start || !end) return null
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
  return Math.floor((b - a) / 86_400_000)
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export function buildMarketOpportunitySignals(input: {
  priceUf: number | null
  historicalMaxPriceUf: number | null
  daysObserved: number | null
  priceUfM2: number | null
  neighborhoodMedianUfM2: number | null
  observationCount: number
}) {
  const signals: MarketOpportunityRow['signals'] = []

  const priceReductionFromMaxPct = input.priceUf != null
    && input.historicalMaxPriceUf != null
    && input.historicalMaxPriceUf > 0
    && input.priceUf <= input.historicalMaxPriceUf
      ? (input.historicalMaxPriceUf - input.priceUf) / input.historicalMaxPriceUf
      : null

  if (priceReductionFromMaxPct != null && priceReductionFromMaxPct > 0) {
    signals.push({ type: 'price_reduction', label: 'Baja observada desde máximo histórico', value: priceReductionFromMaxPct })
  }

  if (input.daysObserved != null && input.daysObserved >= 30) {
    signals.push({ type: 'long_exposure', label: 'Exposición observada', value: input.daysObserved })
  }

  const relativeToNeighborhoodMedianPct = input.priceUfM2 != null
    && input.neighborhoodMedianUfM2 != null
    && input.neighborhoodMedianUfM2 > 0
      ? (input.priceUfM2 - input.neighborhoodMedianUfM2) / input.neighborhoodMedianUfM2
      : null

  if (relativeToNeighborhoodMedianPct != null && relativeToNeighborhoodMedianPct <= -0.05) {
    signals.push({ type: 'below_neighborhood_median', label: 'UF/m² bajo mediana publicada del barrio', value: relativeToNeighborhoodMedianPct })
  }

  if (input.observationCount >= 3) {
    signals.push({ type: 'repeated_observation', label: 'Evidencia repetida en cortes', value: input.observationCount })
  }

  return {
    signals,
    priceReductionFromMaxPct,
    relativeToNeighborhoodMedianPct,
  }
}

function chunks<T>(items: T[], size: number) {
  const output: T[][] = []
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size))
  return output
}

export async function getMarketOpportunityPulse(): Promise<MarketOpportunityPulse> {
  const empty = {
    rows: [],
    evaluatedListings: 0,
    withPriceReduction: 0,
    longExposure: 0,
    belowNeighborhoodMedian: 0,
    generatedAt: new Date().toISOString(),
    methodology: 'evidence_v2: baja de precio observada + días de exposición + repetición de evidencia; la comparación UF/m² por barrio se publica sólo cuando la identidad territorial está gobernada. Para departamentos se mantiene desactivada hasta resolver el barrio canónico. No crea ranking, no es valorización ni infiere intención del propietario.',
  } satisfies MarketOpportunityPulse

  try {
    const authDb = await createClient()
    const { data: userData, error: userError } = await authDb.auth.getUser()
    if (userError || !userData.user) return { ...empty, error: 'Sesión requerida para consultar inteligencia de mercado.' }

    const { data: profile, error: profileError } = await authDb
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError) return { ...empty, error: profileError.message }

    const role = String(profile?.role ?? '').toLowerCase()
    if (!['admin', 'ceo', 'director', 'subdirector', 'seller'].includes(role)) {
      return { ...empty, error: 'Acceso restringido a inteligencia de mercado.' }
    }

    const db = createServiceClient()
    const sourcesResult = await db
      .from('market_sources')
      .select('id,code')
      .in('code', [
        'portal-inmobiliario-vitacura-portal-houses',
        'portal-inmobiliario-vitacura-portal-apartments',
      ])

    if (sourcesResult.error) return { ...empty, error: sourcesResult.error.message }
    const sourceRows = sourcesResult.data ?? []
    const sourceIds = sourceRows.map((row) => row.id)
    if (!sourceIds.length) return empty

    const typeBySource = new Map(sourceRows.map((row) => [
      row.id,
      row.code.includes('apartments') ? 'Departamento' as const : 'Casa' as const,
    ]))

    const listingsResult = await db
      .from('market_current_listings')
      .select('source_id,source_listing_id,property_id,title,raw_address,url,price_uf,price_uf_m2,observed_at,created_at')
      .in('source_id', sourceIds)
      .in('status', ['active', 'observed'])
      .order('observed_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3500)

    if (listingsResult.error) return { ...empty, error: listingsResult.error.message }
    const rawListings = (listingsResult.data ?? []) as ListingRow[]
    const latestByListing = new Map<string, ListingRow>()
    for (const row of rawListings) {
      if (!latestByListing.has(row.source_listing_id)) latestByListing.set(row.source_listing_id, row)
    }
    const listings = [...latestByListing.values()]
    const sourceListingIds = [...new Set(listings.map((row) => row.source_listing_id).filter(Boolean))]
    const propertyIds = [...new Set(listings.map((row) => row.property_id).filter((id): id is string => Boolean(id)))]

    const historyRows: HistoryRow[] = []
    for (const ids of chunks(sourceListingIds, 500)) {
      const result = await db
        .from('market_listing_history')
        .select('source_listing_id,first_seen_at,last_seen_at,minimum_price_uf,maximum_price_uf,observation_count')
        .in('source_listing_id', ids)
      if (result.error) return { ...empty, error: result.error.message }
      historyRows.push(...((result.data ?? []) as HistoryRow[]))
    }

    const propertyRows: Array<{ id: string; neighborhood_id: string | null }> = []
    for (const ids of chunks(propertyIds, 500)) {
      const result = await db.from('market_properties').select('id,neighborhood_id').in('id', ids)
      if (result.error) return { ...empty, error: result.error.message }
      propertyRows.push(...(result.data ?? []))
    }

    const neighborhoodIds = [...new Set(propertyRows.map((row) => row.neighborhood_id).filter((id): id is string => Boolean(id)))]
    const neighborhoodsResult = neighborhoodIds.length
      ? await db.from('market_neighborhoods').select('id,name,micro_neighborhood').in('id', neighborhoodIds)
      : { data: [], error: null }

    if (neighborhoodsResult.error) return { ...empty, error: neighborhoodsResult.error.message }

    const historyByListing = new Map(historyRows.map((row) => [row.source_listing_id, row]))
    const neighborhoodByProperty = new Map(propertyRows.map((row) => [row.id, row.neighborhood_id]))
    const neighborhoodNameById = new Map((neighborhoodsResult.data ?? []).map((row) => [row.id, row.micro_neighborhood || row.name]))

    const neighborhoodUfM2 = new Map<string, number[]>()
    for (const listing of listings) {
      const propertyType = typeBySource.get(listing.source_id)
      const neighborhoodId = listing.property_id ? neighborhoodByProperty.get(listing.property_id) ?? null : null
      const priceUfM2 = numeric(listing.price_uf_m2)
      if (!propertyType || propertyType !== 'Casa' || !neighborhoodId || priceUfM2 == null || priceUfM2 <= 0) continue
      const key = `${propertyType}:${neighborhoodId}`
      const values = neighborhoodUfM2.get(key) ?? []
      values.push(priceUfM2)
      neighborhoodUfM2.set(key, values)
    }

    const medianByNeighborhood = new Map([...neighborhoodUfM2.entries()].map(([key, values]) => [key, median(values)]))
    const now = new Date().toISOString()

    const scoredRows = listings.map((listing): MarketOpportunityRow => {
      const propertyType = typeBySource.get(listing.source_id) ?? 'Casa'
      const history = historyByListing.get(listing.source_listing_id)
      const rawNeighborhoodId = listing.property_id ? neighborhoodByProperty.get(listing.property_id) ?? null : null
      const neighborhoodId = propertyType === 'Casa' ? rawNeighborhoodId : null
      const neighborhoodName = neighborhoodId ? neighborhoodNameById.get(neighborhoodId) ?? null : null
      const priceUf = numeric(listing.price_uf)
      const priceUfM2 = numeric(listing.price_uf_m2)
      const historicalMinPriceUf = numeric(history?.minimum_price_uf)
      const historicalMaxPriceUf = numeric(history?.maximum_price_uf)
      const firstSeenAt = history?.first_seen_at ?? listing.observed_at
      const lastSeenAt = history?.last_seen_at ?? listing.observed_at
      const daysObserved = daysBetween(firstSeenAt, now)
      const observationCount = Number(history?.observation_count ?? 1)
      const neighborhoodMedianUfM2 = neighborhoodId
        ? medianByNeighborhood.get(`${propertyType}:${neighborhoodId}`) ?? null
        : null

      const observed = buildMarketOpportunitySignals({
        priceUf,
        historicalMaxPriceUf,
        daysObserved,
        priceUfM2,
        neighborhoodMedianUfM2,
        observationCount,
      })

      return {
        sourceListingId: listing.source_listing_id,
        propertyId: listing.property_id,
        propertyType,
        title: listing.title,
        address: listing.raw_address,
        neighborhoodName,
        url: listing.url,
        priceUf,
        priceUfM2,
        firstSeenAt,
        lastSeenAt,
        daysObserved,
        observationCount,
        historicalMinPriceUf,
        historicalMaxPriceUf,
        priceReductionFromMaxPct: observed.priceReductionFromMaxPct,
        neighborhoodMedianUfM2,
        relativeToNeighborhoodMedianPct: observed.relativeToNeighborhoodMedianPct,
        signals: observed.signals,
      }
    }).filter((row) => row.signals.length > 0)

    const rows = [...scoredRows]
      .sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '') || a.sourceListingId.localeCompare(b.sourceListingId))
      .slice(0, 40)

    return {
      rows,
      evaluatedListings: listings.length,
      withPriceReduction: scoredRows.filter((row) => (row.priceReductionFromMaxPct ?? 0) > 0).length,
      longExposure: scoredRows.filter((row) => (row.daysObserved ?? 0) >= 60).length,
      belowNeighborhoodMedian: scoredRows.filter((row) => (row.relativeToNeighborhoodMedianPct ?? 0) <= -0.05).length,
      generatedAt: new Date().toISOString(),
      methodology: empty.methodology,
    }
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : 'No fue posible calcular el pulso de oportunidades.',
    }
  }
}
