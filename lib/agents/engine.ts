import { createClient } from '@/lib/supabase/server'
import type { AgentFindingInput, AgentRunInput, AgentRunResult, AgentSourceInput } from '@/lib/agents/types'

export async function startAgentRun(input: AgentRunInput) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_agent_run', {
    p_agent_key: input.agentKey,
    p_title: input.title,
    p_instructions: input.instructions ?? null,
    p_input: input.input ?? {},
    p_idempotency_key: input.idempotencyKey ?? null,
  })

  if (error) throw error
  return data
}

export async function finishAgentRun(runId: string, result: AgentRunResult) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('finish_agent_run', {
    p_run_id: runId,
    p_status: result.status ?? 'needs_review',
    p_output: result.output,
    p_confidence: result.confidence ?? null,
    p_error_message: null,
  })

  if (error) throw error
  return data
}

export async function failAgentRun(runId: string, errorMessage: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('finish_agent_run', {
    p_run_id: runId,
    p_status: 'failed',
    p_output: {},
    p_confidence: null,
    p_error_message: errorMessage,
  })

  if (error) throw error
  return data
}

export async function addAgentSources(runId: string, sources: AgentSourceInput[]) {
  if (!sources.length) return []
  const supabase = await createClient()
  const rows = sources.map((source) => ({
    run_id: runId,
    source_type: source.sourceType,
    source_name: source.sourceName,
    source_url: source.sourceUrl ?? null,
    source_table: source.sourceTable ?? null,
    source_record_id: source.sourceRecordId ?? null,
    observed_at: source.observedAt ?? null,
    freshness_status: source.freshnessStatus ?? 'unknown',
    metadata: source.metadata ?? {},
  }))

  const { data, error } = await supabase.from('agent_sources').insert(rows).select('*')
  if (error) throw error
  return data ?? []
}

export async function addAgentFindings(runId: string, findings: AgentFindingInput[]) {
  if (!findings.length) return []
  const supabase = await createClient()
  const rows = findings.map((finding) => ({
    run_id: runId,
    finding_type: finding.findingType,
    title: finding.title,
    summary: finding.summary,
    severity: finding.severity ?? 'info',
    confidence: finding.confidence ?? null,
    evidence: finding.evidence ?? [],
    dimensions: finding.dimensions ?? {},
  }))

  const { data, error } = await supabase.from('agent_findings').insert(rows).select('*')
  if (error) throw error
  return data ?? []
}

export async function createAgentArtifact(
  runId: string,
  artifact: {
    artifactType: 'json' | 'report' | 'valuation' | 'pdf' | 'docx' | 'presentation' | 'dataset'
    title: string
    version?: number
    storagePath?: string | null
    content?: Record<string, unknown>
    checksum?: string | null
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('agent_artifacts')
    .insert({
      run_id: runId,
      artifact_type: artifact.artifactType,
      title: artifact.title,
      version: artifact.version ?? 1,
      storage_path: artifact.storagePath ?? null,
      content: artifact.content ?? {},
      checksum: artifact.checksum ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}
