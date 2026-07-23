export const AGENT_KEYS = ['market_intelligence', 'valuation', 'executive_reports'] as const

export type AgentKey = (typeof AGENT_KEYS)[number]

export const AGENT_STATUSES = [
  'draft',
  'queued',
  'running',
  'needs_review',
  'approved',
  'rejected',
  'failed',
  'completed',
  'cancelled',
] as const

export type AgentStatus = (typeof AGENT_STATUSES)[number]

export type AgentRunInput = {
  agentKey: AgentKey
  title: string
  instructions?: string
  input?: Record<string, unknown>
  idempotencyKey?: string
}

export type AgentRunResult = {
  output: Record<string, unknown>
  confidence?: number | null
  status?: Extract<AgentStatus, 'needs_review' | 'completed'>
}

export type AgentFindingInput = {
  findingType: string
  title: string
  summary: string
  severity?: 'info' | 'opportunity' | 'warning' | 'critical'
  confidence?: number | null
  evidence?: unknown[]
  dimensions?: Record<string, unknown>
}

export type AgentSourceInput = {
  sourceType: string
  sourceName: string
  sourceUrl?: string | null
  sourceTable?: string | null
  sourceRecordId?: string | null
  observedAt?: string | null
  freshnessStatus?: 'current' | 'stale' | 'unknown'
  metadata?: Record<string, unknown>
}
