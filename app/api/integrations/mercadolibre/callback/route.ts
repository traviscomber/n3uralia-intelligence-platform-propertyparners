import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { exchangeMercadoLibreAuthorizationCode } from '@/lib/mercadolibre-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('ml_oauth_state')?.value
  const verifier = cookieStore.get('ml_oauth_verifier')?.value

  if (error) {
    return NextResponse.json({ ok: false, error: `MERCADOLIBRE_AUTH_${error}` }, { status: 400 })
  }
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.json({ ok: false, error: 'MERCADOLIBRE_OAUTH_STATE_INVALID' }, { status: 400 })
  }

  try {
    const result = await exchangeMercadoLibreAuthorizationCode({
      code,
      codeVerifier: verifier,
      origin: url.origin,
    })
    const response = NextResponse.json({
      ok: true,
      integration: 'mercadolibre',
      userId: result.userId,
      scope: result.scope,
      expiresAt: result.expiresAt,
      next: 'Run the bounded Vitacura houses and apartments probes.',
    })
    response.cookies.set('ml_oauth_state', '', { path: '/api/integrations/mercadolibre', maxAge: 0 })
    response.cookies.set('ml_oauth_verifier', '', { path: '/api/integrations/mercadolibre', maxAge: 0 })
    return response
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
