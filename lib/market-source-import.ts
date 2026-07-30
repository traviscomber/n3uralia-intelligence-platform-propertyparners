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
  const normalized = input.includes(',') && input.includes('.')
    ? input.replace(/\./g, '').replace(',', '.')
    : input.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = number(value)
  return parsed == null ? null : Math.round(parsed)
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

export function normalizePortalListingRows(rows: MarketImportInputRow[]): NormalizedPortalListingRow[] {
  return rows.map((row) => ({
    source_listing_id: text(pick(row, ['source_listing_id', 'listing_id', 'mlc_id', 'id', 'codigo', 'codigo_publicacion'])) || '',
    property_type: text(pick(row, ['property_type', 'tipo_propiedad', 'tipo'])) || '',
    operation: text(pick(row, ['operation', 'operacion', 'tipo_operacion'])) || 'Venta',
    status: text(pick(row, ['status', 'estado'])) || 'active',
    url: text(pick(row, ['url', 'source_url', 'link', 'enlace'])),
    title: text(pick(row, ['title', 'titulo', 'nombre'])),
    address: text(pick(row, ['address', 'direccion', 'ubicacion'])),
    normalized_address: text(pick(row, ['normalized_address', 'direccion_normalizada'])),
    latitude: number(pick(row, ['latitude', 'latitud', 'lat'])),
    longitude: number(pick(row, ['longitude', 'longitud', 'lng', 'lon'])),
    price_clp: number(pick(row, ['price_clp', 'precio_clp', 'precio_pesos'])),
    price_uf: number(pick(row, ['price_uf', 'precio_uf', 'uf'])),
    price_uf_m2: number(pick(row, ['price_uf_m2', 'precio_uf_m2', 'uf_m2'])),
    land_area_m2: number(pick(row, ['land_area_m2', 'superficie_terreno', 'terreno_m2'])),
    built_area_m2: number(pick(row, ['built_area_m2', 'superficie_construida', 'construidos_m2'])),
    useful_area_m2: number(pick(row, ['useful_area_m2', 'superficie_util', 'utiles_m2'])),
    bedrooms: integer(pick(row, ['bedrooms', 'dormitorios', 'habitaciones'])),
    bathrooms: integer(pick(row, ['bathrooms', 'banos'])),
    parking_spaces: integer(pick(row, ['parking_spaces', 'estacionamientos', 'parking'])),
    construction_year: integer(pick(row, ['construction_year', 'ano_construccion', 'year_built'])),
    published_at: isoDateTime(pick(row, ['published_at', 'fecha_publicacion', 'publicado_el'])),
  }))
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
