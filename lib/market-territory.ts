export type CanonicalMarketGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: unknown[]
}

function isFinitePosition(value: unknown): boolean {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1])
}

function hasFinitePosition(value: unknown): boolean {
  if (isFinitePosition(value)) return true
  return Array.isArray(value) && value.some(hasFinitePosition)
}

export function normalizeCanonicalMarketGeometry(value: unknown): CanonicalMarketGeometry | null {
  if (!value || typeof value !== 'object') return null

  const geometry = value as { type?: unknown; coordinates?: unknown }
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null
  if (!Array.isArray(geometry.coordinates) || !hasFinitePosition(geometry.coordinates)) return null

  return {
    type: geometry.type,
    coordinates: geometry.coordinates,
  }
}
