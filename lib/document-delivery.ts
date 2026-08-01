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
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Calibri, 'Trebuchet MS', sans-serif; background-color: #f0f0f0;">
  <table cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #f0f0f0;">
    <tr>
      <td align="center" style="padding: 0;">
        <table cellpadding="0" cellspacing="0" width="680" style="width: 680px; max-width: 100%; border-collapse: collapse; background-color: white;">
          <!-- Logo Section -->
          <tr>
            <td bgcolor="#000000" align="center" style="background-color: #000000; padding: 30px 40px; text-align: center;">
              <img src="https://www.ppartnersgroup.app/images/property-partners-logo.svg" alt="Property Partners" style="max-width: 400px; height: auto; display: block;">
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td bgcolor="#000000" style="background-color: #000000; color: white; padding: 40px 40px; text-align: center; border-collapse: collapse;">
              <h1 style="font-size: 26px; font-weight: bold; margin: 0 0 12px 0; line-height: 1.3; color: white;">${documentTitle}</h1>
              <p style="font-size: 13px; margin: 0; color: #cccccc;">Período 2026-08</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px; text-align: left; background-color: white;">
              <p style="font-size: 16px; font-weight: bold; color: #000000; margin: 0 0 20px 0;">Buenos días,</p>
              
              <p style="font-size: 13px; color: #555555; margin: 0 0 30px 0; line-height: 1.8;">
                Adjunto encontrarás el reporte integral ejecutivo correspondiente a este período. Este documento contiene análisis completo de desempeño, inteligencia de mercado y recomendaciones estratégicas.
              </p>

              <!-- Section 1 -->
              <p style="font-size: 14px; font-weight: bold; color: #1565C0; margin: 30px 0 12px 0; text-transform: uppercase;">📊 Contenido del Reporte</p>
              <p style="font-size: 13px; color: #555555; margin: 0 0 10px 0;">El reporte incluye:</p>
              <ul style="margin: 10px 0 20px 20px; padding: 0; font-size: 13px; color: #555555;">
                <li style="margin: 6px 0;">Modelo de scoring con métricas de desempeño (40/30/30)</li>
                <li style="margin: 6px 0;">Tabla de evolución con 6 meses de datos históricos</li>
                <li style="margin: 6px 0;">Sistema de tráfico (Verde/Amarillo/Rojo) para priorización</li>
                <li style="margin: 6px 0;">Análisis de cumplimiento vs objetivos</li>
                <li style="margin: 6px 0;">Indicadores clave de negocio y productividad</li>
                <li style="margin: 6px 0;">Definiciones pendientes y transparencia operacional</li>
              </ul>

              <!-- Attachment Note -->
              <table cellpadding="15" cellspacing="0" width="100%" style="background-color: #fffbea; border: 1px solid #f39c12; margin: 25px 0; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #333333;">
                    <strong>📎 Documento Adjunto:</strong> El reporte está disponible como archivo HTML adjunto a este email. Puedes abrirlo directamente en cualquier navegador web o convertirlo a PDF si lo necesitas.
                  </td>
                </tr>
              </table>

              <!-- Section 2 -->
              <p style="font-size: 14px; font-weight: bold; color: #1565C0; margin: 30px 0 12px 0; text-transform: uppercase;">✓ Próximos Pasos</p>
              <p style="font-size: 13px; color: #555555; margin: 0 0 30px 0; line-height: 1.7;">
                Revisa el reporte y contáctanos si tienes preguntas sobre los datos, interpretación de métricas o necesitas información adicional.
              </p>

              <!-- Contact Info -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0 0 0; padding-top: 25px; border-top: 1px solid #e0e0e0; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #666666; padding: 15px 0 0 0;">
                    <p style="margin: 0 0 5px 0; font-weight: bold;">Property Partners Intelligence</p>
                    <p style="margin: 5px 0;">Email: <a href="mailto:info@ppartnersgroup.app" style="color: #1565C0; text-decoration: none;">info@ppartnersgroup.app</a></p>
                    <p style="margin: 5px 0;">Web: <a href="https://www.ppartnersgroup.app" style="color: #1565C0; text-decoration: none;">www.ppartnersgroup.app</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#f0f0f0" align="center" style="background-color: #f0f0f0; padding: 30px 40px; text-align: center;">
              <p style="font-size: 11px; color: #888888; margin: 5px 0;"><strong>© ${new Date().getFullYear()} Property Partners Group.</strong></p>
              <p style="font-size: 11px; color: #888888; margin: 5px 0;">Todos los derechos reservados. Información confidencial.</p>
              <p style="font-size: 10px; color: #888888; margin: 10px 0 0 0;">Este email contiene información confidencial destinada exclusivamente a su destinatario.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  
  const text = `${documentTitle}\nPeríodo 2026-08\n\nBuenos días,\n\nAdjunto encontrarás el reporte integral ejecutivo correspondiente a este período.\n\nCONTENIDO DEL REPORTE:\n- Modelo de scoring con métricas de desempeño (40/30/30)\n- Tabla de evolución con 6 meses de datos históricos\n- Sistema de tráfico (Verde/Amarillo/Rojo) para priorización\n- Análisis de cumplimiento vs objetivos\n- Indicadores clave de negocio y productividad\n- Definiciones pendientes y transparencia operacional\n\nEl reporte está disponible como archivo HTML adjunto a este email.\n\nPróximos Pasos:\nRevisa el reporte y contáctanos si tienes preguntas.\n\nProperty Partners Intelligence\ninfo@ppartnersgroup.app\nwww.ppartnersgroup.app\n\n© ${new Date().getFullYear()} Property Partners Group. Todos los derechos reservados.`
  
  const senderEmail = reportConfig?.from || 'Business Intelligence Property Partners <info@ppartnersgroup.app>'
  
  // Generate and attach CEO report if it's a CEO report document
  let attachments: any[] = []
  if (documentTitle.includes('Reporte Integral')) {
    try {
      const reportAttachment = await generateCeoReportPDFAttachment()
      attachments = [
        {
          filename: reportAttachment.filename,
          content: reportAttachment.content,
          content_type: reportAttachment.contentType,
        },
      ]
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
