// Rate limiting en memoria para APIs públicas (auditoría 2026-09-21).
//
// Límite por IP con ventana fija, sin dependencias externas.
// NOTA: es por instancia de servidor. En Vercel serverless con múltiples
// instancias el límite efectivo se multiplica por el número de instancias
// activas. Para un límite global estricto, migrar a Upstash Ratelimit.
//
// Configuración por entorno (ver .env.example):
// - PUBLIC_RATE_LIMIT_MAX_PER_MINUTE: default 30. Durante UAT se puede
//   subir (p. ej. 600) sin tocar código.
// - PUBLIC_RATE_LIMIT_DISABLED=true: desactiva el límite. Sólo para
//   ambientes de prueba; nunca en producción.

const WINDOW_MS = 60_000
const MAX_TRACKED_BUCKETS = 10_000

function maxRequestsPerWindow(): number {
  const raw = process.env.PUBLIC_RATE_LIMIT_MAX_PER_MINUTE
  if (raw === undefined || raw === '') return 30
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 30
}

export function isPublicRateLimitDisabled(): boolean {
  return process.env.PUBLIC_RATE_LIMIT_DISABLED === 'true'
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function sweepExpired(now: number) {
  if (buckets.size < MAX_TRACKED_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

export function checkPublicRateLimit(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  if (isPublicRateLimitDisabled()) return { ok: true }

  const maxRequests = maxRequestsPerWindow()
  const now = Date.now()
  sweepExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  bucket.count += 1
  if (bucket.count > maxRequests) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true }
}
