export type PortalProxyConfig = {
  server: string
  username: string | null
  password: string | null
}

function clean(value: string | undefined | null) {
  const normalized = value?.trim()
  return normalized || null
}

export function resolvePortalProxy(env: NodeJS.ProcessEnv = process.env): PortalProxyConfig | null {
  const raw = clean(env.PORTAL_PROXY_URL) ?? clean(env.PORTAL_PROXY_SERVER)
  if (!raw) return null

  let server = raw
  let username = clean(env.PORTAL_PROXY_USERNAME)
  let password = clean(env.PORTAL_PROXY_PASSWORD)

  try {
    const parsed = new URL(raw.includes('://') ? raw : `http://${raw}`)
    if (parsed.username && !username) username = decodeURIComponent(parsed.username)
    if (parsed.password && !password) password = decodeURIComponent(parsed.password)
    parsed.username = ''
    parsed.password = ''
    server = parsed.toString().replace(/\/$/, '')
  } catch {
    // Chromium accepts host:port as --proxy-server as well.
    server = raw
  }

  return { server, username, password }
}

export function portalProxyConfigured(env: NodeJS.ProcessEnv = process.env) {
  return resolvePortalProxy(env) !== null
}
