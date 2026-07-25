import marketSourceData from '@/data/market-source-intelligence.json'

export type MarketOperation = 'sale' | 'rent' | 'unknown'
export type MarketPropertyType = 'house' | 'apartment' | 'project' | 'other'
export type MarketListingStatus = 'active' | 'removed' | 'sold' | 'unknown'
export type MarketSourceRole = 'published_offer' | 'registered_sales' | 'neighborhood_geometry' | 'unknown'

export type CanonicalMarketProperty = {
  canonicalId: string
  sourceRecordId: string | null
  sourceFile: string
  sourceRole: MarketSourceRole
  sourceUpdatedAt: string | null
  operation: MarketOperation
  propertyType: MarketPropertyType
  commune: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  priceUf: number | null
  builtAreaM2: number | null
  totalAreaM2: number | null
  priceUfM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  status: MarketListingStatus
  publishedAt: string | null
  removedAt: string | null
  soldAt: string | null
  dataQuality: {
    completenessPct: number
    hasLocation: boolean
    hasPrice: boolean
    hasArea: boolean
    hasTemporalReference: boolean
    issues: string[]
  }
}

export type MarketSourceDescriptor = {
  file: string
  role: MarketSourceRole
  bytes: number | null
  sha256: string | null
}

export type MarketCanonicalReadiness = {
  scope: {
    commune: string | null
    operation: string | null
    propertyTypes: string[]
  }
  sources: MarketSourceDescriptor[]
  neighborhoods: string[]
  capabilities: {
    publishedOfferAvailable: boolean
    registeredSalesAvailable: boolean
    neighborhoodGeometryAvailable: boolean
    canCalculateOfferKpis: boolean
    canCalculateSalesKpis: boolean
    canCalculateAbsorption: boolean
    canBuildMicroMarkets: boolean
    canBuildComparables: boolean
  }
  blockers: string[]
  methodology: string
}

export type RawMarketRecord = Record<string, unknown>

const FIELD_ALIASES = {
  id: ['id', 'property_id', 'listing_id', 'codigo', 'codigo_propiedad', 'url'],
  commune: ['comuna', 'commune'],
  neighborhood: ['barrio', 'sector', 'neighborhood'],
  latitude: ['latitud', 'latitude', 'lat'],
  longitude: ['longitud', 'longitude', 'lng', 'lon'],
  priceUf: ['precio_uf', 'price_uf', 'uf', 'precio'],
  builtAreaM2: ['superficie_util', 'm2_utiles', 'built_area_m2', 'superficie_construida'],
  totalAreaM2: ['superficie_total', 'm2_totales', 'total_area_m2', 'terreno'],
  bedrooms: ['dormitorios', 'bedrooms', 'habitaciones'],
  bathrooms: ['banos', 'baños', 'bathrooms'],
  parkingSpaces: ['estacionamientos', 'parking', 'parking_spaces'],
  publishedAt: ['fecha_publicacion', 'published_at', 'publication_date'],
  removedAt: ['fecha_retiro', 'removed_at'],
  soldAt: ['fecha_venta', 'sold_at', 'sale_date'],
  status: ['estado', 'status'],
  propertyType: ['tipo_propiedad', 'property_type', 'tipo'],
  operation: ['operacion', 'operation'],
} as const

function normalizedKey(key: string) {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function buildNormalizedRecord(record: RawMarketRecord) {
  return Object.entries(record).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    accumulator[normalizedKey(key)] = value
    return accumulator
  }, {})
}

