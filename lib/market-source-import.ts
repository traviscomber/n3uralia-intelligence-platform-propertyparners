import type { MarketImportInputRow } from '@/lib/market-import'

export type PortalDatasetKind = 'portal_apartments' | 'portal_houses' | 'portal_projects'

export type NormalizedPortalListingRow = {
  source_listing_id: string
  property_type: string
  operation: string
  status: string
  url: string | null
  title: string | null
  address: string | null
  normalized_address: string | null
  latitude: number | null
  longitude: number | null
  price_clp: number | null
  price_uf: number | null
  price_uf_m2: number | null
  land_area_m2: number | null
  built_area_m2: number | null
  useful_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  construction_year: number | null
  published_at: string | null
  source_bucket?: string | null
  seller_name?: string | null
  photos_count?: number | null
  photo_urls?: string[]
  raw_price?: unknown
  raw_useful_area?: unknown
  raw_total_area?: unknown
  normalization_flags?: string[]
  canonical_reference?: boolean
  nearby_places?: Array<{
    category: string
    name: string
    walk_minutes: number | null
    distance_m: number | null
  }>
  nearby_place_names?: string[]
}

export type NormalizedCbrsTransactionRow = {
  event_key: string | null
  rol: string | null
  address: string | null
  normalized_address: string | null
  property_type: string | null
  transaction_date: string | null
  price_clp: number | null
  price_uf: number | null
  price_uf_m2: number | null
  description: string | null
  tomo: string | null
  foja: string | null
  numero: string | null
  latitude: number | null
  longitude: number | null
  land_area_m2: number | null
  built_area_m2: number | null
  useful_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function pick(row: MarketImportInputRow, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeKey(key))) return value
  }
  return undefined
}

function text(value: unknown) {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized || null
}

function number(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const input = String(value).trim().replace(/\s+/g, '').replace(/\$/g, '').replace(/UF|CLP/gi, '')
  if (!input) return null
  const thousandsOnly = /^\d{1,3}(?:\.\d{3})+$/.test(input)
  const normalized = thousandsOnly
    ? input.replace(/\./g, '')
    : input.includes(',') && input.includes('.')
      ? input.replace(/\./g, '').replace(',', '.')
      : input.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = number(value)
  return parsed == null ? null : Math.round(parsed)
}

function boundedNumber(value: unknown, min: number, max: number) {
  const parsed = number(value)
  if (parsed == null || parsed < min || parsed > max) return null
  return parsed
}

function isoDate(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  const parts = raw.split(/[\/.\-]/).map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  const [a, b, c] = parts
  const year = a > 31 ? a : c
  const month = a > 31 ? b : b > 12 ? a : b
  const day = a > 31 ? c : b > 12 ? b : a
  const candidate = new Date(Date.UTC(year, month - 1, day))
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString().slice(0, 10)
}

function isoDateTime(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function sourceListingId(row: MarketImportInputRow) {
  const explicit = text(pick(row, ['source_listing_id', 'listing_id', 'mlc_id', 'id', 'codigo', 'codigo_publicacion']))
  if (explicit) return explicit.replace(/^MLC-?/i, '')
  const url = text(pick(row, ['url', 'source_url', 'link', 'enlace']))
  const match = url?.match(/MLC-?(\d+)/i)
  return match?.[1] ?? ''
}

function portalNearbyPlaces(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const name = text(row.name)
    if (!name) return []
    const distance = number(row.distance_m)
    const walk = integer(row.walk_minutes)
    return [{
      category: text(row.category) || 'unknown',
      name,
      walk_minutes: walk != null && walk >= 0 && walk <= 180 ? walk : null,
      distance_m: distance != null && distance > 0 && distance <= 5000 ? Math.round(distance) : null,
    }]
  }).slice(0, 80)
}

