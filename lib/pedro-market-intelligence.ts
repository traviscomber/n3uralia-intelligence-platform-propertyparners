import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'

export type PedroPropertyType = 'Casa' | 'Departamento'

export type PedroAnnualMarketRow = {
  year: number
  transactions: number
  medianPriceUf: number | null
  medianUfM2: number | null
}

export type PedroQuintiles = {
  count: number
  min: number | null
  p20: number | null
  p40: number | null
  median: number | null
  p60: number | null
  p80: number | null
  max: number | null
}

export type PedroMarketTypeSnapshot = {
  propertyType: PedroPropertyType
  annual: PedroAnnualMarketRow[]
  latestCompleteYear: number | null
  latestTransactions: number | null
  averageAnnualTransactions4y: number | null
  averageMonthlySales: number | null
  latestVs4yAveragePct: number | null
  latestVsPriorYearPct: number | null
  offerEvidenceCount: number
  offerLatestObservedAt: string | null
  fullSnapshot: boolean
  portalReportedCount: number | null
  rawListingCandidates: number | null
  duplicateListingCandidates: number | null
  uniqueListingsDiscovered: number | null
  validListingRows: number | null
  discoveryExhausted: boolean | null
  discoveryCapped: boolean | null
  captureFilterLabel: string
  absorptionMonths: number | null
  salesPriceQuintiles: PedroQuintiles
  salesUfM2Quintiles: PedroQuintiles
  offerPriceQuintiles: PedroQuintiles | null
  offerUfM2Quintiles: PedroQuintiles | null
}

export type PedroMarketSnapshot = {
  houses: PedroMarketTypeSnapshot
  apartments: PedroMarketTypeSnapshot
  generatedAt: string
  warnings: string[]
}

function numberOrNull(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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

function quintiles(values: Array<number | null>): PedroQuintiles {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value) && value > 0)
  if (!clean.length) {
    return { count: 0, min: null, p20: null, p40: null, median: null, p60: null, p80: null, max: null }
  }
  const sorted = [...clean].sort((a, b) => a - b)
  return {
    count: sorted.length,
    min: sorted[0],
    p20: percentile(sorted, 0.2),
    p40: percentile(sorted, 0.4),
    median: percentile(sorted, 0.5),
    p60: percentile(sorted, 0.6),
    p80: percentile(sorted, 0.8),
    max: sorted.at(-1) ?? null,
  }
}

function pctChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null
  return current / previous - 1
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function payloadNumber(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  return numberOrNull((payload as Record<string, unknown>)[key])
}

