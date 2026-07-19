import { NextResponse } from 'next/server'
import { validateScraperAccess } from '@/lib/scrapers/route-auth'

export const runtime = 'nodejs'

function getBaseUrl(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function callRoute(baseUrl: string, path: string, payload: Record<string, unknown>, token: string | null) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-internal-key': token } : {}),
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const detail = typeof data === 'object' && data && 'error' in data ? String((data as { error?: string }).error || '') : text.slice(0, 200)
    throw new Error(`${path} returned ${response.status}: ${detail}`)
  }

  return data as Record<string, unknown>
}

export async function POST(request: Request) {
  const authResponse = validateScraperAccess(request)
  if (authResponse) return authResponse

  const baseUrl = getBaseUrl(request)
  const token = request.headers.get('x-internal-key')
  const body = await request.json().catch(() => ({})) as { source?: 'all' | 'portal' | 'datainmobiliaria'; kind?: 'houses' | 'departments' | 'all'; limit?: number }
  const source = body.source || 'all'
  const limit = body.limit ?? 60
  const kind = body.kind || 'all'
  const startedAt = new Date().toISOString()

  const runs: Array<Record<string, unknown>> = []

  try {
    if (source === 'all' || source === 'portal') {
      const portal = await callRoute(baseUrl, '/api/scrape/portal-inmobiliario', { source: 'all', kind, limit }, token)
      runs.push({ source: 'portal_inmobiliario', ...portal })
    }

    if (source === 'all' || source === 'datainmobiliaria') {
      const dataInmobiliaria = await callRoute(baseUrl, '/api/scrape/datainmobiliaria', { source: 'vitacura', kind, limit }, token)
      runs.push({ source: 'datainmobiliaria', ...dataInmobiliaria })
    }

    const dedupe = await callRoute(baseUrl, '/api/maintenance/dedupe-properties', {}, token)

    return NextResponse.json({
      success: true,
      source: 'vitacura',
      focus: 'Vitacura sales only',
      runs,
      dedupe,
      startedAt,
      finishedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vitacura scrape failed'
    return NextResponse.json({ error: message, source: 'vitacura' }, { status: 500 })
  }
}
