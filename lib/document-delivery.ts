import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getManagementReportDeliveryConfiguration } from '@/lib/management-report-delivery-core'
import { generateCeoReportPDFAttachment } from '@/lib/ceo-report-pdf-generator'

// Load the Property Partners logo once and cache it as base64 for inline (CID) email embedding
let cachedLogoBase64: string | null = null
function getEmailLogoBase64(): string | null {
  if (cachedLogoBase64 !== null) return cachedLogoBase64
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'pp-email-logo.png')
    cachedLogoBase64 = readFileSync(logoPath).toString('base64')
  } catch (error) {
    console.error('[Document Delivery] Failed to load email logo:', error)
    cachedLogoBase64 = ''
  }
  return cachedLogoBase64 || null
}

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
  const logoBase64 = getEmailLogoBase64()
  
  const html = `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-collapse: collapse;">
        <tr>
          <td style="background-color: #000000; padding: 30px; text-align: center;">
            ${logoBase64
              ? `<img src="cid:pplogo" alt="Property Partners Vitacura" width="360" style="display: block; margin: 0 auto; max-width: 360px; width: 100%; height: auto;">`
              : `<p style="font-family: Calibri, sans-serif; font-size: 42px; font-weight: bold; color: white; margin: 0 0 5px 0; letter-spacing: 2px;">PROPERTY PARTNERS</p>
                 <p style="font-family: Calibri, sans-serif; font-size: 28px; font-weight: bold; color: #E74C3C; margin: 0; letter-spacing: 3px;">VITACURA</p>
                 <p style="font-family: Calibri, sans-serif; font-size: 11px; color: #999; margin: 8px 0 0 0;">Inteligencia de mercado Vitacura</p>`}
          </td>
        </tr>
        <tr>
          <td style="background-color: #000000; color: white; padding: 30px; text-align: center;">
            <h2 style="font-family: Calibri, sans-serif; font-size: 24px; margin: 0 0 10px 0; color: white;">${documentTitle}</h2>
            <p style="font-family: Calibri, sans-serif; font-size: 12px; margin: 0; color: #ccc;">Período 2026-08</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: white;">
            <p style="font-family: Calibri, sans-serif; font-size: 14px; font-weight: bold; color: #000; margin: 0 0 15px 0;">Buenos días,</p>
            <p style="font-family: Calibri, sans-serif; font-size: 13px; color: #555; margin: 0 0 20px 0; line-height: 1.6;">Adjunto encontrarás el reporte integral ejecutivo correspondiente a este período. Este documento contiene análisis completo de desempeño, inteligencia de mercado y recomendaciones estratégicas.</p>
            
            <p style="font-family: Calibri, sans-serif; font-size: 13px; font-weight: bold; color: #1565C0; margin: 20px 0 10px 0;">Contenido del Reporte:</p>
            <ul style="font-family: Calibri, sans-serif; font-size: 13px; color: #555; margin: 0 0 20px 20px; padding: 0;">
              <li style="margin: 5px 0;">Modelo de scoring con métricas de desempeño</li>
              <li style="margin: 5px 0;">Tabla de evolución con 6 meses de datos</li>
              <li style="margin: 5px 0;">Sistema de tráfico (Verde/Amarillo/Rojo)</li>
              <li style="margin: 5px 0;">Análisis de cumplimiento vs objetivos</li>
              <li style="margin: 5px 0;">Indicadores clave de negocio</li>
            </ul>

            <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #fffbea; border-left: 3px solid #f39c12; margin: 20px 0; border-collapse: collapse;">
              <tr>
                <td style="font-family: Calibri, sans-serif; font-size: 12px; color: #333;">El reporte está adjunto como archivo HTML. Puedes abrirlo en cualquier navegador.</td>
              </tr>
            </table>

            <p style="font-family: Calibri, sans-serif; font-size: 13px; color: #555; margin: 20px 0; line-height: 1.6;">Contáctanos si tienes preguntas sobre los datos o necesitas información adicional.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; border-collapse: collapse;">
              <tr>
                <td style="font-family: Calibri, sans-serif; font-size: 12px; color: #666; padding-top: 15px;">
                  <p style="margin: 0 0 5px 0; font-weight: bold;">Property Partners Intelligence</p>
                  <p style="margin: 3px 0;"><a href="mailto:info@ppartnersgroup.app" style="color: #1565C0; text-decoration: none;">info@ppartnersgroup.app</a></p>
                  <p style="margin: 3px 0;"><a href="https://www.ppartnersgroup.app" style="color: #1565C0; text-decoration: none;">www.ppartnersgroup.app</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f0f0f0; padding: 20px; text-align: center; font-family: Calibri, sans-serif; font-size: 10px; color: #888;">
            <p style="margin: 3px 0;">© ${new Date().getFullYear()} Property Partners Group. Todos los derechos reservados.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
  
  const text = `${documentTitle}\nPeríodo 2026-08\n\nBuenos días,\n\nAdjunto encontrarás el reporte integral ejecutivo correspondiente a este período.\n\nCONTENIDO DEL REPORTE:\n- Modelo de scoring con métricas de desempeño (40/30/30)\n- Tabla de evolución con 6 meses de datos históricos\n- Sistema de tráfico (Verde/Amarillo/Rojo) para priorización\n- Análisis de cumplimiento vs objetivos\n- Indicadores clave de negocio y productividad\n- Definiciones pendientes y transparencia operacional\n\nEl reporte está disponible como archivo HTML adjunto a este email.\n\nPróximos Pasos:\nRevisa el reporte y contáctanos si tienes preguntas.\n\nProperty Partners Intelligence\ninfo@ppartnersgroup.app\nwww.ppartnersgroup.app\n\n© ${new Date().getFullYear()} Property Partners Group. Todos los derechos reservados.`
  
  const senderEmail = reportConfig?.from || 'Business Intelligence Property Partners <info@ppartnersgroup.app>'
  
  // Attach logo inline (CID) so it always renders in the email header
  let attachments: any[] = []
  if (logoBase64) {
    attachments.push({
      filename: 'pp-logo.png',
      content: logoBase64,
      content_type: 'image/png',
      content_id: 'pplogo',
      disposition: 'inline',
    })
  }

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
