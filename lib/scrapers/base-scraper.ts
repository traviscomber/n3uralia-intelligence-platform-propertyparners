import { createClient } from '@supabase/supabase-js'

export type PropertyOperation = 'venta' | 'arriendo' | 'otro'

export type VitacuraSource =
  | 'portal_inmobiliario'
  | 'portal_inmobiliario_houses'
  | 'portal_inmobiliario_departments'
  | 'toctoc_search'
  | 'toctoc_houses_search'
  | 'icasas_search'
  | 'icasas_houses_search'
  | 'yapo_search'
  | 'chilepropiedades_houses_search'
  | 'chilepropiedades_departments_search'
  | 'other'

export interface RawProperty {
  externalId: string
  source: VitacuraSource
  title: string
  priceRaw?: string | number | null
  currencyRaw?: string | null
  areaRaw?: string | number | null
  bedrooms?: number | null
  bathrooms?: number | null
  parking?: number | null
  propertyType?: string | null
  operation?: PropertyOperation | null
  region?: string | null
  city?: string | null
  commune?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  description?: string | null
  features?: string[]
  images?: string[]
  sourceUrl?: string | null
  contactName?: string | null
  contactPhone?: string | null
  daysActive?: number | null
  isNewConstruction?: boolean
}

export interface NormalisedProperty {
  address: string
  neighborhood: string
  property_type: string | null
  price_uf: number | null
  area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  lat: number | null
  lng: number | null
  status: string
  days_on_market: number
  source: VitacuraSource
  external_id: string
  source_url: string | null
  image_url: string | null
  listing_number: string | null
  tags: string[]
  source_listing_id: string | null
}

export interface ScrapeResult {
  source: VitacuraSource
  found: number
  inserted: number
  updated: number
  skipped: number
  errors: string[]
  durationMs: number
}

let _ufCache: { value: number; fetchedAt: number } | null = null

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getUFValue(): Promise<number> {
  if (_ufCache && Date.now() - _ufCache.fetchedAt < 3_600_000) {
    return _ufCache.value
  }

  try {
    const res = await fetch('https://mindicador.cl/api/uf', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`mindicador.cl returned ${res.status}`)
    const json = await res.json()
    const value = json?.serie?.[0]?.valor ?? 39_000
    _ufCache = { value, fetchedAt: Date.now() }
    return value
  } catch {
    return _ufCache?.value ?? 39_000
  }
}

export function parseChileanPrice(raw: string | number | null | undefined): {
  value: number | null
  currency: 'CLP' | 'UF' | 'USD'
} {
  if (raw == null) return { value: null, currency: 'CLP' }
  const str = String(raw).trim()
  if (!str || str === '-' || str.toLowerCase() === 'consultar') return { value: null, currency: 'CLP' }

  const lower = str.toLowerCase()
  const currency: 'CLP' | 'UF' | 'USD' = lower.includes('uf')
    ? 'UF'
    : lower.includes('usd') || lower.includes('us$')
      ? 'USD'
      : 'CLP'

  const cleaned = str
    .replace(/uf|usd|us\$|\$|clp/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const value = Number.parseFloat(cleaned)
  return { value: Number.isNaN(value) ? null : value, currency }
}

export function parseArea(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  const str = String(raw).trim().toLowerCase()
  if (!str || str === '-') return null

  const haMatch = str.match(/^([\d.,]+)\s*(ha|has|hect[aá]rea[s]?)/)
  if (haMatch) {
    const n = Number.parseFloat(haMatch[1].replace(',', '.'))
    return Number.isNaN(n) || n <= 0 ? null : Math.round(n * 10_000)
  }

  const cleaned = str.replace(/m[²2]/gi, '').replace(',', '.').trim()
  const n = Number.parseFloat(cleaned)
  return Number.isNaN(n) || n <= 0 ? null : n
}

export function normaliseNeighborhood(raw: string | null | undefined): string {
  const text = (raw || '').trim()
  if (!text) return 'Vitacura Centro'
  return text
}

export async function normaliseProperty(raw: RawProperty): Promise<NormalisedProperty> {
  const ufValue = await getUFValue()
  const { value: priceValue, currency } = parseChileanPrice(raw.priceRaw)

  let priceUf: number | null = null

  if (priceValue !== null) {
    if (currency === 'UF') {
      priceUf = priceValue
    } else if (currency === 'CLP') {
      priceUf = Number((priceValue / ufValue).toFixed(2))
    } else if (currency === 'USD') {
      const clp = priceValue * 950
      priceUf = Number((clp / ufValue).toFixed(2))
    }
  }

  const areaM2 = parseArea(raw.areaRaw)
  const neighborhood = normaliseNeighborhood(raw.commune || raw.region || 'Vitacura')

  return {
    address: (raw.address || raw.title).trim().slice(0, 200),
    neighborhood,
    property_type: raw.propertyType?.toLowerCase().trim() || null,
    price_uf: priceUf,
    area_m2: areaM2,
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    status: 'available',
    days_on_market: raw.daysActive ?? 0,
    source: raw.source,
    external_id: raw.externalId,
    source_url: raw.sourceUrl ?? null,
    image_url: raw.images?.[0] ?? null,
    listing_number: raw.externalId,
    tags: Array.from(new Set([
      raw.propertyType,
      neighborhood,
      raw.source,
      raw.operation || 'venta',
    ].filter(Boolean).map((value) => String(value).toLowerCase().trim().replace(/\s+/g, '_')))),
    source_listing_id: raw.sourceUrl ?? raw.externalId,
  }
}

export async function upsertProperties(normalised: NormalisedProperty[]) {
  if (normalised.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] }
  }

  const supabase = getAdminClient()
  const errors: string[] = []
  let inserted = 0
  let updated = 0
  let skipped = 0

  const unique = Array.from(new Map(normalised.map((property) => [property.external_id, property])).values())
  const existingIds = new Set<string>()
  const { data: existingRows, error: existingError } = await supabase
    .from('properties')
    .select('external_id')
    .in('external_id', unique.map((row) => row.external_id))

  if (!existingError && existingRows) {
    for (const row of existingRows as Array<{ external_id: string | null }>) {
      if (row.external_id) existingIds.add(row.external_id)
    }
  }

  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { error } = await supabase
      .from('properties')
      .upsert(chunk, { onConflict: 'external_id', ignoreDuplicates: false })

    if (error) {
      errors.push(`Chunk ${i}-${i + chunkSize}: ${error.message}`)
      skipped += chunk.length
      continue
    }

    for (const row of chunk) {
      if (existingIds.has(row.external_id)) {
        updated += 1
      } else {
        inserted += 1
      }
    }
  }

  return { inserted, updated, skipped, errors }
}

export async function logScrapeRun(source: VitacuraSource, result: Omit<ScrapeResult, 'source'>) {
  try {
    const supabase = getAdminClient()
    await supabase.from('scrape_runs').insert({
      source,
      status: result.errors.length === 0 ? 'success' : result.found > 0 ? 'partial' : 'error',
      scraped_count: result.found,
      inserted_count: result.inserted,
      skipped_count: result.skipped,
      error_count: result.errors.length,
      errors: result.errors.join('\n'),
      started_at: new Date(Date.now() - result.durationMs).toISOString(),
      finished_at: new Date().toISOString(),
    })
  } catch {
    // Best effort.
  }
}
