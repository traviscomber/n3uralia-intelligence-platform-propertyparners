import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMonthlyExecutiveReport, renderMonthlyExecutiveReportHTML, MONTHLY_EXECUTIVE_REPORT_RUNTIME_VERSION } from '@/lib/reporting/monthly-executive-report-runtime'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const period = new URL(request.url).searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const report = await buildMonthlyExecutiveReport(supabase, period)
    const reportHTML = renderMonthlyExecutiveReportHTML(report)

    return new NextResponse(reportHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="property-partners-informe-${period}.html"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Report-Standard': MONTHLY_EXECUTIVE_REPORT_RUNTIME_VERSION,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[CEO Report Download] Error:', errorMsg)
    return NextResponse.json({ error: 'Failed to generate report', details: errorMsg }, { status: 500 })
  }
}
