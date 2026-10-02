import { NextResponse } from 'next/server'
import { getMercadoLibreAccessToken } from '@/lib/mercadolibre-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function check(path: string, token: string) {
  const response = await fetch(`https://api.mercadolibre.com${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const text = await response.text()
  let parsed: unknown = null
  try { parsed = JSON.parse(text) } catch {}
  const body = parsed && typeof parsed === 'object'
    ? parsed as Record<string, unknown>
    : { raw: text.slice(0, 200) }
  return {
    path,
    status: response.status,
    ok: response.ok,
    code: typeof body.code === 'string' ? body.code : null,
    error: typeof body.error === 'string' ? body.error : null,
    message: typeof body.message === 'string' ? body.message : null,
    blockedBy: typeof body.blocked_by === 'string' ? body.blocked_by : null,
    id: typeof body.id === 'number' || typeof body.id === 'string' ? body.id : null,
    siteId: typeof body.site_id === 'string' ? body.site_id : null,
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ ok: false, error: 'PREVIEW_ONLY' }, { status: 404 })
  }
  const token = await getMercadoLibreAccessToken()
  const results = []
  for (const path of ['/users/me', '/applications/6348448994811377', '/sites/MLC/categories']) {
    results.push(await check(path, token))
  }
  return NextResponse.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } })
}
