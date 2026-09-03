import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCeoIntelligencePdf } from '@/lib/reportin-ceo-intelligence-pdf'
import type { PropertyPartnersCeoIntelligenceReport } from '@/lib/property-partners-ceo-intelligence-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isCeoIntelligenceReport(value: unknown): value is PropertyPartnersCeoIntelligenceReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const report = value as Partial<PropertyPartnersCeoIntelligenceReport>
  return report.report_type === 'property_partners_ceo_intelligence'
    && report.standard_version === '1.0'
    && typeof report.title === 'string'
    && typeof report.executive_summary === 'string'
    && Array.isArray(report.sections)
    && Boolean(report.snapshot)
    && Boolean(report.canonical_metadata)
    && report.canonical_metadata?.source_policy === 'canonical_input_only'
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
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
    console.error('CEO_INTELLIGENCE_DOCUMENT_LOOKUP_FAILED', { reportId: id, code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar el informe.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Informe no encontrado.' }, { status: 404 })

  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : []
  if (!tags.includes('n3uralia-client-report') || !tags.includes('canonical') || !tags.includes('ceo-intelligence-report')) {
    return NextResponse.json({ error: 'El documento no corresponde a un CEO Intelligence Report canónico.' }, { status: 422 })
  }

  try {
    const parsed = JSON.parse(data.content) as unknown
    if (!isCeoIntelligenceReport(parsed)) throw new Error('REPORTIN_INVALID_CEO_INTELLIGENCE_DOCUMENT')
    const artifact = await buildCeoIntelligencePdf(parsed)
    const disposition = new URL(request.url).searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'
    return new Response(Buffer.from(artifact.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Reportin-Version': artifact.reportinVersion,
      },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'REPORTIN_CEO_INTELLIGENCE_PDF_FAILED'
    console.error('REPORTIN_CEO_INTELLIGENCE_PDF_FAILED', { reportId: id, code })
    return NextResponse.json({ error: 'No fue posible generar el PDF del CEO Intelligence Report.', code }, { status: 500 })
  }
}
