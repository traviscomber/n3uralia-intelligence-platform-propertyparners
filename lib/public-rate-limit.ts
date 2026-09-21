// Rate limiting en memoria para APIs públicas (auditoría 2026-09-21).
//
// Límite por IP con ventana deslizante, sin dependencias externas.
// NOTA: es por instancia de servidor. En Vercel serverless con múltiples
// instancias el límite efectivo se multiplica por el número de instancias
// activas. Para un límite global estricto, migrar a Upstash Ratelimit.
// Para la API pública de valorización (una estimación es acción humana
// deliberada), 30 solicitudes/minuto por IP es holgado y bloquea abuso
// de costo contra el service role de Supabase.

type Bucket = {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 30
const MAX_TRACKED_BUCKETS = 10_000

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
  const now = Date.now()
  sweepExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  bucket.count += 1
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true }
}
