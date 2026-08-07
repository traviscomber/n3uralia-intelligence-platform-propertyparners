import { NextRequest, NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { generateCeoReportBrandbook } from '@/lib/ceo-report-brandbook-generator'
import { sendDocumentEmail } from '@/lib/document-delivery'

export async function POST(req: NextRequest) {
  try {
    await requireCapability('management.global.manage')
    const { period = '2026-06', recipient_email } = await req.json()

    if (!recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
      return NextResponse.json({ error: 'Se requiere un destinatario válido.' }, { status: 400 })
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json({ error: 'El período debe usar formato AAAA-MM.' }, { status: 400 })
    }

    const [year, month] = period.split('-')
    const monthIndex = Number.parseInt(month, 10) - 1
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[monthIndex]

    const reportHTML = await generateCeoReportBrandbook(monthName, period)
    const distributionId = `dist-${Date.now()}`
    const scheduleId = `sched-${Date.now()}`

    await sendDocumentEmail(
      distributionId,
      scheduleId,
      `Reporte CEO Integral — ${monthName} ${year}`,
      `data:text/html;base64,${Buffer.from(reportHTML).toString('base64')}`,
      recipient_email,
      period
    )

    return NextResponse.json({ success: true, message: 'Reporte enviado.', period })
  } catch (error) {
    const accessResponse = accessErrorResponse(error)
    if (accessResponse.status !== 500) return accessResponse
    console.error('SEND_REPORT_FAILED')
    return NextResponse.json(
      { success: false, error: 'No fue posible completar el envío del reporte.' },
      { status: 500 }
    )
  }
}