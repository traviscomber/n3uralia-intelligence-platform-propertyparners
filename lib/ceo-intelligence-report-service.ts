import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { isReusableCeoIntelligenceDocument, type CeoIntelligenceDocumentCandidate } from '@/lib/ceo-intelligence-report-dedupe'
import {
  PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
  buildContractScopedCeoIntelligenceInput,
  generateContractScopedCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-contract-scope'
import type { CanonicalCeoIntelligenceInput, PropertyPartnersCeoIntelligenceReport } from '@/lib/property-partners-ceo-intelligence-report'

const REPORTIN_VERSION = '1.2'
const MAX_GENERATION_ATTEMPTS = 2

function isRetryableGenerationError(error: unknown) {
  if (error instanceof SyntaxError) return true
  const code = error instanceof Error ? error.message : String(error)
  return [
    'OPENAI_CEO_INTELLIGENCE_EMPTY',
    'OPENAI_CEO_INTELLIGENCE_INVALID_JSON',
    'OPENAI_CEO_INTELLIGENCE_INVALID_SHAPE',
  ].includes(code)
}

async function generateWithRetry(input: CanonicalCeoIntelligenceInput): Promise<{
  report: PropertyPartnersCeoIntelligenceReport
  attempts: number
}> {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const report = await generateContractScopedCeoIntelligenceReport(input)
      return { report, attempts: attempt }
    } catch (error) {
      lastError = error
      if (!isRetryableGenerationError(error) || attempt === MAX_GENERATION_ATTEMPTS) throw error
      console.warn('CEO_INTELLIGENCE_REPORT_RETRY', {
        attempt,
        code: error instanceof Error ? error.message : String(error),
        sourceSnapshotId: input.sourceSnapshotId,
      })
    }
  }
  throw lastError instanceof Error ? lastError : new Error('CEO_INTELLIGENCE_REPORT_FAILED')
}

export async function generateLatestCeoIntelligenceDraft(options: { actorId?: string | null } = {}) {
  const startedAt = Date.now()
  const input = await buildContractScopedCeoIntelligenceInput()
  const supabase = createAdminClient()
  const periodTag = `${input.period.start}_${input.period.end}`

  const { data: candidates } = await supabase
    .from('knowledge_documents')
    .select('id,title,created_at,tags,content')
    .contains('tags', [
      'canonical',
      'n3uralia-client-report',
      'ceo-intelligence-report',
      PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
      periodTag,
    ])
    .order('created_at', { ascending: false })
    .limit(10)

  const existing = ((candidates || []) as CeoIntelligenceDocumentCandidate[])
    .find((document) => isReusableCeoIntelligenceDocument(document, input.sourceSnapshotId))

  if (existing) {
    return {
      id: existing.id,
      createdAt: existing.created_at,
      title: existing.title,
      artifactUrl: `/api/management/reports/ceo-intelligence/${existing.id}/artifact`,
      reused: true,
      sourceSnapshotId: input.sourceSnapshotId,
      sourceSnapshot: {
        id: input.sourceSnapshotId,
        periodStart: input.period.start,
        periodEnd: input.period.end,
        sourceCutoff: input.period.sourceCutoff,
        evidenceCount: input.evidence.length,
        kmlPolygonCount: input.market.polygons.length,
        marketRows: input.market.rows.length,
        contractualScope: PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
      },
      timing: { totalMs: Date.now() - startedAt },
    }
  }

  const generationStartedAt = Date.now()
  const generation = await generateWithRetry(input)
  const report = generation.report
  const openaiAndValidationMs = Date.now() - generationStartedAt
  const modelTag = `openai-${report.canonical_metadata.model}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')

  const persistenceStartedAt = Date.now()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert({
      title: report.title,
      content: JSON.stringify(report),
      doc_type: 'report',
      neighborhood: null,
      tags: [
        'canonical',
        'n3uralia-client-report',
        'ceo-intelligence-report',
        'client-facing',
        PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
        modelTag,
        `reportin-${REPORTIN_VERSION}`,
        periodTag,
        'draft',
        'payment-not-applicable',
      ],
    })
    .select('id,created_at')
    .single()

  if (error || !data) throw error || new Error('REPORT_PERSISTENCE_FAILED')

  const artifactUrl = `/api/management/reports/ceo-intelligence/${data.id}/artifact`
  const persistenceMs = Date.now() - persistenceStartedAt
  const totalMs = Date.now() - startedAt

  const { error: auditError } = await supabase.from('report_directory_audit_log').insert({
    actor_id: options.actorId ?? null,
    action: 'create',
    entity_type: 'property_partners_ceo_intelligence',
    entity_id: data.id,
    before_state: null,
    after_state: {
      title: report.title,
      client: report.client,
      period: report.period,
      delivery: report.delivery,
      canonical_metadata: report.canonical_metadata,
      contractual_scope: PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
      source_snapshot: {
        source_snapshot_id: input.sourceSnapshotId,
        evidence_count: input.evidence.length,
        headline_kpi_count: input.headlineKpis.length,
        office_count: input.offices.length,
        kml_polygon_count: input.market.polygons.length,
        market_row_count: input.market.rows.length,
        portal_cutoff: input.market.portalCutoff,
        cbrs_cutoff: input.market.cbrsCutoff,
        valuation_case_count: input.valuation.totalCases,
      },
      reportin: {
        version: REPORTIN_VERSION,
        artifact_url: artifactUrl,
        design_authority: 'DESIGN.md',
        generation_attempts: generation.attempts,
      },
      timing: { openai_and_validation_ms: openaiAndValidationMs, persistence_ms: persistenceMs, total_ms: totalMs },
    },
  })
  if (auditError) console.error('CEO_INTELLIGENCE_REPORT_AUDIT_FAILED', { reportId: data.id })

  return {
    id: data.id,
    createdAt: data.created_at,
    title: report.title,
    artifactUrl,
    reused: false,
    sourceSnapshotId: input.sourceSnapshotId,
    sourceSnapshot: {
      id: input.sourceSnapshotId,
      periodStart: input.period.start,
      periodEnd: input.period.end,
      sourceCutoff: input.period.sourceCutoff,
      evidenceCount: input.evidence.length,
      kmlPolygonCount: input.market.polygons.length,
      marketRows: input.market.rows.length,
      contractualScope: PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
    },
    reportin: { generationAttempts: generation.attempts },
    timing: { openaiAndValidationMs, persistenceMs, totalMs },
  }
}
