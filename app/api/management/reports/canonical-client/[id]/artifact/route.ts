import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReportinCanonicalPdf } from '@/lib/reportin-canonical-pdf'
import type { CanonicalClientReport } from '@/lib/n3uralia-canonical-client-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isCanonicalClientReport(value: unknown): value is CanonicalClientReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const report = value as Partial<CanonicalClientReport>
  return report.report_type === 'n3uralia_client_canonical'
    && report.standard_version === '1.0'
    && typeof report.title === 'string'
    && typeof report.executive_summary === 'string'
    && Array.isArray(report.sections)
    && Boolean(report.canonical_metadata)
    && report.canonical_metadata?.source_policy === 'canonical_input_only'
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const { id } = await context.params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id,title,content,doc_type,tags')
    .eq('id', id)
    .eq('doc_type', 'report')
    .maybeSingle()

  if (error) {
    console.error('REPORTIN_DOCUMENT_LOOKUP_FAILED', { reportId: id, code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar el informe.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })

  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : []
  if (!tags.includes('n3uralia-client-report') || !tags.includes('canonical')) {
    return NextResponse.json({ error: 'El documento no corresponde a un informe canónico.' }, { status: 422 })
  }

  try {
    const parsed = JSON.parse(data.content) as unknown
    if (!isCanonicalClientReport(parsed)) throw new Error('REPORTIN_INVALID_CANONICAL_DOCUMENT')
    const artifact = await buildReportinCanonicalPdf(parsed)

    return new Response(Buffer.from(artifact.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Reportin-Version': artifact.reportinVersion,
      },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'REPORTIN_PDF_GENERATION_FAILED'
    console.error('REPORTIN_PDF_GENERATION_FAILED', { reportId: id, code })
    return NextResponse.json({ error: 'No fue posible generar el PDF del informe.', code }, { status: 500 })
  }
}
