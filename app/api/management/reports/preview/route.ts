import { NextRequest, NextResponse } from 'next/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'
import { generateCeoReportAprilLayoutV2 } from '@/lib/ceo-report-april-layout-v2'
import { generateCeoReportJanuaryLayout } from '@/lib/ceo-report-january-layout'
import {
  assertClosedMonthlyPeriod,
  previousMonthBounds,
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

export async function GET(request: NextRequest) {
  try {
    await requireCapability('management.global.read')

    const defaultPeriod = previousMonthBounds().start.slice(0, 7)
    const period = request.nextUrl.searchParams.get('period') || defaultPeriod

    try {
      assertClosedMonthlyPeriod(period)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'El período debe corresponder a un mes completamente cerrado.',
        },
        { status: 400 },
      )
    }

    const [, month] = period.split('-')
    const monthName = MONTH_NAMES[Number(month) - 1]
    if (!monthName) {
      return NextResponse.json(
        { success: false, error: 'El período debe usar el formato YYYY-MM.' },
        { status: 400 },
      )
    }

    const html = period === '2026-01'
      ? await generateCeoReportJanuaryLayout()
      : await generateCeoReportAprilLayoutV2(monthName, period)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
