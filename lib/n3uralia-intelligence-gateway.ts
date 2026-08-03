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

export type N3uraliaGatewayParity = {
  signalCountDelta: number
  riskCountDelta: number
  actionCountDelta: number
  matchingSignalIds: number
  matchingRiskIds: number
  matchingActionIds: number
  exactIdParity: boolean
}

export type N3uraliaGatewayResult = {
  mode: N3uraliaGatewayMode
  local: N3uraliaIntelligenceContext
  remote: N3uraliaRuntimeResponse | null
  parity: N3uraliaGatewayParity | null
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

function assertRemoteIdentity(
  request: N3uraliaRuntimeRequest,
  response: N3uraliaRuntimeResponse,
) {
  if (response.protocolVersion !== request.protocolVersion) {
    throw new N3uraliaRuntimeClientError(
      'Private N3uralia runtime returned an incompatible protocol version.',
      502,
      'protocol_mismatch',
    )
  }

  if (response.requestId !== request.requestId) {
    throw new N3uraliaRuntimeClientError(
      'Private N3uralia runtime returned a mismatched request identifier.',
      502,
      'request_mismatch',
    )
  }

  if (response.tenantId !== request.tenantId) {
    throw new N3uraliaRuntimeClientError(
      'Private N3uralia runtime returned a mismatched tenant.',
      502,
      'tenant_mismatch',
    )
  }
}

function countMatchingIds(localIds: string[], remoteIds: string[]) {
  const remoteSet = new Set(remoteIds)
  return localIds.filter((id) => remoteSet.has(id)).length
}

function buildParity(
  local: N3uraliaIntelligenceContext,
  remote: N3uraliaRuntimeResponse,
): N3uraliaGatewayParity {
  const localSignalIds = local.signals.map((item) => item.id)
  const remoteSignalIds = remote.signals.map((item) => item.id)
  const localRiskIds = local.risks.map((item) => item.id)
  const remoteRiskIds = remote.risks.map((item) => item.id)
  const localActionIds = local.actions.map((item) => item.id)
  const remoteActionIds = remote.actions.map((item) => item.id)

  const matchingSignalIds = countMatchingIds(localSignalIds, remoteSignalIds)
  const matchingRiskIds = countMatchingIds(localRiskIds, remoteRiskIds)
  const matchingActionIds = countMatchingIds(localActionIds, remoteActionIds)

  return {
    signalCountDelta: remoteSignalIds.length - localSignalIds.length,
    riskCountDelta: remoteRiskIds.length - localRiskIds.length,
    actionCountDelta: remoteActionIds.length - localActionIds.length,
    matchingSignalIds,
    matchingRiskIds,
    matchingActionIds,
    exactIdParity:
      matchingSignalIds === localSignalIds.length
      && matchingSignalIds === remoteSignalIds.length
      && matchingRiskIds === localRiskIds.length
      && matchingRiskIds === remoteRiskIds.length
      && matchingActionIds === localActionIds.length
      && matchingActionIds === remoteActionIds.length,
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
    return { mode, local, remote: null, parity: null, remoteError: null }
  }

  try {
    const request = createRequest(local, options)
    const remote = await executeN3uraliaRuntime(request)
    assertRemoteIdentity(request, remote)

    return {
      mode,
      local,
      remote,
      parity: mode === 'shadow' ? buildParity(local, remote) : null,
      remoteError: null,
    }
  } catch (error) {
    const normalized = error instanceof N3uraliaRuntimeClientError
      ? { code: error.code, status: error.status, message: error.message }
      : { code: 'runtime_unknown_error', status: 500, message: 'Unknown runtime error.' }

    if (mode === 'remote') throw error

    return {
      mode,
      local,
      remote: null,
      parity: null,
      remoteError: normalized,
    }
  }
}
