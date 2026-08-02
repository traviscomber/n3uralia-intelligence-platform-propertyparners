import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery-core'
import { generateCeoReportPDFAttachment } from '@/lib/ceo-report-pdf-generator'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const resend = new Resend(process.env.RESEND_API_KEY!)
const reportConfig = getManagementReportDeliveryConfiguration()

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

  // Parse the period (YYYY-MM) out of the title so we can show it once, formatted nicely,
  // and strip the redundant trailing period/brand text from the displayed title.
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const periodMatch = documentTitle.match(/(\d{4})-(\d{2})/)
  let periodLabel = 'Período actual'
  let cleanTitle = documentTitle
  if (periodMatch) {
    const year = periodMatch[1]
    const monthIndex = parseInt(periodMatch[2], 10) - 1
    if (monthIndex >= 0 && monthIndex < 12) {
      periodLabel = `${monthNames[monthIndex]} ${year}`
    }
    cleanTitle = documentTitle
      .replace(/\s*[-–—]\s*Property Partners\s*\d{4}-\d{2}\s*$/i, '')
      .replace(/\s*\d{4}-\d{2}\s*$/, '')
      .trim()
  }

  const html = `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-collapse: collapse;">
        <tr>
          <td style="background-color: #000000; padding: 0; text-align: center; font-size: 0; line-height: 0;">
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-bcIKL0Aq2V18sQvduTI22Aow5vCOY2.png" alt="Property Partners Vitacura" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
          </td>
        </tr>
        <tr>
          <td style="background-color: #E74C3C; font-size: 0; line-height: 0; height: 3px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="background-color: #111111; color: white; padding: 36px 40px; text-align: center;">
            <p style="font-family: Calibri, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #E74C3C; margin: 0 0 12px 0; font-weight: bold;">Reporte Integral Ejecutivo</p>
            <h2 style="font-family: Calibri, sans-serif; font-size: 25px; line-height: 1.25; margin: 0 0 16px 0; color: white; font-weight: bold;">${cleanTitle}</h2>
            <span style="display: inline-block; font-family: Calibri, sans-serif; font-size: 11px; letter-spacing: 1px; color: #dddddd; border: 1px solid #444444; border-radius: 20px; padding: 6px 16px;">${periodLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px; background-color: white;">
            <p style="font-family: Calibri, sans-serif; font-size: 15px; font-weight: bold; color: #111; margin: 0 0 16px 0;">Buenos días,</p>
            <p style="font-family: Calibri, sans-serif; font-size: 13px; color: #555; margin: 0 0 28px 0; line-height: 1.7;">Adjunto encontrarás el reporte integral ejecutivo correspondiente a ${periodLabel}. Este documento contiene el análisis completo de desempeño, inteligencia de mercado y recomendaciones estratégicas.</p>

            <p style="font-family: Calibri, sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #111; margin: 0 0 14px 0;">Contenido del reporte</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 28px 0;">
              <tr><td style="font-family: Calibri, sans-serif; font-size: 13px; color: #444; padding: 7px 0; border-bottom: 1px solid #f0f0f0;"><span style="color: #E74C3C; font-weight: bold;">›</span>&nbsp;&nbsp;Modelo de scoring con métricas de desempeño</td></tr>
              <tr><td style="font-family: Calibri, sans-serif; font-size: 13px; color: #444; padding: 7px 0; border-bottom: 1px solid #f0f0f0;"><span style="color: #E74C3C; font-weight: bold;">›</span>&nbsp;&nbsp;Tabla de evolución con 6 meses de datos históricos</td></tr>
              <tr><td style="font-family: Calibri, sans-serif; font-size: 13px; color: #444; padding: 7px 0; border-bottom: 1px solid #f0f0f0;"><span style="color: #E74C3C; font-weight: bold;">›</span>&nbsp;&nbsp;Sistema de semáforo (Verde / Amarillo / Rojo)</td></tr>
              <tr><td style="font-family: Calibri, sans-serif; font-size: 13px; color: #444; padding: 7px 0; border-bottom: 1px solid #f0f0f0;"><span style="color: #E74C3C; font-weight: bold;">›</span>&nbsp;&nbsp;Análisis de cumplimiento vs. objetivos</td></tr>
              <tr><td style="font-family: Calibri, sans-serif; font-size: 13px; color: #444; padding: 7px 0;"><span style="color: #E74C3C; font-weight: bold;">›</span>&nbsp;&nbsp;Indicadores clave de negocio y productividad</td></tr>
            </table>

            <table width="100%" cellpadding="16" cellspacing="0" style="background-color: #f8f9fb; border-left: 3px solid #111111; margin: 0 0 28px 0; border-collapse: collapse;">
              <tr>
                <td style="font-family: Calibri, sans-serif; font-size: 12px; color: #444; line-height: 1.6;"><strong style="color:#111;">Documento adjunto.</strong> El reporte completo está adjunto como archivo HTML; puedes abrirlo en cualquier navegador o imprimirlo a PDF.</td>
              </tr>
            </table>

            <p style="font-family: Calibri, sans-serif; font-size: 13px; color: #555; margin: 0 0 32px 0; line-height: 1.7;">Quedamos atentos si tienes preguntas sobre los datos o necesitas información adicional.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e6e6e6; border-collapse: collapse;">
              <tr>
                <td style="font-family: Calibri, sans-serif; font-size: 12px; color: #666; padding-top: 22px;">
                  <p style="margin: 0 0 6px 0; font-weight: bold; color: #111;">Property Partners Intelligence</p>
                  <p style="margin: 3px 0;"><a href="mailto:info@ppartnersgroup.app" style="color: #E74C3C; text-decoration: none;">info@ppartnersgroup.app</a></p>
                  <p style="margin: 3px 0;"><a href="https://www.ppartnersgroup.app" style="color: #E74C3C; text-decoration: none;">www.ppartnersgroup.app</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color: #111111; padding: 22px; text-align: center; font-family: Calibri, sans-serif; font-size: 10px; color: #999;">
            <p style="margin: 3px 0;">© ${new Date().getFullYear()} Property Partners Group · Vitacura. Todos los derechos reservados.</p>
            <p style="margin: 3px 0; color: #666;">Información confidencial destinada exclusivamente a su destinatario.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
  
  const text = `${cleanTitle}\n${periodLabel}\n\nBuenos días,\n\nAdjunto encontrarás el reporte integral ejecutivo correspondiente a ${periodLabel}.\n\nCONTENIDO DEL REPORTE:\n- Modelo de scoring con métricas de desempeño\n- Tabla de evolución con 6 meses de datos históricos\n- Sistema de semáforo (Verde/Amarillo/Rojo)\n- Análisis de cumplimiento vs objetivos\n- Indicadores clave de negocio y productividad\n\nEl reporte completo está adjunto como archivo HTML; puedes abrirlo en cualquier navegador.\n\nQuedamos atentos si tienes preguntas sobre los datos o necesitas información adicional.\n\nProperty Partners Intelligence\ninfo@ppartnersgroup.app\nwww.ppartnersgroup.app\n\n© ${new Date().getFullYear()} Property Partners Group · Vitacura. Todos los derechos reservados.`
  
  const senderEmail = reportConfig?.from || 'Business Intelligence Property Partners <info@ppartnersgroup.app>'
  
  // Logo is embedded in the email header via a public image URL (no separate attachment needed)
  let attachments: any[] = []

  // Generate and attach CEO report if it's a CEO report document
  if (documentTitle.includes('Reporte Integral')) {
    try {
      const reportAttachment = await generateCeoReportPDFAttachment()
      attachments.push({
        filename: reportAttachment.filename,
        content: reportAttachment.content,
        content_type: reportAttachment.contentType,
      })
    } catch (attachmentError) {
      console.error('[Document Delivery] Failed to generate report attachment:', attachmentError)
    }
  }
  
  const resendResponse = await resend.emails.send({
    from: senderEmail,
    to: recipientEmail,
    subject,
    html,
    text,
    attachments: attachments.length > 0 ? attachments : undefined,
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
