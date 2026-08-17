import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildManagementReportPdf, type ManagementReportRecord } from '@/lib/management-report-artifact'
import { normalizeManagementReportOutput } from '@/lib/management-report-output'
import { addCanonicalManagementComparisons } from '@/lib/management-report-context.server'

export const runtime = 'nodejs'

type ReportWithEntity = ManagementReportRecord & { entity_id?: string | null }

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('management_report_runs')
    .select('id,entity_id,report_type,period_start,period_end,generated_at,snapshot')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[management-report-artifact] report lookup failed', { code: error.code, reportId: id })
    return NextResponse.json({ error: 'No fue posible cargar el reporte.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Reporte no encontrado o fuera de alcance.' }, { status: 404 })

  try {
    const enriched = await addCanonicalManagementComparisons(supabase, data as ReportWithEntity)
    const normalized = normalizeManagementReportOutput(enriched)
    const artifact = await buildManagementReportPdf(normalized)
    return new Response(Buffer.from(artifact.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    console.error('[management-report-artifact] generation failed', { reportId: id, code: 'PDF_GENERATION_FAILED' })
    return NextResponse.json({ error: 'No fue posible generar el PDF.' }, { status: 500 })
  }
}
