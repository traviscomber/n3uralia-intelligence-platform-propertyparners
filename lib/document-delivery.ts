import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateCeoReportPDFAttachment } from '@/lib/ceo-report-pdf-generator'
import { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery-core'

let supabase: SupabaseClient<any, 'public', any> | null = null
let resend: Resend | null = null

function getSupabase(): SupabaseClient<any, 'public', any> {
  if (!supabase) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase service configuration is missing')
    supabase = createClient<any>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabase
}

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is missing')
    resend = new Resend(apiKey)
  }
  return resend
}

export const DOCUMENT_MAX_ATTEMPTS = 6
export const DOCUMENT_RETRY_DELAY_MS = 5000

export type DocumentDistributionStatus = 'pending' | 'claimed' | 'sent' | 'failed' | 'bounced'

export async function getScheduledDocuments(): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from('document_schedules')
    .select('*')
    .eq('active', true)
    .lte('next_send_at', new Date().toISOString())
  if (error) throw error
  return data ?? []
}

export async function getRecipientsForSchedule(scheduleId: string) {
  const client = getSupabase()
  const { data: recipients, error } = await client
    .from('document_recipients')
    .select('recipient_role')
    .eq('schedule_id', scheduleId)
    .eq('active', true)
  if (error) throw error

  const roles = [...new Set((recipients ?? []).map((row: any) => row.recipient_role).filter(Boolean))]
  if (!roles.length) return []

  const { data: users, error: usersError } = await client
    .from('profiles')
    .select('id,email,full_name,copilot_role')
    .in('copilot_role', roles)
  if (usersError) throw usersError

  return (users ?? []).map((user: any) => ({
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: user.copilot_role,
  }))
}

export async function createDocumentDistributions(
  scheduleId: string,
  scheduledFor: string,
  recipients: Array<{ email: string; role: string }>,
) {
  if (!recipients.length) return []

  const client = getSupabase()
  const nextAttemptAt = new Date().toISOString()
  const created: any[] = []

  for (const recipient of recipients) {
    const { data, error } = await client
      .from('document_distributions')
      .insert({
        schedule_id: scheduleId,
        recipient_email: recipient.email.trim().toLowerCase(),
        recipient_role: recipient.role,
        status: 'pending' as DocumentDistributionStatus,
        attempt_count: 0,
        next_attempt_at: nextAttemptAt,
        scheduled_for: scheduledFor,
      } as any)
      .select()
      .single()

    if (error) {
      if ((error as any).code === '23505') continue
      throw error
    }

    if (data) created.push(data)
  }

  return created
}

export async function claimDocumentDistribution(
  distributionId: string,
): Promise<{ schedule_id: string; recipient_email: string } | null> {
  const client = getSupabase()
  const { data, error } = await client.rpc('claim_document_distribution', {
    p_distribution_id: distributionId,
  } as any)

  if (error) throw error

  const claimed = Array.isArray(data) ? data[0] : null
  if (!claimed) return null

  return {
    schedule_id: String((claimed as any).schedule_id),
    recipient_email: String((claimed as any).recipient_email),
  }
}

function emailContent(documentTitle: string, periodOverride?: string) {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago', hour: '2-digit', hour12: false,
  }).format(new Date()))
  const greeting = hour < 12 ? 'Buenos días' : 'Buenas tardes'
  const period = periodOverride || documentTitle.match(/\d{4}-\d{2}/)?.[0] || 'Período actual'
  const html = `
    <div style="font-family:Calibri,Arial,sans-serif;background:#f1f1f1;padding:24px">
      <div style="max-width:600px;margin:auto;background:#fff">
        <div style="background:#000;color:#fff;padding:32px;text-align:center;border-bottom:3px solid #e74c3c">
          <h1 style="font-size:24px;margin:0 0 10px">${documentTitle}</h1>
          <div style="font-size:12px;color:#ccc">${period}</div>
        </div>
        <div style="padding:36px;color:#333">
          <p><strong>${greeting},</strong></p>
          <p>Adjunto encontrarás el reporte integral ejecutivo de Property Partners.</p>
          <p>El documento fue generado por el sistema de Business Intelligence y se entrega como archivo PDF.</p>
          <hr style="border:0;border-top:1px solid #ddd;margin:28px 0">
          <p style="font-size:12px;color:#666">Property Partners Intelligence<br>info@ppartnersgroup.app<br>www.ppartnersgroup.app</p>
        </div>
      </div>
    </div>`
  const text = `${greeting},\n\nAdjunto encontrarás ${documentTitle}, correspondiente a ${period}.\n\nProperty Partners Intelligence\ninfo@ppartnersgroup.app`
  return { html, text }
}

