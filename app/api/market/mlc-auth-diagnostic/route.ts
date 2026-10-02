import { NextResponse } from 'next/server'
import { getMercadoLibreAccessToken } from '@/lib/mercadolibre-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function get(path: string, token: string) {
  const response = await fetch(`https://api.mercadolibre.com${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const text = await response.text()
  let parsed: unknown = null
  try { parsed = JSON.parse(text) } catch {}
  return { response, parsed, text }
}

function summary(path: string, response: Response, parsed: unknown, text: string) {
  const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
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
  }
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ ok: false, error: 'PREVIEW_ONLY' }, { status: 404 })
  }
  const token = await getMercadoLibreAccessToken()

  const basePaths = ['/users/me', '/applications/6348448994811377', '/sites/MLC/categories']
  const results = []
  for (const path of basePaths) {
    const { response, parsed, text } = await get(path, token)
    results.push(summary(path, response, parsed, text))
  }

  const root = await get('/sites/MLC/categories', token)
  const categories = Array.isArray(root.parsed) ? root.parsed as Array<{id?: string; name?: string}> : []
  const realEstate = categories.find((item) => item?.name === 'Inmuebles')
  const realEstateId = realEstate?.id ?? null

  let children: Array<{id?: string; name?: string}> = []
  if (realEstateId) {
    const detail = await get(`/categories/${encodeURIComponent(realEstateId)}`, token)
    results.push(summary(`/categories/${realEstateId}`, detail.response, detail.parsed, detail.text))
    if (detail.parsed && typeof detail.parsed === 'object' && !Array.isArray(detail.parsed)) {
      const maybeChildren = (detail.parsed as { children_categories?: unknown }).children_categories
      if (Array.isArray(maybeChildren)) children = maybeChildren as Array<{id?: string; name?: string}>
    }
  }

  const houses = children.find((item) => item?.name === 'Casas')?.id ?? null
  const apartments = children.find((item) => item?.name === 'Departamentos')?.id ?? null

  for (const parent of [houses, apartments].filter(Boolean) as string[]) {
    const detail = await get(`/categories/${encodeURIComponent(parent)}`, token)
    results.push(summary(`/categories/${parent}`, detail.response, detail.parsed, detail.text))
    if (detail.parsed && typeof detail.parsed === 'object' && !Array.isArray(detail.parsed)) {
      const children2 = (detail.parsed as { children_categories?: Array<{id?: string; name?: string}> }).children_categories ?? []
      const sale = children2.find((item) => item?.name === 'Venta')?.id
      if (sale) {
        const searchPath = `/sites/MLC/search?category=${encodeURIComponent(sale)}&limit=1&sort=price_asc`
        const search = await get(searchPath, token)
        results.push(summary(searchPath, search.response, search.parsed, search.text))
      }
    }
  }

  return NextResponse.json({
    ok: true,
    discovered: { realEstateId, houses, apartments },
    results,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
