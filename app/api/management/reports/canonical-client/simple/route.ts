import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCanonicalClientReport,
  type CanonicalClientReportInput,
  type CanonicalEvidence,
} from '@/lib/n3uralia-canonical-client-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, field: string, maxLength = 12_000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) throw new Error(`INVALID_${field.toUpperCase()}`)
  return value.trim()
}

function date(value: unknown, field: string) {
  const result = text(value, field, 32)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`INVALID_${field.toUpperCase()}`)
  return result
}

function evidence(value: unknown): CanonicalEvidence[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) throw new Error('INVALID_VERIFIED_EVIDENCE')
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`INVALID_EVIDENCE_${index}`)
    return {
      id: text(item.id, `evidence_id_${index}`, 160),
      claim: text(item.claim, `evidence_claim_${index}`, 8_000),
      source: text(item.source, `evidence_source_${index}`, 1_000),
      status: 'verified' as const,
    }
  })
}

function parse(value: unknown): CanonicalClientReportInput {
  if (!isRecord(value)) throw new Error('INVALID_BODY')
  const periodStart = date(value.periodStart, 'period_start')
  const periodEnd = date(value.periodEnd, 'period_end')
  const sourceCutoff = date(value.sourceCutoff, 'source_cutoff')
  if (periodStart > periodEnd || periodEnd > sourceCutoff) throw new Error('INVALID_PERIOD_ORDER')

  return {
    title: text(value.title, 'title', 500),
    client: text(value.client, 'client', 500),
    periodStart,
    periodEnd,
    sourceCutoff,
    purpose: text(value.purpose, 'purpose', 2_000),
    audience: text(value.audience, 'audience', 500),
    verifiedEvidence: evidence(value.verifiedEvidence),
    portalFeatures: [],
    contractualProgress: [],
    clientDependencies: [],
    n3uraliaNextSteps: [],
    delivery: {
      recipient: null,
      status: 'draft',
      purpose: 'Borrador interno para revisión humana antes de distribución.',
      paymentMilestonePercent: null,
      paymentStatus: 'not_applicable',
      deliveredAt: null,
    },
  }
}

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const startedAt = Date.now()
  try {
    const input = parse(await request.json())
    const generationStartedAt = Date.now()
    const report = await generateCanonicalClientReport(input)
    const generationMs = Date.now() - generationStartedAt

    const supabase = createAdminClient()
    const periodTag = `${input.periodStart}_${input.periodEnd}`
    const modelTag = `openai-${report.canonical_metadata.model}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
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
          'client-facing',
          'draft',
          'reportin-1.1',
          modelTag,
          periodTag,
          'payment-not-applicable',
        ],
      })
      .select('id,created_at')
      .single()

    if (error || !data) throw error || new Error('REPORT_PERSISTENCE_FAILED')

    const artifactUrl = `/api/management/reports/canonical-client/${data.id}/artifact`
    const totalMs = Date.now() - startedAt

    const { error: auditError } = await supabase.from('report_directory_audit_log').insert({
      actor_id: access.userId,
      action: 'create',
      entity_type: 'n3uralia_client_canonical',
      entity_id: data.id,
      before_state: null,
      after_state: {
        title: report.title,
        period: report.period,
        delivery: report.delivery,
        canonical_metadata: report.canonical_metadata,
        reportin: { version: '1.1', artifact_url: artifactUrl, design_authority: 'DESIGN.md' },
        timing: { generation_ms: generationMs, total_ms: totalMs },
      },
    })
    if (auditError) console.error('SIMPLE_CANONICAL_REPORT_AUDIT_FAILED', { reportId: data.id })

    return NextResponse.json({
      id: data.id,
      createdAt: data.created_at,
      artifactUrl,
      report,
      timing: { generationMs, totalMs },
    }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CANONICAL_CLIENT_REPORT_FAILED'
    const status = code === 'OPENAI_API_KEY_MISSING' ? 503 : code.startsWith('INVALID_') ? 400 : 500
    console.error('SIMPLE_CANONICAL_REPORT_FAILED', { code, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      error: status === 503
        ? 'La generación está pendiente de configurar OPENAI_API_KEY.'
        : status === 400
          ? 'Revise el período y las fuentes seleccionadas.'
          : 'No fue posible generar el informe canónico.',
      code,
    }, { status })
  }
}
