import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRoleAccess } from '@/lib/api-access'
import { buildDirectorReportPdfBuffer } from '@/lib/report-pdf'
import { loadDirectorReportBundle } from '@/lib/director-reports'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('MISSING_SUPABASE_CREDENTIALS')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: Request, context: { params: Promise<{ directorId: string }> }) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  try {
    const { directorId: rawDirectorId } = await context.params
    const directorId = decodeURIComponent(rawDirectorId)
    const url = new URL(request.url)
    const weekStart = url.searchParams.get('week_start')
    const supabase = getServiceClient()
    const bundle = await loadDirectorReportBundle(supabase, directorId)

    const selectedReport = weekStart
      ? bundle.reports.find((report) => report.week_start === weekStart) || bundle.latestReport
      : bundle.latestReport

    if (!selectedReport) {
      return NextResponse.json({ error: 'No hay datos para exportar.' }, { status: 404 })
    }

    const pdfBuffer = await buildDirectorReportPdfBuffer({
      ...bundle,
      latestReport: selectedReport,
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-director-${directorId}-${selectedReport.week_start}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('DIRECTOR_REPORT_PDF_FAILED', {
      code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN',
    })
    return NextResponse.json({ error: 'No pudimos generar el PDF del director.' }, { status: 500 })
  }
}