function portalPhotos(value: unknown) {
  const raw = text(value)
  if (!raw) return []
  const seen = new Set<string>()
  const output: string[] = []
  for (const candidate of raw.split('|').map((item) => item.trim()).filter(Boolean)) {
    if (!candidate.includes('D_NQ_NP_')) continue
    if (seen.has(candidate)) continue
    seen.add(candidate)
    output.push(candidate)
  }
  return output
}

function canonicalPortalPrice(row: MarketImportInputRow) {
  const explicitUf = number(pick(row, ['price_uf', 'precio_uf', 'uf']))
  const explicitClp = number(pick(row, ['price_clp', 'precio_clp', 'precio_pesos']))
  const raw = pick(row, ['precio', 'price'])
  const generic = number(raw)
  const flags: string[] = []

  if (explicitUf != null || explicitClp != null) return { priceUf: explicitUf, priceClp: explicitClp, raw, flags }
  if (generic == null || generic <= 0) return { priceUf: null, priceClp: null, raw, flags: ['missing_or_invalid_price'] }
  if (generic > 100_000) return { priceUf: null, priceClp: generic, raw, flags: ['price_interpreted_clp_by_magnitude'] }
  return { priceUf: generic, priceClp: null, raw, flags }
}

export function normalizePortalListingRows(rows: MarketImportInputRow[], datasetKind: PortalDatasetKind = 'portal_apartments'): NormalizedPortalListingRow[] {
  return rows.map((row) => {
    const price = canonicalPortalPrice(row)
    const rawUsefulArea = pick(row, ['useful_area_m2', 'superficie_util', 'utiles_m2', 'm2_util', 'm2_util_card'])
    const rawTotalArea = pick(row, ['built_area_m2', 'superficie_construida', 'construidos_m2', 'm2_total'])
    const areaCeiling = datasetKind === 'portal_projects' ? 500 : datasetKind === 'portal_houses' ? 2500 : 1000
    const usefulArea = boundedNumber(rawUsefulArea, 15, areaCeiling)
    const rawBuilt = number(rawTotalArea)
    const builtArea = datasetKind === 'portal_projects'
      ? null
      : rawBuilt != null && rawBuilt >= 15 && rawBuilt <= 2500
        ? rawBuilt
        : null
    const flags = [...price.flags]
    if (number(rawUsefulArea) != null && usefulArea == null) flags.push('useful_area_out_of_range')
    if (datasetKind === 'portal_projects' && rawBuilt != null) flags.push('project_total_area_field_not_trusted')

    const rawLat = number(pick(row, ['latitude', 'latitud', 'lat']))
    const rawLon = number(pick(row, ['longitude', 'longitud', 'lng', 'lon']))
    const latitude = rawLat != null && rawLat > -34 && rawLat < -32 ? rawLat : null
    const longitude = rawLon != null && rawLon > -72 && rawLon < -69 ? rawLon : null
    if (rawLat != null && latitude == null) flags.push('latitude_outside_santiago')
    if (rawLon != null && longitude == null) flags.push('longitude_outside_santiago')

    const url = text(pick(row, ['url', 'source_url', 'link', 'enlace']))
    const explicitType = text(pick(row, ['property_type', 'tipo_propiedad', 'tipo']))
    const propertyType = explicitType || (datasetKind === 'portal_houses' ? 'Casa' : datasetKind === 'portal_projects' ? 'Proyecto' : 'Departamento')
    const photos = portalPhotos(pick(row, ['fotos_urls', 'photo_urls', 'photos']))
    const nearbyPlaces = portalNearbyPlaces(pick(row, ['nearby_places']))
    const nearbyPlaceNames = Array.from(new Set(nearbyPlaces.map((place) => place.name)))

    return {
      source_listing_id: sourceListingId(row),
      property_type: propertyType,
      operation: text(pick(row, ['operation', 'operacion', 'tipo_operacion'])) || 'Venta',
      status: text(pick(row, ['status', 'estado'])) || 'active',
      url,
      title: text(pick(row, ['title', 'titulo', 'nombre'])),
      address: text(pick(row, ['address', 'direccion', 'ubicacion'])),
      normalized_address: text(pick(row, ['normalized_address', 'direccion_normalizada'])),
      latitude,
      longitude,
      price_clp: price.priceClp,
      price_uf: price.priceUf,
      price_uf_m2: price.priceUf != null && usefulArea != null && usefulArea > 0 ? price.priceUf / usefulArea : number(pick(row, ['price_uf_m2', 'precio_uf_m2', 'uf_m2'])),
      land_area_m2: number(pick(row, ['land_area_m2', 'superficie_terreno', 'terreno_m2'])),
      built_area_m2: builtArea,
      useful_area_m2: usefulArea,
      bedrooms: integer(pick(row, ['bedrooms', 'dormitorios', 'habitaciones', 'dorm', 'dorm_card'])),
      bathrooms: integer(pick(row, ['bathrooms', 'banos', 'banos_card'])),
      parking_spaces: integer(pick(row, ['parking_spaces', 'estacionamientos', 'parking'])),
      construction_year: integer(pick(row, ['construction_year', 'ano_construccion', 'year_built'])),
      published_at: isoDateTime(pick(row, ['published_at', 'fecha_publicacion', 'publicado_el'])),
      source_bucket: text(pick(row, ['bucket'])),
      seller_name: text(pick(row, ['seller_name', 'seller', 'vendedor'])),
      photos_count: integer(pick(row, ['fotos_count', 'photos_count'])),
      photo_urls: photos,
      raw_price: price.raw,
      raw_useful_area: rawUsefulArea,
      raw_total_area: rawTotalArea,
      normalization_flags: flags,
      canonical_reference: false,
      nearby_places: nearbyPlaces,
      nearby_place_names: nearbyPlaceNames,
    }
  })
}

