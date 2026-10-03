import type { MarketImportInputRow } from '@/lib/market-import'
import { getMercadoLibreAccessToken } from '@/lib/mercadolibre-oauth'

const MELI_API = 'https://api.mercadolibre.com'
const SITE_ID = 'MLC'

// Deliberately a bounding box around the Vitacura commune only.
// Search results are also post-filtered to explicit Vitacura location text
// before they are ever eligible for canonical ingestion.
export const VITACURA_BBOX = {
  south: -33.43,
  north: -33.33,
  west: -70.63,
  east: -70.49,
} as const

type MeliCategory = {
  id: string
  name: string
  children_categories?: Array<{ id: string; name: string; total_items_in_this_category?: number }>
}

type MeliSearchItem = {
  id?: string
  title?: string
  price?: number
  currency_id?: string
  permalink?: string
  category_id?: string
  condition?: string
  address?: {
    state_name?: string
    city_name?: string
  }
  location?: {
    address_line?: string
    zip_code?: string
    neighborhood?: { id?: string; name?: string }
    city?: { id?: string; name?: string }
    state?: { id?: string; name?: string }
    latitude?: number
    longitude?: number
  }
}

type MeliSearchResponse = {
  site_id?: string
  paging?: {
    total?: number
    primary_results?: number
    offset?: number
    limit?: number
  }
  results?: MeliSearchItem[]
}

export type VitacuraPropertyType = 'houses' | 'apartments'

export type VitacuraSearchOptions = {
  propertyType: VitacuraPropertyType
  limit?: number
  offset?: number
  minPrice?: number
  maxPrice?: number
}

async function meliGet<T>(path: string) {
  const token = await getMercadoLibreAccessToken()
  const response = await fetch(`${MELI_API}${path}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  const body = await response.text()
  let parsed: unknown = null
  try { parsed = JSON.parse(body) } catch { /* keep raw error below */ }

  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'message' in parsed
      ? String((parsed as { message?: unknown }).message ?? '')
      : body.slice(0, 240)
    throw new Error(`MERCADOLIBRE_HTTP_${response.status}:${message}`)
  }

  return parsed as T
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function findChildByName(parentId: string, expectedName: string) {
  const category = await meliGet<MeliCategory>(`/categories/${encodeURIComponent(parentId)}`)
  const expected = normalizeName(expectedName)
  const child = (category.children_categories ?? []).find((item) => normalizeName(item.name) === expected)
  if (!child) {
    throw new Error(`MERCADOLIBRE_CATEGORY_NOT_FOUND:${parentId}:${expectedName}`)
  }
  return child.id
}

export async function resolveVitacuraSaleCategory(propertyType: VitacuraPropertyType) {
  const siteCategories = await meliGet<Array<{ id: string; name: string }>>(`/sites/${SITE_ID}/categories`)
  const realEstate = siteCategories.find((item) => normalizeName(item.name) === 'inmuebles')
  if (!realEstate) throw new Error('MERCADOLIBRE_REAL_ESTATE_CATEGORY_NOT_FOUND')

  const parentName = propertyType === 'houses' ? 'Casas' : 'Departamentos'
  const propertyCategoryId = await findChildByName(realEstate.id, parentName)
  const saleCategoryId = await findChildByName(propertyCategoryId, 'Venta')

  return {
    siteId: SITE_ID,
    realEstateCategoryId: realEstate.id,
    propertyType,
    propertyCategoryId,
    saleCategoryId,
  }
}

export function buildVitacuraSearchUrl(args: {
  categoryId: string
  limit: number
  offset: number
  minPrice?: number
  maxPrice?: number
}) {
  const params = new URLSearchParams()
  params.set('category', args.categoryId)
  params.set(
    'item_location',
    `lat:${VITACURA_BBOX.south}_${VITACURA_BBOX.north},lon:${VITACURA_BBOX.west}_${VITACURA_BBOX.east}`,
  )
  params.set('limit', String(args.limit))
  params.set('offset', String(args.offset))
  params.set('sort', 'price_asc')
  if (args.minPrice != null || args.maxPrice != null) {
    const min = args.minPrice ?? 0
    const max = args.maxPrice ?? 999_999_999
    params.set('price', `${min}-${max}`)
  }
  return `/sites/${SITE_ID}/search?${params.toString()}`
}

function explicitVitacura(item: MeliSearchItem) {
  // Fail closed: Avenida Vitacura also crosses neighboring communes, so
  // address-line/neighborhood text is not sufficient evidence of commune.
  const cityNames = [
    item.address?.city_name,
    item.location?.city?.name,
  ]
    .filter(Boolean)
    .map((value) => normalizeName(String(value)))

  return cityNames.some((value) => value === 'vitacura')
}

function toMarketRow(item: MeliSearchItem, propertyType: VitacuraPropertyType): MarketImportInputRow | null {
  if (!item.id || !explicitVitacura(item)) return null
  const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null
  const currency = item.currency_id?.toUpperCase() ?? null
  const url = item.permalink || `https://www.portalinmobiliario.com/${item.id}`

  return {
    source_listing_id: item.id.replace(/^MLC/i, ''),
    property_type: propertyType === 'houses' ? 'Casa' : 'Departamento',
    operation: 'Venta',
    status: 'active',
    url,
    title: item.title ?? null,
    address: item.location?.address_line ?? null,
    normalized_address: item.location?.address_line
      ? normalizeName(item.location.address_line)
      : null,
    latitude: item.location?.latitude ?? null,
    longitude: item.location?.longitude ?? null,
    price_clp: currency === 'CLP' ? price : null,
    price_uf: currency === 'UF' ? price : null,
    price_uf_m2: null,
    land_area_m2: null,
    built_area_m2: null,
    useful_area_m2: null,
    bedrooms: null,
    bathrooms: null,
    parking_spaces: null,
    construction_year: null,
    published_at: null,
  }
}

export async function searchVitacuraSales(options: VitacuraSearchOptions) {
  const limit = Math.min(Math.max(Math.round(options.limit ?? 10), 1), 50)
  const offset = Math.max(Math.round(options.offset ?? 0), 0)
  const categories = await resolveVitacuraSaleCategory(options.propertyType)
  const path = buildVitacuraSearchUrl({
    categoryId: categories.saleCategoryId,
    limit,
    offset,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
  })

  const response = await meliGet<MeliSearchResponse>(path)
  const rawItems = response.results ?? []
  const vitacuraItems = rawItems.filter(explicitVitacura)
  const rows = vitacuraItems
    .map((item) => toMarketRow(item, options.propertyType))
    .filter((row): row is MarketImportInputRow => Boolean(row))

  return {
    categories,
    query: {
      siteId: SITE_ID,
      propertyType: options.propertyType,
      bbox: VITACURA_BBOX,
      limit,
      offset,
      minPrice: options.minPrice ?? null,
      maxPrice: options.maxPrice ?? null,
      path,
    },
    paging: response.paging ?? null,
    rawCount: rawItems.length,
    vitacuraCount: vitacuraItems.length,
    excludedOutsideVitacura: rawItems.length - vitacuraItems.length,
    items: vitacuraItems,
    rows,
  }
}
