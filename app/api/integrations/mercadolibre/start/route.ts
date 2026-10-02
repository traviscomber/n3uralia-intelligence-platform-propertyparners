import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireExecutiveAccess } from '@/lib/api-access'
import { mercadoLibreOAuthConfig } from '@/lib/mercadolibre-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function base64url(value: Buffer) {
  return value.toString('base64url')
}

export async function GET(request: Request) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  const origin = new URL(request.url).origin
  const { clientId, redirectUri } = mercadoLibreOAuthConfig(origin)
  const state = base64url(randomBytes(24))
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())

  const auth = new URL('https://auth.mercadolibre.cl/authorization')
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('client_id', clientId)
  auth.searchParams.set('redirect_uri', redirectUri)
  auth.searchParams.set('state', state)
  auth.searchParams.set('code_challenge', challenge)
  auth.searchParams.set('code_challenge_method', 'S256')

  const response = NextResponse.redirect(auth)
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/api/integrations/mercadolibre',
    maxAge: 10 * 60,
  }
  response.cookies.set('ml_oauth_state', state, cookieOptions)
  response.cookies.set('ml_oauth_verifier', verifier, cookieOptions)
  return response
}
