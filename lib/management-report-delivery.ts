import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'
import {
  buildManagementReportEmailContent,
  getManagementReportDeliveryConfiguration,
  managementReportRetryDelayMs,
  type ManagementReportDeliveryConfiguration,
} from '@/lib/management-report-delivery-core'

export { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery-core'

type DistributionRow = {
  id: string
  report_run_id: string
  recipient: string
  channel: string
  status: string
  attempt_count: number
  metadata?: Record<string, unknown> | null
}

type DeliveryOptions = {
  limit?: number
  now?: Date
  workerId?: string
  fetcher?: typeof fetch
}

const MAX_ATTEMPTS = 6
const DEFAULT_LIMIT = 20

function validRecipient(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

async function sendWithResend(input: {
  configuration: ManagementReportDeliveryConfiguration
  distribution: DistributionRow
  report: ManagementReportRecord
  pdf: { bytes: Uint8Array; filename: string }
  fetcher: typeof fetch
}) {
  const artifactUrl = input.configuration.appBaseUrl
    ? `${input.configuration.appBaseUrl}/api/management/reports/${input.report.id}/artifact`
    : null
  const content = buildManagementReportEmailContent(input.report, artifactUrl)
  const body: Record<string, unknown> = {
    from: input.configuration.from,
    to: [input.distribution.recipient],
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: [{
      filename: input.pdf.filename,
      content: Buffer.from(input.pdf.bytes).toString('base64'),
    }],
    tags: [
      { name: 'category', value: 'management_report' },
      { name: 'report_type', value: input.report.report_type.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256) },
    ],
  }
  if (input.configuration.replyTo) body.reply_to = input.configuration.replyTo

  const response = await input.fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.configuration.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `management-report-${input.distribution.id}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null) as { id?: string; message?: string; name?: string } | null
  if (!response.ok || !payload?.id) {
    const message = payload?.message || payload?.name || `Proveedor respondió HTTP ${response.status}`
    const permanent = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status)
    throw Object.assign(new Error(message), { permanent, status: response.status })
  }

  return { providerMessageId: payload.id }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : 'Error de entrega no identificado'
}

function isPermanent(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'permanent' in error && (error as { permanent?: boolean }).permanent)
}

export async function runManagementReportDelivery(options: DeliveryOptions = {}) {
  const configuration = getManagementReportDeliveryConfiguration()
  if (!configuration) {
    return {
      configured: false,
      provider: null,
      claimed: 0,
      sent: 0,
      failed: 0,
      terminal: 0,
      results: [],
      reason: 'Faltan RESEND_API_KEY o REPORT_FROM_EMAIL.',
    }
  }

  const supabase = createAdminClient()
  const now = options.now ?? new Date()
  const workerId = options.workerId ?? crypto.randomUUID()
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 100))
  const fetcher = options.fetcher ?? fetch
  const claim = await supabase.rpc('claim_management_report_distributions', {
    p_limit: limit,
    p_worker_id: workerId,
  })
  if (claim.error) throw new Error(claim.error.message)

  const distributions = (claim.data ?? []) as DistributionRow[]
  if (!distributions.length) {
    return {
      configured: true,
      provider: configuration.provider,
      claimed: 0,
      sent: 0,
      failed: 0,
      terminal: 0,
      results: [],
    }
  }

  const reportIds = [...new Set(distributions.map((item) => item.report_run_id))]
  const reportResult = await supabase
    .from('management_report_runs')
    .select('id,report_type,period_start,period_end,generated_at,snapshot')
    .in('id', reportIds)
  if (reportResult.error) throw new Error(reportResult.error.message)
  const reports = new Map((reportResult.data ?? []).map((item) => [item.id, item as ManagementReportRecord]))

  const results: Array<Record<string, unknown>> = []

  for (const distribution of distributions) {
    const report = reports.get(distribution.report_run_id)
    try {
      if (!report) throw Object.assign(new Error('Reporte no encontrado.'), { permanent: true })
      if (distribution.channel !== 'email') throw Object.assign(new Error(`Canal no soportado: ${distribution.channel}`), { permanent: true })
      if (!validRecipient(distribution.recipient)) throw Object.assign(new Error('Destinatario inválido.'), { permanent: true })

      const pdf = await buildManagementReportPdf(report)
      const delivery = await sendWithResend({ configuration, distribution, report, pdf, fetcher })
      const sentAt = new Date().toISOString()
      const update = await supabase
        .from('management_report_distributions')
        .update({
          status: 'sent',
          provider: configuration.provider,
          provider_message_id: delivery.providerMessageId,
          external_reference: delivery.providerMessageId,
          sent_at: sentAt,
          last_event_at: sentAt,
          locked_at: null,
          locked_by: null,
          error_message: null,
          metadata: {
            ...(distribution.metadata ?? {}),
            artifactFormat: 'pdf',
            artifactGeneratedAt: sentAt,
          },
        })
        .eq('id', distribution.id)
        .eq('locked_by', workerId)
      if (update.error) throw new Error(update.error.message)

      const remaining = await supabase
        .from('management_report_distributions')
        .select('id', { count: 'exact', head: true })
        .eq('report_run_id', report.id)
        .in('status', ['pending', 'processing', 'failed'])
      if (!remaining.error && (remaining.count ?? 0) === 0) {
        await supabase
          .from('management_report_runs')
          .update({
            status: 'distributed',
            distributed_at: sentAt,
            distribution_reference: configuration.provider,
          })
          .eq('id', report.id)
      }

      results.push({
        distributionId: distribution.id,
        reportId: report.id,
        status: 'sent',
        providerMessageId: delivery.providerMessageId,
      })
    } catch (error) {
      const permanent = isPermanent(error) || distribution.attempt_count >= MAX_ATTEMPTS
      const nextAttemptAt = new Date(
        now.getTime() + (permanent ? 365 * 24 * 60 * 60 * 1000 : managementReportRetryDelayMs(distribution.attempt_count)),
      ).toISOString()
      const message = errorMessage(error)
      const update = await supabase
        .from('management_report_distributions')
        .update({
          status: 'failed',
          provider: configuration.provider,
          error_message: message,
          next_attempt_at: nextAttemptAt,
          locked_at: null,
          locked_by: null,
          metadata: {
            ...(distribution.metadata ?? {}),
            terminalFailure: permanent,
            failedAt: new Date().toISOString(),
          },
        })
        .eq('id', distribution.id)
        .eq('locked_by', workerId)
      if (update.error) console.error('[management-report-delivery] unable to persist failure', { distributionId: distribution.id, message: update.error.message })
      results.push({
        distributionId: distribution.id,
        reportId: distribution.report_run_id,
        status: permanent ? 'terminal_failure' : 'failed',
        nextAttemptAt,
        error: message,
      })
    }
  }

  return {
    configured: true,
    provider: configuration.provider,
    claimed: distributions.length,
    sent: results.filter((item) => item.status === 'sent').length,
    failed: results.filter((item) => item.status === 'failed').length,
    terminal: results.filter((item) => item.status === 'terminal_failure').length,
    results,
  }
}
