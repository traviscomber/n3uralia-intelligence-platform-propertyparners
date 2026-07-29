import { createHash } from 'node:crypto'

export type MarketPropertyInput = {
  propertyType?: string | null
  address?: string | null
  streetName?: string | null
  streetNumber?: string | number | null
  unitNumber?: string | number | null
  rol?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  landAreaM2?: string | number | null
  builtAreaM2?: string | number | null
  usefulAreaM2?: string | number | null
  bedrooms?: string | number | null
  bathrooms?: string | number | null
  parkingSpaces?: string | number | null
  constructionYear?: string | number | null
}

export type NormalizedMarketProperty = {
  canonicalKey: string
  propertyType: 'Casa' | 'Departamento' | 'Proyecto' | 'Otro'
  normalizedAddress: string | null
  streetName: string | null
  streetNumber: string | null
  unitNumber: string | null
  rol: string | null
  latitude: number | null
  longitude: number | null
  landAreaM2: number | null
  builtAreaM2: number | null
  usefulAreaM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  constructionYear: number | null
  identityStatus: 'candidate' | 'needs_review'
  identityConfidence: number
  identityEvidence: string[]
}

function text(value: unknown) {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return normalized || null
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function integer(value: unknown) {
  const parsed = numeric(value)
  return parsed === null ? null : Math.round(parsed)
}

function propertyType(value: unknown): NormalizedMarketProperty['propertyType'] {
  const normalized = text(value)
  if (normalized?.includes('casa')) return 'Casa'
  if (normalized?.includes('depart')) return 'Departamento'
  if (normalized?.includes('proyecto')) return 'Proyecto'
  return 'Otro'
}

function normalizedRol(value: unknown) {
  const normalized = String(value ?? '').replace(/[^0-9kK-]/g, '').toUpperCase()
  return normalized || null
}

function roundedCoordinate(value: unknown) {
  const parsed = numeric(value)
  return parsed === null ? null : Number(parsed.toFixed(5))
}

function stableHash(parts: Array<string | number | null>) {
  return createHash('sha256').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex')
}

export function normalizeMarketProperty(input: MarketPropertyInput): NormalizedMarketProperty {
  const normalizedAddress = text(input.address)
  const streetName = text(input.streetName)
  const streetNumber = text(input.streetNumber)
  const unitNumber = text(input.unitNumber)
  const rol = normalizedRol(input.rol)
  const latitude = roundedCoordinate(input.latitude)
  const longitude = roundedCoordinate(input.longitude)
  const type = propertyType(input.propertyType)
  const evidence: string[] = []

  if (rol) evidence.push('rol')
  if (normalizedAddress || (streetName && streetNumber)) evidence.push('address')
  if (latitude !== null && longitude !== null) evidence.push('coordinates')
  if (unitNumber) evidence.push('unit')

  const addressKey = normalizedAddress ?? [streetName, streetNumber, unitNumber].filter(Boolean).join(' ') || null
  const canonicalParts: Array<string | number | null> = rol
    ? ['rol', rol, unitNumber]
    : latitude !== null && longitude !== null
      ? ['geo', type, latitude, longitude, unitNumber]
      : ['address', type, addressKey, unitNumber]

  const identityConfidence = rol ? 0.9 : latitude !== null && longitude !== null ? 0.75 : addressKey ? 0.55 : 0.2

  return {
    canonicalKey: stableHash(canonicalParts),
    propertyType: type,
    normalizedAddress: normalizedAddress ?? addressKey,
    streetName,
    streetNumber,
    unitNumber,
    rol,
    latitude,
    longitude,
    landAreaM2: numeric(input.landAreaM2),
    builtAreaM2: numeric(input.builtAreaM2),
    usefulAreaM2: numeric(input.usefulAreaM2),
    bedrooms: integer(input.bedrooms),
    bathrooms: integer(input.bathrooms),
    parkingSpaces: integer(input.parkingSpaces),
    constructionYear: integer(input.constructionYear),
    identityStatus: identityConfidence >= 0.55 ? 'candidate' : 'needs_review',
    identityConfidence,
    identityEvidence: evidence,
  }
}

export function scorePropertyMatch(left: NormalizedMarketProperty, right: NormalizedMarketProperty) {
  const evidence: string[] = []
  const contradictions: string[] = []
  let score = 0

  if (left.rol && right.rol) {
    if (left.rol === right.rol) { score += 0.55; evidence.push('same_rol') }
    else contradictions.push('different_rol')
  }
  if (left.normalizedAddress && right.normalizedAddress) {
    if (left.normalizedAddress === right.normalizedAddress) { score += 0.2; evidence.push('same_address') }
  }
  if (left.latitude !== null && left.longitude !== null && right.latitude !== null && right.longitude !== null) {
    const distance = Math.hypot(left.latitude - right.latitude, left.longitude - right.longitude)
    if (distance <= 0.0005) { score += 0.15; evidence.push('near_coordinates') }
    else if (distance > 0.01) contradictions.push('distant_coordinates')
  }
  if (left.propertyType === right.propertyType) { score += 0.05; evidence.push('same_property_type') }
  else contradictions.push('different_property_type')
  if (left.unitNumber && right.unitNumber) {
    if (left.unitNumber === right.unitNumber) { score += 0.05; evidence.push('same_unit') }
    else contradictions.push('different_unit')
  }

  const boundedScore = Math.max(0, Math.min(1, score - contradictions.length * 0.1))
  const status = contradictions.includes('different_rol')
    ? 'rejected'
    : boundedScore >= 0.8
      ? 'candidate_high'
      : boundedScore >= 0.55
        ? 'candidate_medium'
        : 'rejected'

  return { score: Number(boundedScore.toFixed(3)), status, evidence, contradictions }
}
