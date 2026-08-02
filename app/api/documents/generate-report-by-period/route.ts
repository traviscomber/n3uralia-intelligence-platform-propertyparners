import { NextResponse } from 'next/server'
import { generateN3uraliaReportHTML } from '@/lib/n3uralia-ceo-report-generator'

// Endpoint to generate CEO report for a specific period (for testing with closed months)
// Usage: GET /api/documents/generate-report-by-period?period=2026-06
// Returns: HTML report as file download

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') // Format: YYYY-MM (e.g., 2026-06 for June)

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Use format YYYY-MM (e.g., 2026-06)' },
        { status: 400 }
      )
    }

    const reportHTML = generateN3uraliaReportHTML(period)

    return new NextResponse(reportHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-ejecutivo-${period}.html"`,
      },
    })
  } catch (error) {
    console.error('[Report Generation] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
