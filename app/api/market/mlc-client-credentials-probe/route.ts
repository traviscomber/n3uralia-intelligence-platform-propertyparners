import { NextResponse } from 'next/server'
import { getMercadoLibreClientCredentialsToken } from '@/lib/mercadolibre-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ ok: false, error: 'PREVIEW_ONLY' }, { status: 404 })
  }

  try {
    const token = await getMercadoLibreClientCredentialsToken()
    const response = await fetch('https://api.mercadolibre.com/sites/MLC/categories', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
    })
    const body = await response.json().catch(() => null)
    const categories = Array.isArray(body) ? body : []

    return NextResponse.json({
      ok: response.ok,
      token: {
        issued: true,
        tokenType: token.tokenType,
        expiresIn: token.expiresIn,
        scope: token.scope,
      },
      categories: {
        status: response.status,
        count: categories.length,
        hasRealEstate: categories.some((item: { name?: string }) => item?.name === 'Inmuebles'),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return NextResponse.json({
      ok: false,
      error: message.replace(/APP_USR-[A-Za-z0-9-]+/g, '[REDACTED]'),
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
