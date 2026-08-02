import 'server-only'

import {
  buildN3uraliaIntelligenceContext,
  type IntelligenceAudience,
  type IntelligenceDomain,
  type N3uraliaIntelligenceContext,
} from '@/lib/n3uralia-intelligence-engine'
import {
  executeN3uraliaRuntime,
  N3uraliaRuntimeClientError,
} from '@/lib/n3uralia-runtime-client'
import {
  N3URALIA_RUNTIME_PROTOCOL_VERSION,
  type N3uraliaRuntimeRequest,
  type N3uraliaRuntimeResponse,
} from '@/lib/n3uralia-runtime-contract'

export type N3uraliaGatewayMode = 'local' | 'shadow' | 'remote'

export type N3uraliaGatewayOptions = {
  tenantId: string
  audience?: IntelligenceAudience
  domains?: IntelligenceDomain[]
  purpose?: N3uraliaRuntimeRequest['purpose']
  requestId?: string
}

export type N3uraliaGatewayResult = {
  mode: N3uraliaGatewayMode
  local: N3uraliaIntelligenceContext
  remote: N3uraliaRuntimeResponse | null
  remoteError: {
    code: string
    status: number
    message: string
  } | null
}

function getMode(): N3uraliaGatewayMode {
  const configured = process.env.N3URALIA_RUNTIME_MODE
  if (configured === 'remote' || configured === 'shadow') return configured
  return 'local'
}

function createRequest(
  local: N3uraliaIntelligenceContext,
  options: N3uraliaGatewayOptions,
): N3uraliaRuntimeRequest {
  return {
    protocolVersion: N3URALIA_RUNTIME_PROTOCOL_VERSION,
    requestId: options.requestId ?? crypto.randomUUID(),
    tenantId: options.tenantId,
    audience: options.audience ?? 'system',
    domains: options.domains ?? ['executive', 'crm', 'market', 'valuation', 'documents', 'reports'],
    evidence: local.evidence.map((item) => ({
      id: item.id,
      sourceClass: item.sourceClass,
      period: item.period,
    })),
    purpose: options.purpose ?? 'decision-support',
  }
}

/**
 * Transitional boundary for the extraction of the proprietary engine.
 *
 * local: preserves current behaviour.
 * shadow: executes local and remote paths, returning local as authoritative.
 * remote: requires a valid remote response; callers must consume `remote`.
 *
 * This module is server-only and must never be imported by a client component.
 */
export async function getN3uraliaIntelligence(
  options: N3uraliaGatewayOptions,
): Promise<N3uraliaGatewayResult> {
  if (!options.tenantId.trim()) {
    throw new Error('tenantId is required for N3uralia intelligence execution.')
  }

  const mode = getMode()
  const local = buildN3uraliaIntelligenceContext(options.audience ?? 'system')

  if (mode === 'local') {
    return { mode, local, remote: null, remoteError: null }
  }

  try {
    const remote = await executeN3uraliaRuntime(createRequest(local, options))
    return { mode, local, remote, remoteError: null }
  } catch (error) {
    const normalized = error instanceof N3uraliaRuntimeClientError
      ? { code: error.code, status: error.status, message: error.message }
      : { code: 'runtime_unknown_error', status: 500, message: 'Unknown runtime error.' }

    if (mode === 'remote') throw error

    return {
      mode,
      local,
      remote: null,
      remoteError: normalized,
    }
  }
}
