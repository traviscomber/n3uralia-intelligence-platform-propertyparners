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

async function callEndpoint(request: Request, path: string, init?: RequestInit) {
  const baseUrl = new URL(request.url)
  const endpoint = new URL(path, baseUrl)
  const response = await fetch(endpoint, init)
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [scrapeResult, benchmarkResult] = await Promise.all([
      callEndpoint(request, '/api/scrape/portal-inmobiliario?source=all', { method: 'POST' }),
      callEndpoint(request, '/api/benchmarks/realtor'),
    ])
    const marketResult = await callEndpoint(request, '/api/market/insights')

    return NextResponse.json({
      success: true,
      refreshedAt: new Date().toISOString(),
      sources: {
        scrape: scrapeResult,
        benchmark: benchmarkResult,
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
