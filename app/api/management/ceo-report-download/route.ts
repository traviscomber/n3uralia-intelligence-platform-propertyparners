import { NextResponse } from 'next/server'
import { generateCeoReportHTML, generateCeoReportData } from '@/lib/ceo-report-html-generator'
import { MONTHLY_EXECUTIVE_REPORT_STANDARD } from '@/lib/reporting/monthly-executive-report-standard'

export async function GET() {
  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="property-partners-monthly-executive-report.html"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Report-Standard': MONTHLY_EXECUTIVE_REPORT_STANDARD.version,
        'X-Report-Standard-Document': MONTHLY_EXECUTIVE_REPORT_STANDARD.document,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[CEO Report Download] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