function readAlias(record: Record<string, unknown>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = record[normalizedKey(alias)]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function asString(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function asDate(value: unknown) {
  const text = asString(value)
  if (!text) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizeOperation(value: unknown): MarketOperation {
  const text = asString(value)?.toLowerCase() ?? ''
  if (text.includes('venta') || text === 'sale') return 'sale'
  if (text.includes('arriendo') || text.includes('renta') || text === 'rent') return 'rent'
  return 'unknown'
}

function normalizePropertyType(value: unknown): MarketPropertyType {
  const text = asString(value)?.toLowerCase() ?? ''
  if (text.includes('casa') || text === 'house') return 'house'
  if (text.includes('depto') || text.includes('departamento') || text === 'apartment') return 'apartment'
  if (text.includes('proyecto')) return 'project'
  return 'other'
}

function normalizeStatus(value: unknown, sourceRole: MarketSourceRole): MarketListingStatus {
  if (sourceRole === 'registered_sales') return 'sold'
  const text = asString(value)?.toLowerCase() ?? ''
  if (text.includes('activ') || text.includes('publicad')) return 'active'
  if (text.includes('retir') || text.includes('bajad') || text.includes('elimin')) return 'removed'
  if (text.includes('vendid') || text === 'sold') return 'sold'
  return sourceRole === 'published_offer' ? 'active' : 'unknown'
}

function stableId(parts: Array<string | number | null>) {
  const source = parts.map((part) => String(part ?? '')).join('|')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `market-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function normalizeMarketRecord(
  rawRecord: RawMarketRecord,
  source: Pick<MarketSourceDescriptor, 'file' | 'role'>,
): CanonicalMarketProperty {
  const record = buildNormalizedRecord(rawRecord)
  const sourceRecordId = asString(readAlias(record, FIELD_ALIASES.id))
  const commune = asString(readAlias(record, FIELD_ALIASES.commune))
  const neighborhood = asString(readAlias(record, FIELD_ALIASES.neighborhood))
  const latitude = asNumber(readAlias(record, FIELD_ALIASES.latitude))
  const longitude = asNumber(readAlias(record, FIELD_ALIASES.longitude))
  const priceUf = asNumber(readAlias(record, FIELD_ALIASES.priceUf))
  const builtAreaM2 = asNumber(readAlias(record, FIELD_ALIASES.builtAreaM2))
  const totalAreaM2 = asNumber(readAlias(record, FIELD_ALIASES.totalAreaM2))
  const bedrooms = asNumber(readAlias(record, FIELD_ALIASES.bedrooms))
  const bathrooms = asNumber(readAlias(record, FIELD_ALIASES.bathrooms))
  const parkingSpaces = asNumber(readAlias(record, FIELD_ALIASES.parkingSpaces))
  const publishedAt = asDate(readAlias(record, FIELD_ALIASES.publishedAt))
  const removedAt = asDate(readAlias(record, FIELD_ALIASES.removedAt))
  const soldAt = asDate(readAlias(record, FIELD_ALIASES.soldAt))
  const operation = normalizeOperation(readAlias(record, FIELD_ALIASES.operation))
  const propertyType = normalizePropertyType(readAlias(record, FIELD_ALIASES.propertyType))
  const status = normalizeStatus(readAlias(record, FIELD_ALIASES.status), source.role)
  const referenceArea = builtAreaM2 ?? totalAreaM2
  const priceUfM2 = priceUf !== null && referenceArea !== null && referenceArea > 0
    ? Number((priceUf / referenceArea).toFixed(2))
    : null

  const issues: string[] = []
  if (!commune) issues.push('missing_commune')
  if (!neighborhood) issues.push('missing_neighborhood')
  if (priceUf === null) issues.push('missing_price_uf')
  if (referenceArea === null) issues.push('missing_area')
  if (latitude === null || longitude === null) issues.push('missing_coordinates')
  if (!publishedAt && !soldAt && !removedAt) issues.push('missing_temporal_reference')

  const qualityChecks = [
    commune !== null,
    neighborhood !== null,
    priceUf !== null,
    referenceArea !== null,
    latitude !== null && longitude !== null,
    publishedAt !== null || soldAt !== null || removedAt !== null,
  ]
  const completenessPct = Number(((qualityChecks.filter(Boolean).length / qualityChecks.length) * 100).toFixed(1))

  return {
    canonicalId: stableId([
      source.file,
      sourceRecordId,
      commune,
      neighborhood,
      latitude,
      longitude,
      priceUf,
      referenceArea,
    ]),
    sourceRecordId,
    sourceFile: source.file,
    sourceRole: source.role,
    sourceUpdatedAt: null,
    operation,
    propertyType,
    commune,
    neighborhood,
    latitude,
    longitude,
    priceUf,
    builtAreaM2,
    totalAreaM2,
    priceUfM2,
    bedrooms,
    bathrooms,
    parkingSpaces,
    status,
    publishedAt,
    removedAt,
    soldAt,
    dataQuality: {
      completenessPct,
      hasLocation: latitude !== null && longitude !== null,
      hasPrice: priceUf !== null,
      hasArea: referenceArea !== null,
      hasTemporalReference: publishedAt !== null || soldAt !== null || removedAt !== null,
      issues,
    },
  }
}

export function getMarketCanonicalReadiness(): MarketCanonicalReadiness {
  const data = marketSourceData as unknown as {
    scope?: { commune?: string; operation?: string; propertyTypes?: string[] }
    sourceInventory?: { files?: Array<{ file?: string; role?: string; bytes?: number; sha256?: string }> }
    kml?: { placemarks?: Array<{ name?: string }> }
  }

  const sources: MarketSourceDescriptor[] = (data.sourceInventory?.files ?? []).map((file) => ({
    file: file.file ?? 'unknown',
    role: file.role === 'published_offer' || file.role === 'registered_sales' || file.role === 'neighborhood_geometry'
      ? file.role
      : 'unknown',
    bytes: file.bytes ?? null,
    sha256: file.sha256 ?? null,
  }))

  const neighborhoods = (data.kml?.placemarks ?? [])
    .map((placemark) => placemark.name)
    .filter((name): name is string => Boolean(name))

  const publishedOfferAvailable = sources.some((source) => source.role === 'published_offer')
  const registeredSalesAvailable = sources.some((source) => source.role === 'registered_sales')
  const neighborhoodGeometryAvailable = sources.some((source) => source.role === 'neighborhood_geometry') && neighborhoods.length > 0

  const blockers: string[] = []
  if (!publishedOfferAvailable) blockers.push('missing_published_offer_source')
  if (!registeredSalesAvailable) blockers.push('missing_registered_sales_source')
  if (!neighborhoodGeometryAvailable) blockers.push('missing_neighborhood_geometry')
  blockers.push('raw_rows_not_materialized_in_canonical_dataset')
  blockers.push('record_level_temporal_fields_not_yet_validated')

  return {
    scope: {
      commune: data.scope?.commune ?? null,
      operation: data.scope?.operation ?? null,
      propertyTypes: data.scope?.propertyTypes ?? [],
    },
    sources,
    neighborhoods,
    capabilities: {
      publishedOfferAvailable,
      registeredSalesAvailable,
      neighborhoodGeometryAvailable,
      canCalculateOfferKpis: publishedOfferAvailable,
      canCalculateSalesKpis: registeredSalesAvailable,
      canCalculateAbsorption: publishedOfferAvailable && registeredSalesAvailable,
      canBuildMicroMarkets: neighborhoodGeometryAvailable,
      canBuildComparables: publishedOfferAvailable && registeredSalesAvailable && neighborhoodGeometryAvailable,
    },
    blockers,
    methodology: 'Readiness evaluates source availability only. Quantitative claims remain disabled until record-level rows are normalized, deduplicated, assigned to compatible periods and validated against canonical field definitions.',
  }
}
