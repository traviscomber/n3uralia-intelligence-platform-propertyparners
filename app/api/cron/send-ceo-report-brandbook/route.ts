import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { generateCeoReportAprilLayoutV2 } from '@/lib/ceo-report-april-layout-v2'
import { generateCeoReportJanuaryLayout } from '@/lib/ceo-report-january-layout'
import {
  assertClosedMonthlyPeriod,
  getCronAuthorizationFailure,
} from '@/lib/management-report-schedule'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

async function authorizeDelivery(req: NextRequest) {
  const cronFailure = getCronAuthorizationFailure(
    req.headers.get('authorization'),
    process.env.CRON_SECRET,
  )

  if (cronFailure === null) return
  await requireCapability('management.global.read')
}

export async function POST(req: NextRequest) {
  try {
    await authorizeDelivery(req)

    const { period, recipient_email } = await req.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Servicio de correo no configurado.' },
        { status: 503 },
      )
    }

    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json(
        { success: false, error: 'El período debe usar el formato YYYY-MM.' },
        { status: 400 },
      )
    }

    try {
      assertClosedMonthlyPeriod(period)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede enviar un cierre correspondiente al mes en curso o a un mes futuro.',
        },
        { status: 400 },
      )
    }

    const [year, month] = period.split('-')
    const monthName = MONTH_NAMES[Number(month) - 1]
    if (!monthName) {
      return NextResponse.json(
        { success: false, error: 'Mes de reporte inválido.' },
        { status: 400 },
      )
    }

    const reportHTML = period === '2026-01'
      ? await generateCeoReportJanuaryLayout()
      : await generateCeoReportAprilLayoutV2(monthName, period)
    const recipient = recipient_email || 'juan@n3uralia.com'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.emails.send({
      from: 'info@ppartnersgroup.app',
      to: recipient,
      subject: `Control de Gestión — Cierre ${monthName} ${year}`,
      html: reportHTML,
    })

    if (response.error) {
      return NextResponse.json(
        { success: false, error: 'El proveedor de correo rechazó el envío.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      emailId: response.data?.id,
      recipient,
      period,
      layout: period === '2026-01' ? 'january-canonical-v1' : 'april-canonical-v2-charts',
    })
  } catch (error) {
    const accessResponse = accessErrorResponse(error)
    if (accessResponse.status !== 500) return accessResponse

    console.error(
      'Error sending CEO report:',
      error instanceof Error ? error.name : 'unknown_error',
    )
    return NextResponse.json(
      { success: false, error: 'No fue posible procesar el envío del reporte.' },
      { status: 500 },
    )
  }
}
