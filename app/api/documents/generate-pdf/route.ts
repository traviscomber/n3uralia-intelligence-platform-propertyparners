import { NextResponse } from 'next/server'
import { generateCeoReportHTML, generateCeoReportData } from '@/lib/ceo-report-html-generator'

// This is a public endpoint - no authentication required
// Used for PDF generation and email attachment
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[PDF Generation] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
