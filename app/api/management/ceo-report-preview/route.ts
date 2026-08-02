import { NextResponse } from 'next/server'
import { generateCeoReportHTML, generateCeoReportData } from '@/lib/ceo-report-html-generator'

export async function GET() {
  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[CEO Report Preview] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
