import { NextResponse } from 'next/server'
import { generateCeoReportHTML, generateCeoReportData } from '@/lib/ceo-report-html-generator'
import { requireCopilotRole } from '@/lib/copilot-authorization'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requireCopilotRole(['ceo', 'director'])
  if (!access.ok) return access.response

  try {
    const reportData = generateCeoReportData()
    const reportHTML = generateCeoReportHTML(reportData)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[PDF Generation] Error:', error instanceof Error ? error.name : 'unknown_error')
    return NextResponse.json({ error: 'No fue posible generar el reporte.' }, { status: 500 })
  }
}
