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

  const bulkIds = ["MLC4182532688","MLC2045837473","MLC3946847146","MLC3979950386","MLC2233243027","MLC1482039985","MLC1568362894","MLC1806475591","MLC1849060153","MLC1379757895"]
  const bulkPath = `/items/bulk?ids=${bulkIds.join(',')}&attributes=body.id,body.title,body.price,body.currency_id,body.permalink,body.category_id,body.location,body.address`
  const bulk = await get(bulkPath, token)
  const bulkRows = Array.isArray(bulk.parsed)
    ? (bulk.parsed as Array<{ id?: string; status_code?: number; body?: { id?: string; title?: string; price?: number; currency_id?: string; permalink?: string; category_id?: string; location?: unknown; address?: unknown } }>).map((row) => ({
        id: row.id ?? row.body?.id ?? null,
        status: row.status_code ?? null,
        title: row.body?.title ?? null,
        price: row.body?.price ?? null,
        currency: row.body?.currency_id ?? null,
        permalink: row.body?.permalink ?? null,
        categoryId: row.body?.category_id ?? null,
        hasLocation: Boolean(row.body?.location),
        hasAddress: Boolean(row.body?.address),
      }))
    : []

  return NextResponse.json({
    ok: true,
    discovered: { realEstateId, houses, apartments },
    results,
    bulk: {
      status: bulk.response.status,
      ok: bulk.response.ok,
      requested: bulkIds.length,
      returned: bulkRows.length,
      rows: bulkRows,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
