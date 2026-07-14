export const VITACURA_NEIGHBORHOODS = [
  'Vitacura Centro',
  'Lo Castillo',
  'Villa El Dorado',
  'Lo Curro',
  'Santa Maria de Manquehue',
  'Nueva Costanera',
  'Jardin del Este',
  'Las Hualtatas',
  'Las Tranqueras',
  'Luis Pasteur',
  'Juan XXIII',
  'Estadio Manquehue',
] as const

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeNeighborhoodName(value: string | null | undefined) {
  return stripAccents((value || '').trim().toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()
}

export function isVitacuraNeighborhood(value: string | null | undefined) {
  const normalized = normalizeNeighborhoodName(value)
  if (!normalized) return false

  return VITACURA_NEIGHBORHOODS.some((neighborhood) => normalizeNeighborhoodName(neighborhood) === normalized)
}

export function filterVitacuraRows<T extends { neighborhood?: string | null }>(rows: T[]) {
  const filtered = rows.filter((row) => isVitacuraNeighborhood(row.neighborhood))
  return filtered.length ? filtered : rows
}

export function summarizeVitacuraNeighborhoods(rows: Array<{ neighborhood?: string | null }>, limit = 4) {
  return [...new Set(rows.map((row) => row.neighborhood).filter((value): value is string => Boolean(value && value.trim())))]
    .filter(isVitacuraNeighborhood)
    .slice(0, limit)
}