export function normalizeCbrsTransactionRows(rows: MarketImportInputRow[]): NormalizedCbrsTransactionRow[] {
  return rows.map((row) => ({
    event_key: text(pick(row, ['event_key', 'transaction_id', 'id_transaccion', 'id'])),
    rol: text(pick(row, ['rol', 'property_rol', 'rol_propiedad', 'rol_avaluo'])),
    address: text(pick(row, ['address', 'direccion', 'ubicacion'])),
    normalized_address: text(pick(row, ['normalized_address', 'direccion_normalizada'])),
    property_type: text(pick(row, ['property_type', 'tipo_propiedad', 'tipo'])),
    transaction_date: isoDate(pick(row, ['transaction_date', 'fecha_compraventa', 'fecha_venta', 'fecha'])),
    price_clp: number(pick(row, ['price_clp', 'precio_clp', 'precio_pesos', 'monto_clp'])),
    price_uf: number(pick(row, ['price_uf', 'precio_uf', 'monto_uf', 'uf'])),
    price_uf_m2: number(pick(row, ['price_uf_m2', 'precio_uf_m2', 'uf_m2'])),
    description: text(pick(row, ['description', 'descripcion', 'observaciones'])),
    tomo: text(pick(row, ['tomo'])),
    foja: text(pick(row, ['foja', 'fojas'])),
    numero: text(pick(row, ['numero', 'inscription_number', 'numero_inscripcion'])),
    latitude: number(pick(row, ['latitude', 'latitud', 'lat'])),
    longitude: number(pick(row, ['longitude', 'longitud', 'lng', 'lon'])),
    land_area_m2: number(pick(row, ['land_area_m2', 'superficie_terreno', 'terreno_m2'])),
    built_area_m2: number(pick(row, ['built_area_m2', 'superficie_construida', 'construidos_m2'])),
    useful_area_m2: number(pick(row, ['useful_area_m2', 'superficie_util', 'utiles_m2'])),
    bedrooms: integer(pick(row, ['bedrooms', 'dormitorios', 'habitaciones'])),
    bathrooms: integer(pick(row, ['bathrooms', 'banos'])),
    parking_spaces: integer(pick(row, ['parking_spaces', 'estacionamientos', 'parking'])),
  }))
}
