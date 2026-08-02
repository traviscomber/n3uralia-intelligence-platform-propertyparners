import 'server-only'

import type {
  N3uraliaRuntimeRequest,
  N3uraliaRuntimeResponse,
} from '@/lib/n3uralia-runtime-contract'

const DEFAULT_TIMEOUT_MS = 20_000

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

function getRuntimeConfig() {
  const baseUrl = process.env.N3URALIA_RUNTIME_URL
  const serviceToken = process.env.N3URALIA_RUNTIME_SERVICE_TOKEN

  if (!baseUrl || !serviceToken) {
    throw new N3uraliaRuntimeClientError(
      'N3uralia runtime is not configured.',
      503,
      'runtime_not_configured',
    )
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
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