export async function sendDocumentEmail(
  _distributionId: string,
  scheduleId: string,
  documentTitle: string,
  _documentUrl: string,
  recipientEmail: string,
  periodOverride?: string,
) {
  const configuration = getManagementReportDeliveryConfiguration()
  if (!configuration) throw new Error('Report email configuration is missing')

  const { html, text } = emailContent(documentTitle, periodOverride)
  const attachments: Array<{ filename: string; content: string; content_type?: string }> = []
  if (documentTitle.includes('Reporte Integral')) {
    const reportAttachment = await generateCeoReportPDFAttachment(periodOverride)
    attachments.push({
      filename: reportAttachment.filename,
      content: reportAttachment.content,
      content_type: reportAttachment.contentType,
    })
  }

  const result = await getResend().emails.send({
    from: configuration.from,
    to: recipientEmail,
    subject: `Business Intelligence Document: ${documentTitle}`,
    html,
    text,
    attachments: attachments.length ? attachments : undefined,
    tags: [
      { name: 'category', value: 'document_delivery' },
      { name: 'schedule_id', value: scheduleId },
    ],
  })
  if (result.error) throw new Error(`Resend API error: ${result.error.message}`)
  return result
}

export async function markDocumentAsSent(distributionId: string, externalReference: string) {
  const client = getSupabase()
  const sentAt = new Date().toISOString()
  const { error } = await client
    .from('document_distributions')
    .update({ status: 'sent', sent_at: sentAt, external_reference: externalReference } as any)
    .eq('id', distributionId)
  if (error) throw error
  await client.from('document_delivery_events').insert({
    distribution_id: distributionId,
    event_type: 'sent',
    details: { sent_at: sentAt, external_reference: externalReference },
  } as any)
}

export async function markDocumentAsFailed(
  distributionId: string,
  errorMessage: string,
  attempt: number,
) {
  const client = getSupabase()
  const isPermanent = errorMessage.includes('permanent') || attempt >= DOCUMENT_MAX_ATTEMPTS
  const delay = isPermanent ? 365 * 24 * 60 * 60 * 1000 : DOCUMENT_RETRY_DELAY_MS
  const now = new Date()
  const nextStatus: DocumentDistributionStatus = isPermanent ? 'failed' : 'pending'
  const { error } = await client
    .from('document_distributions')
    .update({
      status: nextStatus,
      error_message: errorMessage.slice(0, 1000),
      attempt_count: attempt,
      last_attempted_at: now.toISOString(),
      next_attempt_at: new Date(now.getTime() + delay).toISOString(),
    } as any)
    .eq('id', distributionId)
  if (error) throw error
  await client.from('document_delivery_events').insert({
    distribution_id: distributionId,
    event_type: 'failed',
    details: { error: errorMessage, attempt, isPermanent, next_status: nextStatus },
  } as any)
}

export async function updateScheduleNextSendAt(
  scheduleId: string,
  cadence: 'weekly' | 'monthly',
  dayOfWeek?: string,
  dayOfMonth?: number,
  sendTime = '09:00:00',
) {
  const [hours, minutes] = sendTime.split(':').map(Number)
  const next = new Date()
  next.setUTCHours(hours || 0, minutes || 0, 0, 0)

  if (cadence === 'weekly' && dayOfWeek) {
    const days: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
    const target = days[dayOfWeek.toLowerCase()]
    if (target !== undefined) {
      let delta = target - next.getUTCDay()
      if (delta <= 0) delta += 7
      next.setUTCDate(next.getUTCDate() + delta)
    }
  } else if (cadence === 'monthly' && dayOfMonth) {
    next.setUTCDate(dayOfMonth)
    if (next <= new Date()) next.setUTCMonth(next.getUTCMonth() + 1)
  }

  const { error } = await getSupabase()
    .from('document_schedules')
    .update({ last_sent_at: new Date().toISOString(), next_send_at: next.toISOString() } as any)
    .eq('id', scheduleId)
  if (error) throw error
}

export async function getPendingDocumentDistributions(limit = 50) {
  const { data, error } = await getSupabase()
    .from('document_distributions')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getDocumentDetails(scheduleId: string) {
  const { data, error } = await getSupabase()
    .from('document_schedules')
    .select('documents(title,file_url,file_type),*')
    .eq('id', scheduleId)
    .single()
  if (error) throw error
  return data
}
