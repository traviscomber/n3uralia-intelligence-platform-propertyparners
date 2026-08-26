import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMonthlyExecutiveReport, MONTHLY_EXECUTIVE_REPORT_RUNTIME_VERSION } from '@/lib/reporting/monthly-executive-report-runtime'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const period = new URL(request.url).searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const report = await buildMonthlyExecutiveReport(supabase, period)

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Report-Standard': MONTHLY_EXECUTIVE_REPORT_RUNTIME_VERSION,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CEO Enhanced Report] Error:', error)
    return NextResponse.json({ error: 'No fue posible generar el reporte mejorado', details: message }, { status: 500 })
  }
}
