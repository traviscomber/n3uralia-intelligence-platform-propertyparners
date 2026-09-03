import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
  buildContractScopedCeoIntelligenceInput,
  generateContractScopedCeoIntelligenceReport,
} from '@/lib/property-partners-ceo-intelligence-contract-scope'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const REPORTIN_VERSION = '1.2'
type ExistingDocument = { id: string; title: string; created_at: string; tags: string[] | null }

export async function POST() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const startedAt = Date.now()
  try {
    const input = await buildContractScopedCeoIntelligenceInput()
    const supabase = createAdminClient()
    const periodTag = `${input.period.start}_${input.period.end}`

    const { data: candidates } = await supabase
      .from('knowledge_documents')
      .select('id,title,created_at,tags')
      .contains('tags', [
        'canonical',
        'n3uralia-client-report',
        'ceo-intelligence-report',
        PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
        periodTag,
      ])
      .order('created_at', { ascending: false })
      .limit(10)

    const existing = ((candidates || []) as ExistingDocument[])
      .find((document) => !(document.tags || []).some((tag) => ['reportin-test', 'qa', 'mock', 'demo', 'fixture', 'superseded'].includes(tag)))

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        createdAt: existing.created_at,
        title: existing.title,
        artifactUrl: `/api/management/reports/ceo-intelligence/${existing.id}/artifact`,
        reused: true,
      })
    }

    const generationStartedAt = Date.now()
    const report = await generateContractScopedCeoIntelligenceReport(input)
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
      actor_id: access.userId,
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
        reportin: { version: REPORTIN_VERSION, artifact_url: artifactUrl, design_authority: 'DESIGN.md' },
        timing: { openai_and_validation_ms: openaiAndValidationMs, persistence_ms: persistenceMs, total_ms: totalMs },
      },
    })
    if (auditError) console.error('CEO_INTELLIGENCE_REPORT_AUDIT_FAILED', { reportId: data.id })

    return NextResponse.json({
      id: data.id,
      createdAt: data.created_at,
      title: report.title,
      artifactUrl,
      reused: false,
      sourceSnapshot: {
        periodStart: input.period.start,
        periodEnd: input.period.end,
        sourceCutoff: input.period.sourceCutoff,
        evidenceCount: input.evidence.length,
        kmlPolygonCount: input.market.polygons.length,
        marketRows: input.market.rows.length,
        contractualScope: PROPERTY_PARTNERS_HOUSE_SCOPE_TAG,
      },
      timing: { openaiAndValidationMs, persistenceMs, totalMs },
    }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CEO_INTELLIGENCE_REPORT_FAILED'
    const status = code === 'OPENAI_API_KEY_MISSING'
      ? 503
      : code === 'OPENAI_CEO_INTELLIGENCE_TIMEOUT'
        ? 504
        : code.startsWith('CEO_INTELLIGENCE_OUT_OF_SCOPE') || code === 'CEO_INTELLIGENCE_SCOPE_TAG_MISSING'
          ? 422
          : 500
    console.error('CEO_INTELLIGENCE_REPORT_FAILED', { code, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      error: status === 503
        ? 'La generación CEO Intelligence está pendiente de configurar OPENAI_API_KEY.'
        : status === 504
          ? 'La generación CEO Intelligence excedió el tiempo interactivo disponible. Intenta nuevamente.'
          : status === 422
            ? 'El informe generado salió del alcance contractual de casas en Vitacura y fue rechazado antes de persistir.'
            : 'No fue posible generar el CEO Intelligence Report del último período disponible.',
      code,
    }, { status })
  }
}
