const UF_ENDPOINT = 'https://mindicador.cl/api/uf'

const cache = new Map<string, number>()

function isoDateKey(value: string | Date) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const direct = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function apiDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-')
  return `${day}-${month}-${year}`
}

function validUfClp(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 10_000 && parsed <= 100_000 ? parsed : null
}

export async function fetchUfClpForDate(value: string | Date): Promise<number | null> {
  const dateKey = isoDateKey(value)
  if (!dateKey) return null
  const cached = cache.get(dateKey)
  if (cached) return cached

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch(`${UF_ENDPOINT}/${apiDate(dateKey)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = await response.json() as { serie?: Array<{ valor?: number }> }
    const valueClp = validUfClp(payload?.serie?.[0]?.valor)
    if (!valueClp) return null
    cache.set(dateKey, valueClp)
    return valueClp
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function normalizeClpToUf(priceClp: number, ufClp: number) {
  const clp = Number(priceClp)
  const uf = validUfClp(ufClp)
  if (!Number.isFinite(clp) || clp <= 0 || !uf) return null
  return clp / uf
}
