import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCanonicalClientReport,
  getCanonicalClientReportConfiguration,
  type CanonicalClientReportInput,
  type CanonicalContractItem,
  type CanonicalDelivery,
  type CanonicalEvidence,
  type CanonicalPortalFeature,
} from '@/lib/n3uralia-canonical-client-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STATUSES = new Set(['complete', 'partial', 'pending_client', 'pending_n3uralia'])
const EVIDENCE_STATUSES = new Set(['verified', 'partial', 'pending_client', 'pending_n3uralia'])
const DELIVERY_STATUSES = new Set(['draft', 'sent', 'resent', 'acknowledged'])
const PAYMENT_STATUSES = new Set(['not_applicable', 'pending', 'received'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown, field: string, maxLength = 12_000): string {
  if (typeof value !== 'string') throw new Error(`INVALID_${field.toUpperCase()}`)
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) throw new Error(`INVALID_${field.toUpperCase()}`)
  return normalized
}

function readDate(value: unknown, field: string): string {
  const text = readString(value, field, 32)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`INVALID_${field.toUpperCase()}`)
  return text
}

function readStringArray(value: unknown, field: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`INVALID_${field.toUpperCase()}`)
  return value.map((item, index) => readString(item, `${field}_${index}`, 4_000))
}

function readEvidence(value: unknown): CanonicalEvidence[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 250) throw new Error('INVALID_VERIFIED_EVIDENCE')
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`INVALID_EVIDENCE_${index}`)
    const status = item.status === undefined ? 'verified' : readString(item.status, `evidence_status_${index}`, 32)
    if (!EVIDENCE_STATUSES.has(status)) throw new Error(`INVALID_EVIDENCE_STATUS_${index}`)
    return {
      id: readString(item.id, `evidence_id_${index}`, 160),
      claim: readString(item.claim, `evidence_claim_${index}`, 8_000),
      source: readString(item.source, `evidence_source_${index}`, 1_000),
      status: status as CanonicalEvidence['status'],
    }
  })
}

function readPortalFeatures(value: unknown): CanonicalPortalFeature[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error('INVALID_PORTAL_FEATURES')
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`INVALID_PORTAL_FEATURE_${index}`)
    const status = readString(item.status, `portal_status_${index}`, 32)
    if (!STATUSES.has(status)) throw new Error(`INVALID_PORTAL_STATUS_${index}`)
    return {
      name: readString(item.name, `portal_name_${index}`, 300),
      status: status as CanonicalPortalFeature['status'],
      evidence: readString(item.evidence, `portal_evidence_${index}`, 6_000),
    }
  })
}

function readContractualProgress(value: unknown): CanonicalContractItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 150) throw new Error('INVALID_CONTRACTUAL_PROGRESS')
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`INVALID_CONTRACT_ITEM_${index}`)
    const status = readString(item.status, `contract_status_${index}`, 32)
    if (!STATUSES.has(status)) throw new Error(`INVALID_CONTRACT_STATUS_${index}`)
    return {
      requirement: readString(item.requirement, `contract_requirement_${index}`, 500),
      status: status as CanonicalContractItem['status'],
      evidence: readString(item.evidence, `contract_evidence_${index}`, 6_000),
      dependency: typeof item.dependency === 'string' && item.dependency.trim()
        ? readString(item.dependency, `contract_dependency_${index}`, 4_000)
        : undefined,
    }
  })
}

