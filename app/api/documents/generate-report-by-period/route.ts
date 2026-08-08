import { NextResponse } from 'next/server'
import { generateN3uraliaReportHTML } from '@/lib/n3uralia-ceo-report-generator'
import { requireCopilotRole } from '@/lib/copilot-authorization'

// Endpoint to generate a CEO report for a closed period during authorized review.
// Usage: GET /api/documents/generate-report-by-period?period=2026-06

export async function GET(req: Request) {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period')

    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json(
        { error: 'El período debe usar el formato YYYY-MM.' },
        { status: 400 },
      )
    }

    const reportHTML = await generateN3uraliaReportHTML(period)

    return new NextResponse(reportHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-ejecutivo-${period}.html"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[Report Generation] Error:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json(
      { error: 'No fue posible generar el reporte.' },
      { status: 500 },
    )
  }
}
