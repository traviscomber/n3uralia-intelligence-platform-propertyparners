import { NextRequest, NextResponse } from 'next/server'
import { generateCeoReportBrandbook } from '@/lib/ceo-report-brandbook-generator'
import { sendDocumentEmail } from '@/lib/document-delivery'

export async function POST(req: NextRequest) {
  try {
    const { period = '2026-06', recipient_email = 'juan@n3uralia.com' } = await req.json()

    // Extract month from period
    const [year, month] = period.split('-')
    const monthIndex = parseInt(month) - 1
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[monthIndex]

    // Generate report HTML
    const reportHTML = await generateCeoReportBrandbook(monthName, period)

    // Create a temporary file-like object for the email
    const distributionId = `dist-${Date.now()}`
    const scheduleId = `sched-${Date.now()}`
    
    // Send using the working sendDocumentEmail function
    await sendDocumentEmail(
      distributionId,
      scheduleId,
      `Reporte CEO Integral — ${monthName} 2026`,
      `data:text/html;base64,${Buffer.from(reportHTML).toString('base64')}`,
      recipient_email,
      period
    )

    return NextResponse.json({
      success: true,
      message: `Reporte enviado a ${recipient_email}`,
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
