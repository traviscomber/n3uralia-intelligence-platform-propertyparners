import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireExecutiveAccess } from '@/lib/api-access'
import { buildManagementReportPdf } from '@/lib/management-report-artifact'
import {
  buildManagementReportEmailContent,
  getManagementReportDeliveryConfiguration,
} from '@/lib/management-report-delivery-core'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  try {
    const body = await request.json()
    const { reportRunId, recipient } = body

    if (!reportRunId || !recipient) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos para enviar el reporte.' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json(
        { error: 'El correo del destinatario no es válido.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient() as any
    const { data: report, error: reportError } = await supabase
      .from('management_report_runs')
      .select('*')
      .eq('id', reportRunId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Reporte no encontrado.' },
        { status: 404 }
      )
    }

    const pdf = await buildManagementReportPdf(report)
    const configuration = getManagementReportDeliveryConfiguration()
    if (!configuration) throw new Error('DELIVERY_CONFIGURATION_MISSING')

    const artifactUrl = configuration.appBaseUrl
      ? `${configuration.appBaseUrl}/api/management/reports/${report.id}/artifact`
      : null
    const content = buildManagementReportEmailContent(report, artifactUrl)

    const resend = new Resend(process.env.RESEND_API_KEY)
    const pdfBase64 = Buffer.from(pdf.bytes).toString('base64')

    const response = await resend.emails.send({
      from: configuration.from || 'onboarding@resend.dev',
      to: recipient,
      subject: content.subject,
      html: content.html,
      attachments: [{ filename: pdf.filename, content: pdfBase64 }],
    })

    if (response.error) {
      console.error('[send-now] Provider delivery failed')
      return NextResponse.json(
        { success: false, error: 'No fue posible enviar el reporte.' },
        { status: 502 }
      )
    }

    const { data: distribution } = await supabase
      .from('management_report_distributions')
      .insert({
        report_run_id: reportRunId,
        recipient,
        channel: 'email',
        status: 'sent',
        metadata: {
          provider: 'resend',
          provider_message_id: response.data?.id,
          initiated_by: access.userId,
        },
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      status: 'sent',
      provider: 'resend',
      providerMessageId: response.data?.id,
      recipient,
      filename: pdf.filename,
      distributionId: distribution?.id,
    })
  } catch {
    console.error('[send-now] Report delivery failed')
    return NextResponse.json(
      { error: 'No fue posible completar el envío del reporte.' },
      { status: 500 }
    )
  }
}