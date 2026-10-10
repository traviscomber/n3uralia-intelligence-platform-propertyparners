import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { verifyAudienceSnapshot, type AudienceSnapshot } from '@/lib/property-partners-audience-snapshot'
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
    // Apply the canonical audience reconciliation only to the versioned audience schema.
    // Legacy management snapshots use a different model and must not be misread as it.
    const canonical = normalized.snapshot as Record<string, unknown>
    if (Array.isArray(canonical.metrics) && Array.isArray(canonical.evidence) && canonical.period && typeof canonical.period === 'object') {
      const checked = verifyAudienceSnapshot(canonical as unknown as AudienceSnapshot)
      if (checked.period !== normalized.period_start.slice(0, 7)) throw new Error('REPORT_PERIOD_SNAPSHOT_MISMATCH')
    }
    const artifact = await buildManagementReportPdf(normalized)
    // Verify the actual PDF against the exact persisted/enriched snapshot used to render it.
    const document = await PDFDocument.load(artifact.bytes)
    const digest = createHash('sha256').update(JSON.stringify(normalized.snapshot)).digest('hex')
    const expectedSubject = `PP_MANAGEMENT|${normalized.report_type}|${normalized.period_start}|${normalized.period_end}|sha256:${digest}`
    if (document.getSubject() !== expectedSubject || document.getPageCount() < 3) {
      throw new Error('REPORT_ARTIFACT_SOURCE_MISMATCH')
    }
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
