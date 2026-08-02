import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { generateCeoReportBrandbook } from '@/lib/ceo-report-brandbook-generator'

export async function POST(req: NextRequest) {
  try {
    const { period, recipient_email } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY not configured' },
        { status: 400 }
      )
    }

    // Extract month from period (e.g., "2026-06" -> "Junio")
    const [year, month] = period.split('-')
    const monthIndex = parseInt(month) - 1
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[monthIndex]

    // Generate report HTML
    const reportHTML = await generateCeoReportBrandbook(monthName, period)

    // Send via Resend with full HTML rendering
    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipient_email || 'juan@n3uralia.com',
      subject: `Reporte CEO Integral — ${monthName} 2026`,
      html: reportHTML,
    })

    if (response.error) {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: response.data?.id,
      recipient: recipient_email,
      period,
    })
  } catch (error) {
    console.error('Error sending report:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
