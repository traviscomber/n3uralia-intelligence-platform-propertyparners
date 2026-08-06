import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCanonicalSnapshotId,
  validateCanonicalReportPayload,
} from '@/lib/reportin-canonical-validation'
import {
  generateCanonicalClientReport,
  type CanonicalClientReportInput,
  type CanonicalContractItem,
  type CanonicalEvidence,
  type CanonicalPortalFeature,
} from '@/lib/n3uralia-canonical-client-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const REPORTIN_VERSION = '1.1'
const PERIOD_START = '2026-01-01'
const PERIOD_END = '2026-07-31'
const SOURCE_CUTOFF = '2026-07-31'

type CanonicalSourceRow = {
  id: string
  title: string
  content: string
  doc_type: string | null
  tags: string[] | null
  created_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function compactSource(row: CanonicalSourceRow) {
  const parsed = parseJson(row.content)
  if (!parsed) return row.content.slice(0, 12_000)

  const allowedKeys = [
    'title',
    'summary',
    'executive_summary',
    'purpose',
    'verified_facts',
    'conclusions',
    'sections',
    'period',
    'delivery',
    'canonical_metadata',
  ]
  const compact = Object.fromEntries(allowedKeys.filter((key) => key in parsed).map((key) => [key, parsed[key]]))
  return JSON.stringify(compact).slice(0, 12_000)
}

function sourceStatus(tags: string[] | null): CanonicalEvidence['status'] {
  if (tags?.includes('pending-client')) return 'pending_client'
  if (tags?.includes('pending-n3uralia')) return 'pending_n3uralia'
  if (tags?.includes('partial')) return 'partial'
  return 'verified'
}

function buildInput(rows: CanonicalSourceRow[]): CanonicalClientReportInput {
  const evidence: CanonicalEvidence[] = rows.map((row) => ({
    id: `knowledge:${row.id}`,
    claim: compactSource(row),
    source: `${row.title} · ${row.created_at}`,
    status: sourceStatus(row.tags),
  }))

  const portalRows = rows.filter((row) => row.tags?.includes('portal-progress') || /portal|plataforma/i.test(row.title))
  const contractRows = rows.filter((row) => row.tags?.some((tag) => /contract|payment|delivery|client-delivered/i.test(tag)))

  const portalFeatures: CanonicalPortalFeature[] = (portalRows.length ? portalRows : rows.slice(0, 1)).map((row) => ({
    name: row.title,
    status: 'partial',
    evidence: `knowledge:${row.id}`,
  }))

  const contractualProgress: CanonicalContractItem[] = (contractRows.length ? contractRows : rows.slice(0, 1)).map((row) => ({
    requirement: row.title,
    status: row.tags?.includes('client-delivered') ? 'partial' : 'pending_n3uralia',
    evidence: `knowledge:${row.id}`,
    dependency: row.tags?.includes('payment-pending') ? 'El estado de pago permanece pendiente en la fuente canónica.' : undefined,
  }))

  return {
    title: 'Informe ejecutivo Property Partners — enero a julio 2026',
    client: 'Property Partners Vitacura / PL Real Estate SpA',
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    sourceCutoff: SOURCE_CUTOFF,
    purpose: 'Generar una nueva versión ejecutiva canónica del período completo, con gráficos verificables y trazabilidad de fuentes.',
    audience: 'Cliente y contraparte ejecutiva',
    verifiedEvidence: evidence,
    portalFeatures,
    contractualProgress,
    clientDependencies: [],
    n3uraliaNextSteps: [
      'Mantener trazabilidad de evidencia para cada afirmación material.',
      'Someter el borrador a revisión humana antes de cualquier distribución externa.',
    ],
    delivery: {
      recipient: null,
      status: 'draft',
      purpose: 'Revisión ejecutiva interna antes de distribución.',
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
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (
      body.periodStart !== PERIOD_START ||
      body.periodEnd !== PERIOD_END ||
      body.sourceCutoff !== SOURCE_CUTOFF
    ) {
      return NextResponse.json({ error: 'El período solicitado no coincide con el corte canónico disponible.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('id,title,content,doc_type,tags,created_at')
      .contains('tags', ['canonical'])
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) throw error
    const rows = (data || []) as CanonicalSourceRow[]
    const relevant = rows.filter((row) => {
      const haystack = `${row.title} ${(row.tags || []).join(' ')}`.toLowerCase()
      return haystack.includes('2026') || haystack.includes('julio') || haystack.includes('enero-julio') || haystack.includes('portal-progress')
    })

    if (relevant.length === 0) {
      return NextResponse.json({ error: 'No existen fuentes canónicas suficientes para el período completo.' }, { status: 422 })
    }

    const input = buildInput(relevant)
    const validationStartedAt = Date.now()
    const snapshotBase = {
      title: input.title,
      client: input.client,
      period: {
        start: input.periodStart,
        end: input.periodEnd,
        sourceCutoff: input.sourceCutoff,
      },
      evidence: input.verifiedEvidence,
      metrics: [],
      charts: [],
    }
    const sourceSnapshotId = createCanonicalSnapshotId(snapshotBase)
    validateCanonicalReportPayload({ ...snapshotBase, sourceSnapshotId })
    const validationMs = Date.now() - validationStartedAt

    const generationStartedAt = Date.now()
    const report = await generateCanonicalClientReport(input)
    const openaiMs = Date.now() - generationStartedAt

    const persistenceStartedAt = Date.now()
    const modelTag = `openai-${report.canonical_metadata.model}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const { data: inserted, error: insertError } = await supabase
      .from('knowledge_documents')
      .insert({
        title: report.title,
        content: JSON.stringify({
          ...report,
          canonical_metadata: {
            ...report.canonical_metadata,
            source_snapshot_id: sourceSnapshotId,
            validation_ms: validationMs,
          },
        }),
        doc_type: 'report',
        neighborhood: null,
        tags: [
          'canonical',
          'n3uralia-client-report',
          'client-facing',
          modelTag,
          `reportin-${REPORTIN_VERSION}`,
          `${PERIOD_START}_${PERIOD_END}`,
          'draft',
          'full-period-generation',
          'payment-not-applicable',
        ],
      })
      .select('id,created_at')
      .single()

    if (insertError || !inserted) throw insertError || new Error('REPORT_PERSISTENCE_FAILED')

    const artifactUrl = `/api/management/reports/canonical-client/${inserted.id}/artifact`
    const persistenceMs = Date.now() - persistenceStartedAt
    const totalMs = Date.now() - startedAt

    await supabase.from('report_directory_audit_log').insert({
      actor_id: access.userId,
      action: 'create',
      entity_type: 'n3uralia_client_canonical',
      entity_id: inserted.id,
      before_state: null,
      after_state: {
        source_count: relevant.length,
        source_snapshot_id: sourceSnapshotId,
        period: report.period,
        canonical_metadata: report.canonical_metadata,
        reportin: { version: REPORTIN_VERSION, artifact_url: artifactUrl },
        timing: { validation_ms: validationMs, openai_ms: openaiMs, persistence_ms: persistenceMs, total_ms: totalMs },
      },
    })

    return NextResponse.json({
      id: inserted.id,
      createdAt: inserted.created_at,
      artifactUrl,
      sourceSnapshotId,
      reportin: { version: REPORTIN_VERSION, format: 'pdf' },
      timing: { validationMs, openaiMs, persistenceMs, totalMs },
    }, { status: 201 })
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : 'FULL_PERIOD_REPORT_FAILED'
    const status = code.startsWith('missing_or_invalid:') || code.startsWith('unknown_evidence:') || code.startsWith('invalid:')
      ? 422
      : 500
    console.error('FULL_PERIOD_REPORT_FAILED', { code, totalMs: Date.now() - startedAt })
    return NextResponse.json({ error: 'No fue posible generar el informe del período completo.', code }, { status })
  }
}
