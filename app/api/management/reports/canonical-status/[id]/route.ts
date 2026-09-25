import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCanonicalReportContent } from '@/lib/canonical-report-delivery'

export const dynamic = 'force-dynamic'

const WORKFLOW_STATUSES = new Set(['draft', 'review', 'approved'])
const STATUS_TAGS = new Set(['draft', 'review', 'approved', 'sent', 'resent', 'acknowledged', 'registered'])

function supportedReportType(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const reportType = String((value as Record<string, unknown>).report_type ?? '')
  return reportType === 'n3uralia_client_canonical' || reportType === 'property_partners_ceo_intelligence'
}

function nextStatusAllowed(current: string, next: string) {
  if (current === next) return true
  return (current === 'draft' && next === 'review') || (current === 'review' && next === 'approved')
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const body = await request.json().catch(() => null)
  const nextStatus = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : ''
  if (!WORKFLOW_STATUSES.has(nextStatus)) {
    return NextResponse.json({ error: 'Estado de revisión inválido.' }, { status: 400 })
  }

  const { id } = await context.params
  const supabase = createAdminClient()
  const { data: document, error } = await supabase
    .from('knowledge_documents')
    .select('id,title,content,doc_type,tags,created_at')
    .eq('id', id)
    .eq('doc_type', 'report')
    .maybeSingle()

  if (error) {
    console.error('CANONICAL_REPORT_STATUS_LOOKUP_FAILED', { reportId: id, code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar el informe.' }, { status: 500 })
  }
  if (!document) return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })

  const tags = Array.isArray(document.tags) ? document.tags.filter((tag): tag is string => typeof tag === 'string') : []
  const parsed = parseCanonicalReportContent(document.content)
  if (!tags.includes('canonical') || !tags.includes('n3uralia-client-report') || !supportedReportType(parsed)) {
    return NextResponse.json({ error: 'El documento no corresponde a un informe canónico revisable.' }, { status: 422 })
  }

  const delivery = parsed?.delivery && typeof parsed.delivery === 'object' && !Array.isArray(parsed.delivery)
    ? parsed.delivery as Record<string, unknown>
    : {}
  const currentStatus = typeof delivery.status === 'string' ? delivery.status.toLowerCase() : tags.includes('approved') ? 'approved' : 'draft'

  if (!WORKFLOW_STATUSES.has(currentStatus)) {
    return NextResponse.json({ error: 'El informe ya salió del flujo de revisión interna.' }, { status: 409 })
  }
  if (!nextStatusAllowed(currentStatus, nextStatus)) {
    return NextResponse.json({ error: 'Transición de estado no permitida.' }, { status: 409 })
  }

  if (currentStatus === nextStatus) {
    return NextResponse.json({ id, status: currentStatus, unchanged: true })
  }

  const now = new Date().toISOString()
  const updatedDelivery: Record<string, unknown> = { ...delivery, status: nextStatus }
  if (nextStatus === 'review') {
    updatedDelivery.reviewedAt = now
    updatedDelivery.reviewedBy = access.userId
  }
  if (nextStatus === 'approved') {
    updatedDelivery.approvedAt = now
    updatedDelivery.approvedBy = access.userId
  }

  const updatedContent = JSON.stringify({ ...parsed, delivery: updatedDelivery })
  const updatedTags = [...tags.filter((tag) => !STATUS_TAGS.has(tag)), nextStatus]

  const { data: updated, error: updateError } = await supabase
    .from('knowledge_documents')
    .update({ content: updatedContent, tags: updatedTags })
    .eq('id', id)
    .select('id,title,content,tags,created_at')
    .single()

  if (updateError) {
    console.error('CANONICAL_REPORT_STATUS_UPDATE_FAILED', { reportId: id, code: updateError.code })
    return NextResponse.json({ error: 'No fue posible actualizar el estado del informe.' }, { status: 500 })
  }

  const { error: auditError } = await supabase.from('report_directory_audit_log').insert({
    actor_id: access.userId,
    action: nextStatus === 'approved' ? 'approve' : 'review',
    entity_type: 'canonical_report',
    entity_id: id,
    before_state: { status: currentStatus, tags },
    after_state: { status: nextStatus, tags: updatedTags, changed_at: now },
  })
  if (auditError) {
    console.error('CANONICAL_REPORT_STATUS_AUDIT_FAILED', { reportId: id, code: auditError.code })
    return NextResponse.json({ error: 'El estado cambió, pero no fue posible registrar la auditoría.' }, { status: 500 })
  }

  return NextResponse.json({ id: updated.id, status: nextStatus, changedAt: now })
}
