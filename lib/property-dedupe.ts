export type PropertyLike = {
  id?: string
  address: string
  neighborhood: string | null
  property_type: string | null
  description: string | null
  price_uf: number | null
  area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  lat: number | null
  lng: number | null
  source: string | null
  source_url: string | null
  image_url: string | null
  listing_number: string | null
  tags: string[] | null
  source_listing_id: string | null
  external_id?: string | null
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCompact(value: string) {
  return normalizeText(value).replace(/\s+/g, '')
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function jaccard(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

function toNumber(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? Number(value) : null
}

function haversineMeters(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null,
) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const toRad = (n: number) => (n * Math.PI) / 180
  const r = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function derivePropertyType(row: Pick<PropertyLike, 'address' | 'property_type' | 'source'>) {
  const explicit = normalizeText(row.property_type || '')
  if (explicit.includes('casa')) return 'casa'
  if (explicit.includes('depart')) return 'departamento'

  const source = normalizeText(row.source || '')
  if (source.includes('house')) return 'casa'
  if (source.includes('depart') || source.includes('dept')) return 'departamento'

  const address = normalizeText(row.address || '')
  if (address.includes('casa') || address.includes('casona')) return 'casa'
  if (address.includes('depart') || address.includes('dpto') || address.includes('depto')) return 'departamento'

  return null
}

function scoreCompleteness(row: PropertyLike) {
  return [
    row.source_url ? 1 : 0,
    row.image_url ? 1 : 0,
    row.description ? 1 : 0,
    row.listing_number ? 1 : 0,
    row.source_listing_id ? 1 : 0,
    row.tags?.length ? 1 : 0,
    row.property_type ? 1 : 0,
    row.lat != null && row.lng != null ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
}

export function buildPropertyDedupSignature(row: PropertyLike) {
  const type = derivePropertyType(row) || normalizeText(row.property_type || '')
  const address = normalizeCompact(row.address)
  const neighborhood = normalizeCompact(row.neighborhood || '')
  const priceBucket = Math.round((toNumber(row.price_uf) || 0) / 25) * 25
  const areaBucket = Math.round((toNumber(row.area_m2) || 0) / 5) * 5
  return [type, neighborhood, address, priceBucket, areaBucket, row.bedrooms ?? '', row.bathrooms ?? ''].join('|')
}

export function isLikelyDuplicate(a: PropertyLike, b: PropertyLike) {
  const typeA = derivePropertyType(a)
  const typeB = derivePropertyType(b)
  const addressA = normalizeCompact(a.address)
  const addressB = normalizeCompact(b.address)
  const neighborhoodA = normalizeCompact(a.neighborhood || '')
  const neighborhoodB = normalizeCompact(b.neighborhood || '')

  if (!addressA || !addressB) return false

  if (a.external_id && b.external_id && a.external_id === b.external_id) return true
  if (a.source_listing_id && b.source_listing_id && a.source_listing_id === b.source_listing_id) return true
  if (a.listing_number && b.listing_number && a.listing_number === b.listing_number) return true
  if (a.source_url && b.source_url && a.source_url === b.source_url) return true

  const sameAddress = addressA === addressB
  const addressTokens = jaccard(tokenize(a.address), tokenize(b.address))
  const neighborhoodTokens = neighborhoodA === neighborhoodB || jaccard(tokenize(a.neighborhood || ''), tokenize(b.neighborhood || '')) >= 0.8
  const sameType = !typeA || !typeB || typeA === typeB
  const priceA = toNumber(a.price_uf)
  const priceB = toNumber(b.price_uf)
  const areaA = toNumber(a.area_m2)
  const areaB = toNumber(b.area_m2)
  const priceDiff = priceA && priceB ? Math.abs(priceA - priceB) / Math.max(priceA, priceB) : null
  const areaDiff = areaA && areaB ? Math.abs(areaA - areaB) / Math.max(areaA, areaB) : null
  const geoDistance = haversineMeters(a.lat, a.lng, b.lat, b.lng)

  if (sameAddress && neighborhoodTokens && sameType) return true
  if (geoDistance != null && geoDistance <= 45 && sameType && (priceDiff == null || priceDiff <= 0.08) && (areaDiff == null || areaDiff <= 0.12)) {
    return true
  }
  if (addressTokens >= 0.82 && neighborhoodTokens && sameType) return true
  if (addressTokens >= 0.9 && (priceDiff == null || priceDiff <= 0.05) && (areaDiff == null || areaDiff <= 0.08)) return true

  return false
}

export function findBestDuplicateMatch<T extends PropertyLike>(rows: T[], candidate: PropertyLike) {
  let best: { row: T; score: number } | null = null

  for (const row of rows) {
    if (!isLikelyDuplicate(row, candidate)) continue

    let score = 0
    if (row.external_id && candidate.external_id && row.external_id === candidate.external_id) score += 100
    if (row.source_listing_id && candidate.source_listing_id && row.source_listing_id === candidate.source_listing_id) score += 100
    if (row.listing_number && candidate.listing_number && row.listing_number === candidate.listing_number) score += 95
    if (normalizeCompact(row.address) === normalizeCompact(candidate.address)) score += 60
    if (normalizeCompact(row.neighborhood || '') === normalizeCompact(candidate.neighborhood || '')) score += 10
    if ((row.property_type || '') === (candidate.property_type || '')) score += 10
    if (row.source_url && candidate.source_url && row.source_url === candidate.source_url) score += 30
    if (row.lat != null && row.lng != null && candidate.lat != null && candidate.lng != null) {
      const distance = haversineMeters(row.lat, row.lng, candidate.lat, candidate.lng)
      if (distance != null && distance <= 30) score += 20
    }
    if (score > 0 && (!best || score > best.score || (score === best.score && scoreCompleteness(row) < scoreCompleteness(best.row)))) {
      best = { row, score }
    }
  }

  return best
}

export function mergePropertyRecord<T extends PropertyLike>(existing: T, incoming: PropertyLike): T {
  const mergedTags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])].filter(Boolean)))

  return {
    ...existing,
    address: incoming.address || existing.address,
    neighborhood: incoming.neighborhood || existing.neighborhood,
    property_type: incoming.property_type || existing.property_type,
    description: incoming.description || existing.description,
    price_uf: incoming.price_uf ?? existing.price_uf,
    area_m2: incoming.area_m2 ?? existing.area_m2,
    bedrooms: incoming.bedrooms ?? existing.bedrooms,
    bathrooms: incoming.bathrooms ?? existing.bathrooms,
    lat: incoming.lat ?? existing.lat,
    lng: incoming.lng ?? existing.lng,
    source: incoming.source || existing.source,
    source_url: incoming.source_url || existing.source_url,
    image_url: incoming.image_url || existing.image_url,
    listing_number: incoming.listing_number || existing.listing_number,
    source_listing_id: incoming.source_listing_id || existing.source_listing_id,
    external_id: incoming.external_id || existing.external_id,
    tags: mergedTags.length ? mergedTags : existing.tags,
  }
}
