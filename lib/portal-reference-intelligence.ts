import { createClient } from '@/lib/supabase/server'

export type PortalReferenceDataset = {
  datasetKind: 'portal_apartments' | 'portal_houses' | 'portal_projects'
  scope: string
  listingCount: number
  geocodedCount: number
  pricedCount: number
  medianPriceUf: number | null
  medianUfM2: number | null
  medianAreaM2: number | null
  observedAt: string
}

export type PortalLiveDataset = {
  datasetKind: PortalReferenceDataset['datasetKind']
  listingCount: number
  medianPriceUf: number | null
  medianUfM2: number | null
  medianAreaM2: number | null
}

export type PortalNeighborhoodReference = {
  name: string
  listingCount: number
  medianPriceUf: number | null
  medianUfM2: number | null
  medianAreaM2: number | null
  topSeller: string | null
  topSellerCount: number
}

export type PortalReferenceSnapshot = {
  connected: boolean
  datasets: PortalReferenceDataset[]
  liveDatasets: PortalLiveDataset[]
  apartmentNeighborhoods: PortalNeighborhoodReference[]
  error?: string
}

function datasetKind(value: string): PortalReferenceDataset['datasetKind'] | null {
  if (value === 'portal_apartments' || value === 'portal_houses' || value === 'portal_projects') return value
  return null
}

function liveKind(value: string | null | undefined): PortalReferenceDataset['datasetKind'] | null {
  if (value === 'Departamento') return 'portal_apartments'
  if (value === 'Casa') return 'portal_houses'
  if (value === 'Proyecto') return 'portal_projects'
  return null
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function numericPayload(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function getPortalReferenceSnapshot(): Promise<PortalReferenceSnapshot> {
  try {
    const supabase = await createClient()
    const [referenceResult, liveResult] = await Promise.all([
      supabase
        .from('market_portal_reference_metrics')
        .select('dataset_kind,scope,listing_count,geocoded_count,priced_count,median_price_uf,median_uf_m2,median_area_m2,top_seller,top_seller_count,observed_at,neighborhood_id,market_neighborhoods(name,micro_neighborhood)')
        .order('listing_count', { ascending: false }),
      supabase
        .from('market_current_listings')
        .select('price_uf,price_uf_m2,raw_payload,market_sources(code,metadata),market_properties(property_type,useful_area_m2)')
        .in('status', ['active', 'observed']),
    ])

    const error = referenceResult.error || liveResult.error
    if (error) return { connected: false, datasets: [], liveDatasets: [], apartmentNeighborhoods: [], error: error.message }

    const rows = referenceResult.data ?? []
    const datasets: PortalReferenceDataset[] = rows
      .filter((row) => row.scope === 'global')
      .flatMap((row) => {
        const kind = datasetKind(row.dataset_kind)
        if (!kind) return []
        return [{
          datasetKind: kind,
          scope: row.scope,
          listingCount: Number(row.listing_count ?? 0),
          geocodedCount: Number(row.geocoded_count ?? 0),
          pricedCount: Number(row.priced_count ?? 0),
          medianPriceUf: row.median_price_uf == null ? null : Number(row.median_price_uf),
          medianUfM2: row.median_uf_m2 == null ? null : Number(row.median_uf_m2),
          medianAreaM2: row.median_area_m2 == null ? null : Number(row.median_area_m2),
          observedAt: row.observed_at,
        }]
      })

    const grouped = new Map<PortalReferenceDataset['datasetKind'], { prices: number[]; ufm2: number[]; areas: number[]; count: number }>()
    for (const row of liveResult.data ?? []) {
      const property = Array.isArray(row.market_properties) ? row.market_properties[0] : row.market_properties
      const source = Array.isArray(row.market_sources) ? row.market_sources[0] : row.market_sources
      const sourceMetadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata as Record<string, unknown> : null
      const sourceCode = typeof source?.code === 'string' ? source.code : null
      const sourceDatasetKind = typeof sourceMetadata?.dataset_kind === 'string' ? datasetKind(sourceMetadata.dataset_kind) : null
      const kind = sourceDatasetKind ?? liveKind(property?.property_type)
      if (!kind) continue

      // "Live" means the current canonical Portal collectors only. Legacy
      // imports remain available as historical evidence but must not be
      // counted as today's Portal inventory.
      const expectedSourceCode = `portal-inmobiliario-vitacura-${kind}`
      if (sourceCode !== expectedSourceCode) continue

      const rawPayload = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload as Record<string, unknown> : null
      const payloadArea = numericPayload(rawPayload?.useful_area_m2)
      const canonicalArea = property?.useful_area_m2 == null ? null : Number(property.useful_area_m2)
      const area = canonicalArea ?? payloadArea

      const bucket = grouped.get(kind) ?? { prices: [], ufm2: [], areas: [], count: 0 }
      bucket.count += 1
      if (row.price_uf != null) bucket.prices.push(Number(row.price_uf))
      if (row.price_uf_m2 != null) bucket.ufm2.push(Number(row.price_uf_m2))
      if (area != null && Number.isFinite(area)) bucket.areas.push(area)
      grouped.set(kind, bucket)
    }

    const liveDatasets: PortalLiveDataset[] = (['portal_apartments', 'portal_houses', 'portal_projects'] as const).map((kind) => {
      const bucket = grouped.get(kind) ?? { prices: [], ufm2: [], areas: [], count: 0 }
      return {
        datasetKind: kind,
        listingCount: bucket.count,
        medianPriceUf: median(bucket.prices),
        medianUfM2: median(bucket.ufm2),
        medianAreaM2: median(bucket.areas),
      }
    })

    const apartmentNeighborhoods: PortalNeighborhoodReference[] = rows
      .filter((row) => row.scope === 'neighborhood' && row.dataset_kind === 'portal_apartments')
      .map((row) => {
        const neighborhood = Array.isArray(row.market_neighborhoods)
          ? row.market_neighborhoods[0]
          : row.market_neighborhoods
        return {
          name: neighborhood?.micro_neighborhood || neighborhood?.name || 'Sin barrio',
          listingCount: Number(row.listing_count ?? 0),
          medianPriceUf: row.median_price_uf == null ? null : Number(row.median_price_uf),
          medianUfM2: row.median_uf_m2 == null ? null : Number(row.median_uf_m2),
          medianAreaM2: row.median_area_m2 == null ? null : Number(row.median_area_m2),
          topSeller: row.top_seller || null,
          topSellerCount: Number(row.top_seller_count ?? 0),
        }
      })
      .sort((a, b) => b.listingCount - a.listingCount)

    return { connected: true, datasets, liveDatasets, apartmentNeighborhoods }
  } catch (error) {
    return {
      connected: false,
      datasets: [],
      liveDatasets: [],
      apartmentNeighborhoods: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar la referencia canónica de Portal.',
    }
  }
}
