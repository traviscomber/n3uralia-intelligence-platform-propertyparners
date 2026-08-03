export const N3URALIA_RUNTIME_PROTOCOL_VERSION = '2026-08-01' as const

export type N3uraliaSourceClass =
  | 'client_evidence'
  | 'external_market'
  | 'n3uralia_model'
  | 'n3uralia_inference'

export type N3uraliaRuntimeAudience = 'ceo' | 'director' | 'seller' | 'system'
export type N3uraliaRuntimeDomain = 'executive' | 'crm' | 'market' | 'valuation' | 'documents' | 'reports'

export type N3uraliaRuntimeEvidenceRef = {
  id: string
  sourceClass: N3uraliaSourceClass
  period: string | null
}

export type N3uraliaRuntimeRequest = {
  protocolVersion: typeof N3URALIA_RUNTIME_PROTOCOL_VERSION
  requestId: string
  tenantId: string
  audience: N3uraliaRuntimeAudience
  domains: N3uraliaRuntimeDomain[]
  evidence: N3uraliaRuntimeEvidenceRef[]
  purpose: 'dashboard' | 'report' | 'alert' | 'decision-support'
}

export type N3uraliaRuntimeSignal = {
  id: string
  domain: N3uraliaRuntimeDomain
  sourceClass: 'n3uralia_model' | 'n3uralia_inference' | 'external_market'
  title: string
  interpretation: string
  evidenceIds: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type N3uraliaRuntimeRisk = {
  id: string
  domain: N3uraliaRuntimeDomain
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  evidenceIds: string[]
}

export type N3uraliaRuntimeAction = {
  id: string
  audience: Exclude<N3uraliaRuntimeAudience, 'system'>
  priority: 'high' | 'medium' | 'low'
  title: string
  rationale: string
  action: string
  domain: N3uraliaRuntimeDomain
  evidenceIds: string[]
}

export type N3uraliaRuntimeResponse = {
  protocolVersion: typeof N3URALIA_RUNTIME_PROTOCOL_VERSION
  requestId: string
  generatedAt: string
  tenantId: string
  signals: N3uraliaRuntimeSignal[]
  risks: N3uraliaRuntimeRisk[]
  actions: N3uraliaRuntimeAction[]
  provenance: {
    clientEvidenceIds: string[]
    externalSourceIds: string[]
    modelVersion: string
  }
}

export type N3uraliaRuntimeErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'TENANT_MISMATCH'
  | 'RATE_LIMITED'
  | 'RUNTIME_UNAVAILABLE'
  | 'PROTOCOL_MISMATCH'

export type N3uraliaRuntimeError = {
  protocolVersion: typeof N3URALIA_RUNTIME_PROTOCOL_VERSION
  requestId: string
  error: {
    code: N3uraliaRuntimeErrorCode
    message: string
    retryable: boolean
  }
}
