import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { loadPortalOffer, type OfferGroup, type OfferType } from '@/lib/portal-offer-service'
import { portalChileToday } from '@/lib/portal-offer-day'
import { canonicalCbrsHistory, type AnnualCbrsMeasure, type CbrsAnnualInput } from '@/lib/market-pedro-history'

type SourceRow = { code: string; row_count: number | null; period_end: string | null }
type RecentRunRow = {
  dataset_kind: string
  status: string
  started_at: string
}

export type PortalDailyStatus = {
  updatedAt: string | null
  lastAttemptAt: string | null
  current: boolean
  failed: boolean
}

export type PedroMarketCategory = {
  type: OfferType
  name: string
  group: OfferGroup | null
  daily: PortalDailyStatus
}

export type PedroMarketOverview = {
  day: string
  categories: PedroMarketCategory[]
  cbrsHistory: AnnualCbrsMeasure[]
  historyUnavailable: boolean
  lastCompleteYear: number
  kmlNeighborhoods: number | null
  cbrsSourceEnd: string | null
}

const kindConfigs: ReadonlyArray<{ type: OfferType; name: string; dataset: string }> = [
  { type: 'casas', name: 'Casas', dataset: 'portal_houses' },
  { type: 'departamentos', name: 'Departamentos', dataset: 'portal_apartments' },
]

export async function loadPedroMarketOverview(): Promise<PedroMarketOverview> {
  const now = portalChileToday()
  const lastCompleteYear = Number(now.day.slice(0, 4)) - 1
  const service = createServiceClient()
  const [offers, annual, sources, houseUpdate, apartmentUpdate] = await Promise.allSettled([
    // Do not request the 25 inventory details just to paint two summary cards.
    loadPortalOffer({ selected: 'casas', page: 1, includeInventory: false }),
    service.from('market_cbrs_reference_metrics')
      .select('year,property_type,transactions,median_price_uf,median_uf_m2')
      .eq('scope', 'year')
      .in('property_type', ['Casa', 'Departamento'])
      .gte('year', lastCompleteYear - 3).lte('year', lastCompleteYear)
      .order('year', { ascending: true }).limit(8),
    service.from('market_sources').select('code,row_count,period_end')
      .in('code', ['cbrs_vitacura_canonical_2014_2026', 'kml_vitacura_barrios_2026_08_12']).limit(2),
    service.from('market_ingestion_runs').select('dataset_kind,status,started_at')
      .eq('source_system', 'portal_inmobiliario')
      .eq('dataset_kind', 'portal_houses')
      .contains('metadata', { pipeline: 'portal_daily_delta_v1' })
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('market_ingestion_runs').select('dataset_kind,status,started_at')
      .eq('source_system', 'portal_inmobiliario')
      .eq('dataset_kind', 'portal_apartments')
      .contains('metadata', { pipeline: 'portal_daily_delta_v1' })
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const groups = offers.status === 'fulfilled' ? offers.value.groups : []
  function dailyResult(result: typeof houseUpdate | typeof apartmentUpdate): PortalDailyStatus {
    const row: RecentRunRow | null = result.status === 'fulfilled' && !result.value.error
      ? result.value.data as RecentRunRow | null : null
    const lastAttemptAt = row?.started_at ?? null
    const valid = Boolean(row && row.status === 'completed' && lastAttemptAt)
    const updatedAt = valid ? lastAttemptAt : null
    const date = updatedAt ? new Date(updatedAt) : null
    const current = Boolean(date && !Number.isNaN(date.getTime())
      && portalChileToday(date).day === now.day)
    return {
      updatedAt,
      lastAttemptAt,
      current,
      failed: Boolean(result.status === 'fulfilled' && result.value.data && row?.status !== 'completed'),
    }
  }
  const categories = kindConfigs.map((kind, index): PedroMarketCategory => ({
    type: kind.type,
    name: kind.name,
    group: groups.find((group) => group.type === kind.type) ?? null,
    daily: dailyResult(index === 0 ? houseUpdate : apartmentUpdate),
  }))

  const annualRows: CbrsAnnualInput[] = annual.status === 'fulfilled' && !annual.value.error
    ? (annual.value.data ?? []) as CbrsAnnualInput[] : []
  const sourceRows: SourceRow[] = sources.status === 'fulfilled' && !sources.value.error
    ? (sources.value.data ?? []) as SourceRow[] : []
  const byCode = new Map(sourceRows.map((row) => [row.code, row]))
  const count = byCode.get('kml_vitacura_barrios_2026_08_12')?.row_count
  const kmlNeighborhoods = count !== null && count !== undefined && Number.isFinite(Number(count))
    ? Number(count) : null

  return {
    day: now.day,
    categories,
    cbrsHistory: canonicalCbrsHistory(annualRows, lastCompleteYear),
    historyUnavailable: annual.status !== 'fulfilled' || Boolean(annual.value.error) || annualRows.length === 0,
    lastCompleteYear,
    kmlNeighborhoods,
    cbrsSourceEnd: byCode.get('cbrs_vitacura_canonical_2014_2026')?.period_end ?? null,
  }
}
