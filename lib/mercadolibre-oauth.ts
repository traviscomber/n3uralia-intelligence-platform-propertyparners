import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const TOKEN_ENDPOINT = 'https://api.mercadolibre.com/oauth/token'

type TokenResponse = {
  access_token: string
  token_type?: string
  expires_in: number
  scope?: string
  user_id?: number
  refresh_token: string
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function mercadoLibreOAuthConfig(origin?: string) {
  let clientId = process.env.MERCADOLIBRE_CLIENT_ID?.trim() || ''
  let clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET?.trim() || ''

  if (!clientId || !clientSecret) {
    const supabase = serviceClient()
    const { data, error } = await supabase.rpc('get_mercadolibre_oauth_credentials_v1')
    if (error) throw new Error(`MERCADOLIBRE_CREDENTIALS_READ_FAILED:${error.message}`)
    const creds = (data ?? {}) as { client_id?: string | null; client_secret?: string | null }
    clientId ||= creds.client_id?.trim() || ''
    clientSecret ||= creds.client_secret?.trim() || ''
  }

  if (!clientId) throw new Error('MERCADOLIBRE_CLIENT_ID_MISSING')
  if (!clientSecret) throw new Error('MERCADOLIBRE_CLIENT_SECRET_MISSING')

  const configuredRedirect = process.env.MERCADOLIBRE_REDIRECT_URI?.trim()
  const redirectUri = configuredRedirect
    || (origin
      ? `${origin.replace(/\/$/, '')}/api/integrations/mercadolibre/callback`
      : null)
  if (!redirectUri) throw new Error('MERCADOLIBRE_REDIRECT_URI_MISSING')

  return { clientId, clientSecret, redirectUri }
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const raw = await response.text()
  let parsed: unknown = null
  try { parsed = JSON.parse(raw) } catch { /* handled below */ }
  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'message' in parsed
      ? String((parsed as { message?: unknown }).message ?? '')
      : raw.slice(0, 240)
    throw new Error(`MERCADOLIBRE_OAUTH_HTTP_${response.status}:${message}`)
  }
  return parsed as TokenResponse
}

export async function storeMercadoLibreToken(token: TokenResponse) {
  const expiresAt = new Date(Date.now() + Math.max(token.expires_in, 60) * 1000).toISOString()
  const supabase = serviceClient()
  const { error } = await supabase
    .from('mercadolibre_oauth_tokens')
    .upsert({
      singleton: true,
      user_id: token.user_id ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type ?? 'bearer',
      scope: token.scope ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'singleton' })
  if (error) throw new Error(`MERCADOLIBRE_TOKEN_STORE_FAILED:${error.message}`)
  return expiresAt
}

export async function exchangeMercadoLibreAuthorizationCode(args: {
  code: string
  codeVerifier: string
  origin?: string
}) {
  const { clientId, clientSecret, redirectUri } = await mercadoLibreOAuthConfig(args.origin)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: args.code,
    redirect_uri: redirectUri,
    code_verifier: args.codeVerifier,
  })
  const token = await exchangeToken(body)
  const expiresAt = await storeMercadoLibreToken(token)
  return { userId: token.user_id ?? null, scope: token.scope ?? null, expiresAt }
}

async function refreshMercadoLibreToken(refreshToken: string) {
  const { clientId, clientSecret } = await mercadoLibreOAuthConfig('https://ppartnersgroup.app')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  const token = await exchangeToken(body)
  await storeMercadoLibreToken(token)
  return token.access_token
}

export async function getMercadoLibreAccessToken() {
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('mercadolibre_oauth_tokens')
    .select('access_token,refresh_token,expires_at')
    .eq('singleton', true)
    .maybeSingle()

  if (error) throw new Error(`MERCADOLIBRE_TOKEN_READ_FAILED:${error.message}`)

  if (data?.access_token && data.refresh_token && data.expires_at) {
    const expiresAt = Date.parse(data.expires_at)
    if (Number.isFinite(expiresAt) && expiresAt > Date.now() + 5 * 60 * 1000) {
      return data.access_token
    }
    return refreshMercadoLibreToken(data.refresh_token)
  }

  // Legacy fallback only. OAuth-issued tokens in the server-only store are authoritative.
  const envToken = process.env.MERCADOLIBRE_ACCESS_TOKEN?.trim()
  if (envToken) return envToken

  throw new Error('MERCADOLIBRE_ACCESS_TOKEN_MISSING')
}
