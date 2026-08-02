import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generateCeoReportAprilLayout } from '@/lib/ceo-report-april-layout'

export async function POST(req: NextRequest) {
  try {
    const { period, recipient_email } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY not configured' },
        { status: 400 },
      )
    }

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { success: false, error: 'period must use YYYY-MM format' },
        { status: 400 },
      )
    }

    const monthIndex = Number(period.split('-')[1]) - 1
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[monthIndex]

    if (!monthName) {
      return NextResponse.json(
        { success: false, error: 'Invalid report month' },
        { status: 400 },
      )
    }

    const reportHTML = await generateCeoReportAprilLayout(monthName, period)
    const recipient = recipient_email || 'juan@n3uralia.com'

    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.emails.send({
      from: 'info@ppartnersgroup.app',
      to: recipient,
      subject: `Control de Gestión — Cierre ${monthName} 2026`,
      html: reportHTML,
    })

    if (response.error) {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      emailId: response.data?.id,
      recipient,
      period,
      layout: 'april-canonical-v1',
    })
  } catch (error) {
    console.error('Error sending report:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    )
  }
}
