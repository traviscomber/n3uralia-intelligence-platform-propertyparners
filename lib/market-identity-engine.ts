import { createHash } from 'node:crypto'

export type MarketIdentityInput = {
  source: 'portal' | 'cbrs' | 'client'
  sourceId: string
  propertyType?: string | null
  address?: string | null
  rol?: string | null
  latitude?: number | null
  longitude?: number | null
  neighborhood?: string | null
  usefulAreaM2?: number | null
  builtAreaM2?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
}

export type MatchEvidence = {
  field: string
  left: string | number | null
  right: string | number | null
  weight: number
  matched: boolean
}

export function normalizeMarketText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(avda?|avenida)\b/g, 'av')
    .replace(/\b(depto|departamento)\b/g, 'dpto')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeRol(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').replace(/[^0-9-]/g, '').trim()
  return normalized || null
}

function roundCoordinate(value: number | null | undefined, decimals = 5): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return value.toFixed(decimals)
}

export function buildCanonicalPropertyKey(input: MarketIdentityInput): string {
  const rol = normalizeRol(input.rol)
  const normalizedAddress = normalizeMarketText(input.address)
  const components = rol
    ? ['rol', rol]
    : [
        'geo-address',
        roundCoordinate(input.latitude),
        roundCoordinate(input.longitude),
        normalizedAddress,
        normalizeMarketText(input.neighborhood),
        normalizeMarketText(input.propertyType),
      ]

  return createHash('sha256').update(components.join('|')).digest('hex')
}

function relativeDifference(left?: number | null, right?: number | null): number | null {
  if (!left || !right) return null
  return Math.abs(left - right) / Math.max(left, right)
}

function coordinateDistanceMeters(left: MarketIdentityInput, right: MarketIdentityInput): number | null {
  if ([left.latitude, left.longitude, right.latitude, right.longitude].some((value) => typeof value !== 'number')) return null
  const lat1 = Number(left.latitude) * Math.PI / 180
  const lat2 = Number(right.latitude) * Math.PI / 180
  const deltaLat = lat2 - lat1
  const deltaLon = (Number(right.longitude) - Number(left.longitude)) * Math.PI / 180
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function scorePropertyMatch(left: MarketIdentityInput, right: MarketIdentityInput) {
  const evidence: MatchEvidence[] = []
  const leftRol = normalizeRol(left.rol)
  const rightRol = normalizeRol(right.rol)

  if (leftRol && rightRol) {
    evidence.push({ field: 'rol', left: leftRol, right: rightRol, weight: 0.5, matched: leftRol === rightRol })
  }

  const leftAddress = normalizeMarketText(left.address)
  const rightAddress = normalizeMarketText(right.address)
  if (leftAddress && rightAddress) {
    evidence.push({ field: 'address', left: leftAddress, right: rightAddress, weight: 0.2, matched: leftAddress === rightAddress })
  }

  const leftNeighborhood = normalizeMarketText(left.neighborhood)
  const rightNeighborhood = normalizeMarketText(right.neighborhood)
  if (leftNeighborhood && rightNeighborhood) {
    evidence.push({ field: 'neighborhood', left: leftNeighborhood, right: rightNeighborhood, weight: 0.15, matched: leftNeighborhood === rightNeighborhood })
  }

  const distance = coordinateDistanceMeters(left, right)
  if (distance !== null) {
    evidence.push({ field: 'distance_m', left: Math.round(distance), right: 25, weight: 0.1, matched: distance <= 25 })
  }

  const leftArea = left.usefulAreaM2 ?? left.builtAreaM2
  const rightArea = right.usefulAreaM2 ?? right.builtAreaM2
  const areaDifference = relativeDifference(leftArea, rightArea)
  if (areaDifference !== null) {
    evidence.push({ field: 'area_difference', left: Number(areaDifference.toFixed(3)), right: 0.08, weight: 0.05, matched: areaDifference <= 0.08 })
  }

  const score = evidence.reduce((sum, item) => sum + (item.matched ? item.weight : 0), 0)
  const contradictions = evidence.filter((item) => !item.matched && item.field === 'rol')
  const neighborhoodConflict = evidence.some((item) => item.field === 'neighborhood' && !item.matched)
  const status = contradictions.length > 0
    ? 'rejected'
    : score >= 0.8 && !neighborhoodConflict
      ? 'candidate_high'
      : score >= 0.5
        ? 'candidate_medium'
        : 'rejected'

  return { score: Number(score.toFixed(3)), status, evidence, contradictions }
}