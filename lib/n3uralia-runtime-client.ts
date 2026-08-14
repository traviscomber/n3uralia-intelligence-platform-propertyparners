import 'server-only'

import type {
  N3uraliaRuntimeRequest,
  N3uraliaRuntimeResponse,
} from '@/lib/n3uralia-runtime-contract'

const DEFAULT_TIMEOUT_MS = 20_000
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export class N3uraliaRuntimeClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'N3uraliaRuntimeClientError'
  }
}

function parseRuntimeUrl(rawUrl: string) {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime URL is invalid.',
      503,
      'runtime_url_invalid',
    )
  }

  const isLocal = LOCAL_HOSTNAMES.has(url.hostname)
  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime URL must use HTTPS outside local development.',
      503,
      'runtime_url_insecure',
    )
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime URL must not contain credentials, query parameters or fragments.',
      503,
      'runtime_url_unsafe',
    )
  }

  return url.toString().replace(/\/$/, '')
}

function getRuntimeConfig() {
  const baseUrl = process.env.N3URALIA_RUNTIME_URL?.trim()
  const serviceToken = process.env.N3URALIA_RUNTIME_SERVICE_TOKEN?.trim()

  if (!baseUrl || !serviceToken) {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime is not configured.',
      503,
      'runtime_not_configured',
    )
  }

  if (serviceToken.length < 32) {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime service token does not meet the minimum security requirement.',
      503,
      'runtime_token_invalid',
    )
  }

  return {
    baseUrl: parseRuntimeUrl(baseUrl),
    serviceToken,
  }
}

export async function executeN3uraliaRuntime(
  request: N3uraliaRuntimeRequest,
): Promise<N3uraliaRuntimeResponse> {
  const { baseUrl, serviceToken } = getRuntimeConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/v1/intelligence/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
        'X-N3uralia-Protocol-Version': request.protocolVersion,
      },
      body: JSON.stringify(request),
      cache: 'no-store',
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new N3uraliaRuntimeClientError(
        payload?.error?.message || 'Private N3uralia runtime request failed.',
        response.status,
        payload?.error?.code || 'runtime_request_failed',
      )
    }

    return payload as N3uraliaRuntimeResponse
  } catch (error) {
    if (error instanceof N3uraliaRuntimeClientError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new N3uraliaRuntimeClientError(
        'Private N3uralia runtime timed out.',
        504,
        'runtime_timeout',
      )
    }

    throw new N3uraliaRuntimeClientError(
      'Private N3uralia runtime is unavailable.',
      503,
      'runtime_unavailable',
    )
  } finally {
    clearTimeout(timeout)
  }
}
