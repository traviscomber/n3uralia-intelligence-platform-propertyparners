import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildManagementReportPdf } from '@/lib/management-report-artifact'
import {
  buildManagementReportEmailContent,
  getManagementReportDeliveryConfiguration,
} from '@/lib/management-report-delivery-core'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportRunId, recipient } = body

    if (!reportRunId || !recipient) {
      return NextResponse.json(
        { error: 'reportRunId and recipient are required' },
        { status: 400 }
      )
    }

    // Validate recipient email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json(
        { error: 'Invalid recipient email' },
        { status: 400 }
      )
    }

    // Fetch report from database
    const supabase = createAdminClient() as any
    const { data: report, error: reportError } = await supabase
      .from('management_report_runs')
      .select('*')
      .eq('id', reportRunId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdf = await buildManagementReportPdf(report)

    // Get delivery configuration
    const configuration = getManagementReportDeliveryConfiguration()
    if (!configuration) {
      throw new Error('Delivery configuration not found')
    }

    // Build email content
    const artifactUrl = configuration.appBaseUrl
      ? `${configuration.appBaseUrl}/api/management/reports/${report.id}/artifact`
      : null
    const content = buildManagementReportEmailContent(report, artifactUrl)

    // Send via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const pdfBase64 = Buffer.from(pdf.bytes).toString('base64')

    const response = await resend.emails.send({
      from: configuration.from || 'onboarding@resend.dev',
      to: recipient,
      subject: content.subject,
      html: content.html,
      attachments: [
        {
          filename: pdf.filename,
          content: pdfBase64,
        },
      ],
    })

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error.message,
        },
        { status: 500 }
      )
    }

    // Save delivery record
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
  } catch (error) {
    console.error('[send-now] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
