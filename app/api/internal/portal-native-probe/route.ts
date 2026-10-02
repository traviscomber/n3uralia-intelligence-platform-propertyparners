import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'gru1'

const URL = 'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'fix/native-portal-scraper') {
    return NextResponse.json({ error: 'preview_only' }, { status: 404 })
  }

  const response = await fetch(URL, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
      'accept-language': 'es-CL,es;q=0.9,en;q=0.7',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'upgrade-insecure-requests': '1',
    },
  })
  const html = await response.text()
  const mlc = new Set(html.match(/MLC-?\d+/gi) ?? [])
  return NextResponse.json({
    status: response.status,
    finalUrl: response.url,
    blocked: /suspicious-traffic-frontend|suspicious traffic|account-verification/i.test(html),
    mlcIds: mlc.size,
    bytes: html.length,
    region: process.env.VERCEL_REGION ?? null,
    sample: [...mlc].slice(0, 5),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
