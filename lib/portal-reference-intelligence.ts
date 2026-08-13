import { createClient } from '@/lib/supabase/server'

export type PortalReferenceDataset = {
  datasetKind: 'portal_apartments' | 'portal_houses' | 'portal_projects'
  listingCount: number
  geocodedCount: number
  pricedCount: number
  medianPriceUf: number | null
  medianUfM2: number | null
  medianAreaM2: number | null
  observedAt: string
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
  apartmentNeighborhoods: PortalNeighborhoodReference[]
  error?: string
}

function datasetKind(value: string): PortalReferenceDataset['datasetKind'] | null {
  if (value === 'portal_apartments' || value === 'portal_houses' || value === 'portal_projects') return value
  return null
}

export async function getPortalReferenceSnapshot(): Promise<PortalReferenceSnapshot> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_portal_reference_metrics')
      .select('dataset_kind,scope,listing_count,geocoded_count,priced_count,median_price_uf,median_uf_m2,median_area_m2,top_seller,top_seller_count,observed_at,neighborhood_id,market_neighborhoods(name,micro_neighborhood)')
      .order('listing_count', { ascending: false })

    if (error) return { connected: false, datasets: [], apartmentNeighborhoods: [], error: error.message }

    const rows = data ?? []
    const datasets: PortalReferenceDataset[] = rows
      .filter((row) => row.scope === 'global')
      .flatMap((row) => {
        const kind = datasetKind(row.dataset_kind)
        if (!kind) return []
        return [{
          datasetKind: kind,
          listingCount: Number(row.listing_count ?? 0),
          geocodedCount: Number(row.geocoded_count ?? 0),
          pricedCount: Number(row.priced_count ?? 0),
          medianPriceUf: row.median_price_uf == null ? null : Number(row.median_price_uf),
          medianUfM2: row.median_uf_m2 == null ? null : Number(row.median_uf_m2),
          medianAreaM2: row.median_area_m2 == null ? null : Number(row.median_area_m2),
          observedAt: row.observed_at,
        }]
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

    return { connected: true, datasets, apartmentNeighborhoods }
  } catch (error) {
    return {
      connected: false,
      datasets: [],
      apartmentNeighborhoods: [],
      error: error instanceof Error ? error.message : 'No fue posible consultar la referencia canónica de Portal.',
    }
  }
}
