import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export const DOCUMENT_MAX_ATTEMPTS = 6
export const DOCUMENT_RETRY_DELAY_MS = 5000

export type DocumentDistributionStatus = 'pending' | 'claimed' | 'sent' | 'failed' | 'bounced'

export async function getScheduledDocuments() {
  const now = new Date()
  
  const { data: schedules, error } = await supabase
    .from('document_schedules')
    .select('*')
    .eq('active', true)
    .lte('next_send_at', now.toISOString())
  
  if (error) throw error
  return schedules
}

export async function getRecipientsForSchedule(scheduleId: string) {
  const { data: recipients, error } = await supabase
    .from('document_recipients')
    .select('recipient_role')
    .eq('schedule_id', scheduleId)
    .eq('active', true)
  
  if (error) throw error
  
  // Get users by role
  const roles = recipients.map((r) => r.recipient_role)
  
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name, copilot_role')
    .in('copilot_role', roles)
  
  if (usersError) throw usersError
  
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: user.copilot_role,
  }))
}

export async function createDocumentDistributions(
  scheduleId: string,
  recipients: Array<{ email: string; role: string }>,
) {
  const distributions = recipients.map((recipient) => ({
    schedule_id: scheduleId,
    recipient_email: recipient.email,
    recipient_role: recipient.role,
    status: 'pending',
    attempt_count: 0,
  }))
  
  const { data, error } = await supabase
    .from('document_distributions')
    .insert(distributions)
    .select()
  
  if (error) throw error
  return data
}

export async function claimDocumentDistribution(
  distributionId: string,
): Promise<{ schedule_id: string; recipient_email: string } | null> {
  const { data, error } = await supabase
    .from('document_distributions')
    .select('schedule_id, recipient_email')
    .eq('id', distributionId)
    .eq('status', 'pending')
    .single()
  
  if (error || !data) return null
  
  const updateError = await supabase
    .from('document_distributions')
    .update({
      status: 'claimed',
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
    })
    .eq('id', distributionId)
  
  if (updateError.error) throw updateError.error
  return data
}

export async function sendDocumentEmail(
  distributionId: string,
  scheduleId: string,
  documentTitle: string,
  documentUrl: string,
  recipientEmail: string,
) {
  const subject = `Business Intelligence Document: ${documentTitle}`
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${documentTitle}</h1>
      <p>Scheduled Document Delivery</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your scheduled presentation document is ready for review.</p>
      <ul>
        <li><strong>Document:</strong> ${documentTitle}</li>
        <li><strong>Sent:</strong> ${new Date().toLocaleDateString('es-CL')} at ${new Date().toLocaleTimeString('es-CL')}</li>
        <li><strong>Type:</strong> Presentation (PDF/PPTX)</li>
      </ul>
      <p><a href="${documentUrl}" class="button">Download Document</a></p>
      <p>If you have any questions, please contact Property Partners Intelligence Support.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Property Partners. All rights reserved.</p>
      <p>Business Intelligence Property Partners | info@ppartnersgroup.app</p>
    </div>
  </div>
</body>
</html>`
  
  const text = `${documentTitle}\n\nYour scheduled presentation document is ready.\n\nDocument: ${documentTitle}\nSent: ${new Date().toLocaleDateString('es-CL')}\nType: Presentation\n\nDownload: ${documentUrl}`
  
  const resendResponse = await resend.emails.send({
    from: 'Business Intelligence Property Partners <info@ppartnersgroup.app>',
    to: recipientEmail,
    subject,
    html,
    text,
    tags: [
      { name: 'category', value: 'document_delivery' },
      { name: 'schedule_id', value: scheduleId },
    ],
  })
  
  if (resendResponse.error) {
    throw new Error(`Resend API error: ${resendResponse.error.message}`)
  }
  
  return resendResponse
}

export async function markDocumentAsSent(
  distributionId: string,
  externalReference: string,
) {
  const { error } = await supabase
    .from('document_distributions')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      external_reference: externalReference,
    })
    .eq('id', distributionId)
  
  if (error) throw error
  
  await supabase.from('document_delivery_events').insert({
    distribution_id: distributionId,
    event_type: 'sent',
    details: { sent_at: new Date().toISOString(), external_reference: externalReference },
  })
}

export async function markDocumentAsFailed(
  distributionId: string,
  errorMessage: string,
  attempt: number,
) {
  const isPermanent = errorMessage.includes('permanent') || attempt >= DOCUMENT_MAX_ATTEMPTS
  const nextAttemptAt = isPermanent
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + DOCUMENT_RETRY_DELAY_MS)
  
  const { error } = await supabase
    .from('document_distributions')
    .update({
      status: 'failed',
      error_message: errorMessage,
      attempt_count: attempt,
      last_attempted_at: new Date().toISOString(),
      next_attempt_at: nextAttemptAt.toISOString(),
    })
    .eq('id', distributionId)
  
  if (error) throw error
  
  await supabase.from('document_delivery_events').insert({
    distribution_id: distributionId,
    event_type: 'failed',
    details: { error: errorMessage, attempt, isPermanent },
  })
}

export async function updateScheduleNextSendAt(
  scheduleId: string,
  cadence: 'weekly' | 'monthly',
  dayOfWeek?: string,
  dayOfMonth?: number,
  sendTime: string = '09:00:00',
) {
  let nextSendAt = new Date()
  nextSendAt.setUTCHours(parseInt(sendTime.split(':')[0]), parseInt(sendTime.split(':')[1]), 0, 0)
  
  if (cadence === 'weekly' && dayOfWeek) {
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }
    
    const targetDay = dayMap[dayOfWeek.toLowerCase()]
    const currentDay = nextSendAt.getUTCDay()
    let daysAhead = targetDay - currentDay
    
    if (daysAhead <= 0) daysAhead += 7
    nextSendAt.setUTCDate(nextSendAt.getUTCDate() + daysAhead)
  } else if (cadence === 'monthly' && dayOfMonth) {
    nextSendAt.setUTCDate(dayOfMonth)
    if (nextSendAt <= new Date()) {
      nextSendAt.setUTCMonth(nextSendAt.getUTCMonth() + 1)
      nextSendAt.setUTCDate(dayOfMonth)
    }
  }
  
  const { error } = await supabase
    .from('document_schedules')
    .update({
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt.toISOString(),
    })
    .eq('id', scheduleId)
  
  if (error) throw error
}

export async function getPendingDocumentDistributions(limit = 50) {
  const { data, error } = await supabase
    .from('document_distributions')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data
}

export async function getDocumentDetails(scheduleId: string) {
  const { data, error } = await supabase
    .from('document_schedules')
    .select('documents(title, file_url, file_type), *')
    .eq('id', scheduleId)
    .single()
  
  if (error) throw error
  return data
}
