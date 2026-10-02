import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'fix/native-portal-scraper' || url.searchParams.get('probe') !== '1') {
    return NextResponse.json({ error: 'preview_only' }, { status: 404 })
  }
  const target = 'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana'
  const response = await fetch(target, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
      'accept-language': 'es-CL,es;q=0.9,en;q=0.7',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  })
  const html = await response.text()
  const ids = new Set(html.match(/MLC-?\\d+/gi) ?? [])
  return NextResponse.json({
    probe: 'fra',
    status: response.status,
    finalUrl: response.url,
    blocked: /suspicious-traffic-frontend|suspicious traffic|account-verification/i.test(html),
    mlcIds: ids.size,
    bytes: html.length,
    region: process.env.VERCEL_REGION ?? null,
    sample: [...ids].slice(0, 5),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
