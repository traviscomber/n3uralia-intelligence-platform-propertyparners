import { NextRequest, NextResponse } from 'next/server'
import { generateCeoReportAprilLayout } from '@/lib/ceo-report-april-layout'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get('period') || '2026-04'
  const [, month] = period.split('-')
  const monthName = MONTH_NAMES[Math.max(0, Number(month) - 1)] || 'Abril'
  const html = await generateCeoReportAprilLayout(monthName, period)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