function readDelivery(value: unknown): CanonicalDelivery {
  if (!isRecord(value)) throw new Error('INVALID_DELIVERY')
  const status = readString(value.status, 'delivery_status', 32)
  const paymentStatus = readString(value.paymentStatus, 'payment_status', 32)
  if (!DELIVERY_STATUSES.has(status)) throw new Error('INVALID_DELIVERY_STATUS')
  if (!PAYMENT_STATUSES.has(paymentStatus)) throw new Error('INVALID_PAYMENT_STATUS')

  const rawMilestone = value.paymentMilestonePercent
  const milestone = rawMilestone === null || rawMilestone === undefined ? null : Number(rawMilestone)
  if (milestone !== null && (!Number.isFinite(milestone) || milestone < 0 || milestone > 100)) {
    throw new Error('INVALID_PAYMENT_MILESTONE')
  }

  const deliveredAt = value.deliveredAt === null || value.deliveredAt === undefined
    ? null
    : readString(value.deliveredAt, 'delivered_at', 64)

  return {
    recipient: value.recipient === null || value.recipient === undefined
      ? null
      : readString(value.recipient, 'recipient', 300),
    status: status as CanonicalDelivery['status'],
    purpose: readString(value.purpose, 'delivery_purpose', 2_000),
    paymentMilestonePercent: milestone,
    paymentStatus: paymentStatus as CanonicalDelivery['paymentStatus'],
    deliveredAt,
  }
}

function parseInput(value: unknown): CanonicalClientReportInput {
  if (!isRecord(value)) throw new Error('INVALID_BODY')
  const input: CanonicalClientReportInput = {
    title: readString(value.title, 'title', 500),
    client: readString(value.client, 'client', 500),
    periodStart: readDate(value.periodStart, 'period_start'),
    periodEnd: readDate(value.periodEnd, 'period_end'),
    sourceCutoff: readDate(value.sourceCutoff, 'source_cutoff'),
    purpose: readString(value.purpose, 'purpose', 2_000),
    audience: readString(value.audience, 'audience', 500),
    verifiedEvidence: readEvidence(value.verifiedEvidence),
    portalFeatures: readPortalFeatures(value.portalFeatures),
    contractualProgress: readContractualProgress(value.contractualProgress),
    clientDependencies: readStringArray(value.clientDependencies, 'client_dependencies'),
    n3uraliaNextSteps: readStringArray(value.n3uraliaNextSteps, 'n3uralia_next_steps'),
    delivery: readDelivery(value.delivery),
  }

  if (input.periodStart > input.periodEnd || input.periodEnd > input.sourceCutoff) {
    throw new Error('INVALID_PERIOD_ORDER')
  }

  return input
}

export async function GET() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  return NextResponse.json({ configuration: getCanonicalClientReportConfiguration() })
}

export async function POST(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  try {
    const input = parseInput(await request.json())
    const report = await generateCanonicalClientReport(input)
    const supabase = createAdminClient()
    const periodTag = `${input.periodStart}_${input.periodEnd}`

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
          'openai-gpt-5.6-sol',
          periodTag,
          report.delivery.status,
          report.delivery.paymentMilestonePercent !== null
            ? `payment-milestone-${report.delivery.paymentMilestonePercent}`
            : 'payment-not-applicable',
          report.delivery.paymentStatus === 'received' ? 'payment-received' : 'payment-pending',
        ],
      })
      .select('id, created_at')
      .single()

    if (error || !data) throw error || new Error('REPORT_PERSISTENCE_FAILED')

    const { error: auditError } = await supabase.from('report_directory_audit_log').insert({
      actor_id: access.userId,
      action: 'create',
      entity_type: 'n3uralia_client_canonical',
      entity_id: data.id,
      before_state: null,
      after_state: {
        title: report.title,
        client: report.client,
        period: report.period,
        delivery: report.delivery,
        canonical_metadata: report.canonical_metadata,
      },
    })

    if (auditError) console.error('CANONICAL_CLIENT_REPORT_AUDIT_FAILED', { reportId: data.id })

    return NextResponse.json({ id: data.id, createdAt: data.created_at, report }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CANONICAL_CLIENT_REPORT_FAILED'
    const status = code === 'OPENAI_API_KEY_MISSING' ? 503 : code.startsWith('INVALID_') ? 400 : 500
    console.error('CANONICAL_CLIENT_REPORT_FAILED', { code })
    return NextResponse.json(
      {
        error: status === 503
          ? 'La generación canónica está pendiente de configurar OPENAI_API_KEY.'
          : status === 400
            ? 'El paquete de fuentes canónicas no cumple el contrato requerido.'
            : 'No fue posible generar el informe canónico.',
        code,
      },
      { status },
    )
  }
}