export async function getPedroMarketSnapshot(): Promise<PedroMarketSnapshot> {
  const supabase = createServiceClient()
  const currentYear = new Date().getUTCFullYear()
  const latestCompleteYear = currentYear - 1
  const firstTrendYear = latestCompleteYear - 3

  const sourceCodes: Record<PedroPropertyType, string> = {
    Casa: 'portal-inmobiliario-vitacura-portal-houses',
    Departamento: 'portal-inmobiliario-vitacura-portal-apartments',
  }
  const datasetKinds: Record<PedroPropertyType, string> = {
    Casa: 'portal_houses',
    Departamento: 'portal_apartments',
  }

  const [annualResult, sourceResult] = await Promise.all([
    supabase
      .from('market_cbrs_reference_metrics')
      .select('property_type,scope,year,transactions,median_price_uf,median_uf_m2')
      .eq('scope', 'year')
      .in('property_type', ['Casa', 'Departamento'])
      .gte('year', firstTrendYear)
      .lte('year', latestCompleteYear)
      .order('year', { ascending: true }),
    supabase
      .from('market_sources')
      .select('id,code')
      .in('code', Object.values(sourceCodes)),
  ])

  if (annualResult.error) throw new Error(`PEDRO_MARKET_ANNUAL_FAILED:${annualResult.error.message}`)
  if (sourceResult.error) throw new Error(`PEDRO_MARKET_SOURCES_FAILED:${sourceResult.error.message}`)

  const sourceIdByCode = new Map((sourceResult.data ?? []).map((row) => [row.code, row.id]))
  const warnings: string[] = []

  async function build(propertyType: PedroPropertyType): Promise<PedroMarketTypeSnapshot> {
    const sourceId = sourceIdByCode.get(sourceCodes[propertyType]) ?? null
    const datasetKind = datasetKinds[propertyType]
    const annual: PedroAnnualMarketRow[] = (annualResult.data ?? [])
      .filter((row) => row.property_type === propertyType)
      .map((row) => ({
        year: Number(row.year),
        transactions: Number(row.transactions ?? 0),
        medianPriceUf: numberOrNull(row.median_price_uf),
        medianUfM2: numberOrNull(row.median_uf_m2),
      }))

    const latest = annual.at(-1) ?? null
    const previous = annual.at(-2) ?? null
    const averageAnnualTransactions4y = average(annual.map((row) => row.transactions))
    const averageMonthlySales = latest ? latest.transactions / 12 : null

    const [salesResult, offerResult, ingestionResult] = await Promise.all([
      supabase
        .from('market_cbrs_reference_transactions')
        .select('price_uf,built_area_m2')
        .eq('property_type', propertyType)
        .gte('transaction_date', `${latestCompleteYear}-01-01`)
        .lt('transaction_date', `${currentYear}-01-01`)
        .limit(1000),
      sourceId
        ? supabase
            .from('market_current_listings')
            .select('price_uf,observed_at,raw_payload,market_properties(built_area_m2,useful_area_m2)')
            .eq('source_id', sourceId)
            .in('status', ['active', 'observed'])
            .order('observed_at', { ascending: false })
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('market_ingestion_runs')
        .select('started_at,expected_rows,received_rows,accepted_rows,metadata')
        .eq('source_system', 'portal_inmobiliario')
        .eq('dataset_kind', datasetKind)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (salesResult.error) throw new Error(`PEDRO_MARKET_SALES_FAILED:${propertyType}:${salesResult.error.message}`)
    if (offerResult.error) throw new Error(`PEDRO_MARKET_OFFER_FAILED:${propertyType}:${offerResult.error.message}`)
    if (ingestionResult.error) throw new Error(`PEDRO_MARKET_INGESTION_FAILED:${propertyType}:${ingestionResult.error.message}`)

    const salesRows = salesResult.data ?? []
    const salesPrices = salesRows.map((row) => numberOrNull(row.price_uf))
    const salesUfM2 = salesRows.map((row) => {
      const price = numberOrNull(row.price_uf)
      const builtArea = numberOrNull(row.built_area_m2)
      return price != null && builtArea != null && builtArea > 0 ? price / builtArea : null
    })

    const offerRows = offerResult.data ?? []
    const offerPrices = offerRows.map((row) => numberOrNull(row.price_uf))
    const offerUfM2 = offerRows.map((row) => {
      const property = Array.isArray(row.market_properties) ? row.market_properties[0] : row.market_properties
      const price = numberOrNull(row.price_uf)
      const payloadBuilt = payloadNumber(row.raw_payload, 'built_area_m2')
      const builtArea = payloadBuilt ?? numberOrNull(property?.built_area_m2) ?? numberOrNull(property?.useful_area_m2)
      return price != null && builtArea != null && builtArea > 0 ? price / builtArea : null
    })

    const metadata = ingestionResult.data?.metadata && typeof ingestionResult.data.metadata === 'object'
      ? ingestionResult.data.metadata as Record<string, unknown>
      : {}
    const fullSnapshot = metadata.full_snapshot === true
    const portalReportedCount = numberOrNull(metadata.portal_reported_count)
    const rawListingCandidates = numberOrNull(metadata.raw_listing_candidates)
    const duplicateListingCandidates = numberOrNull(metadata.duplicate_listing_candidates)
    const uniqueListingsDiscovered = numberOrNull(metadata.unique_listings_discovered)
    const validListingRows = numberOrNull(metadata.valid_listing_rows)
    const discoveryExhausted = typeof metadata.discovery_exhausted === 'boolean' ? metadata.discovery_exhausted : null
    const discoveryCapped = typeof metadata.discovery_capped === 'boolean' ? metadata.discovery_capped : null
    const captureFilterLabel = propertyType === 'Casa'
      ? 'Venta · Casa · Propiedades usadas · Vitacura'
      : 'Venta · Departamento · Propiedades usadas · Vitacura'
    const offerEvidenceCount = offerRows.length
    const absorptionMonths = fullSnapshot && averageMonthlySales != null && averageMonthlySales > 0
      ? offerEvidenceCount / averageMonthlySales
      : null

    if (!fullSnapshot) {
      warnings.push(`${propertyType}: la captura Portal más reciente no acredita snapshot completo; oferta, quintiles de oferta y absorción se mantienen como no publicables.`)
    }

    return {
      propertyType,
      annual,
      latestCompleteYear: latest?.year ?? null,
      latestTransactions: latest?.transactions ?? null,
      averageAnnualTransactions4y,
      averageMonthlySales,
      latestVs4yAveragePct: latest && averageAnnualTransactions4y ? pctChange(latest.transactions, averageAnnualTransactions4y) : null,
      latestVsPriorYearPct: latest && previous ? pctChange(latest.transactions, previous.transactions) : null,
      offerEvidenceCount,
      offerLatestObservedAt: offerRows[0]?.observed_at ?? null,
      fullSnapshot,
      portalReportedCount,
      rawListingCandidates,
      duplicateListingCandidates,
      uniqueListingsDiscovered,
      validListingRows,
      discoveryExhausted,
      discoveryCapped,
      captureFilterLabel,
      absorptionMonths,
      salesPriceQuintiles: quintiles(salesPrices),
      salesUfM2Quintiles: quintiles(salesUfM2),
      offerPriceQuintiles: fullSnapshot ? quintiles(offerPrices) : null,
      offerUfM2Quintiles: fullSnapshot ? quintiles(offerUfM2) : null,
    }
  }

  const [houses, apartments] = await Promise.all([build('Casa'), build('Departamento')])
  return { houses, apartments, generatedAt: new Date().toISOString(), warnings }
}
