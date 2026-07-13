import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  if (!secret) return true

  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('secret')
  return headerSecret === secret || querySecret === secret
}

async function callEndpoint(request: Request, path: string, init?: RequestInit, timeoutMs = 45000) {
  const baseUrl = new URL(request.url)
  const endpoint = new URL(path, baseUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error(`Timeout calling ${path}`)), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      ...init,
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, payload }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [scrapeResult, realtorBenchmarkResult, portalBenchmarkResult] = await Promise.all([
      callEndpoint(request, '/api/scrape/portal-inmobiliario?source=houses', { method: 'POST' }, 180000),
      callEndpoint(request, '/api/benchmarks/realtor', undefined, 30000),
      callEndpoint(request, '/api/benchmarks/portal-inmobiliario', undefined, 30000),
    ])
    const marketResult = await callEndpoint(request, '/api/market/insights', undefined, 30000)

    return NextResponse.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      sources: {
        scrape: scrapeResult,
        benchmark: realtorBenchmarkResult,
        benchmarkPortal: portalBenchmarkResult,
        market: marketResult,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos refrescar las fuentes.' },
      { status: 500 },
    )
  }
}
