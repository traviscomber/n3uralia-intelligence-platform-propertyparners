import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { buildReportinProPdf } from '@/lib/reportin-pro-pdf'
import type { CanonicalClientReport } from '@/lib/n3uralia-canonical-client-report'
import previewReport from '@/reports/previews/property-partners-enero-julio-2026-v2.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  try {
    const report = previewReport as unknown as CanonicalClientReport
    const artifact = await buildReportinProPdf(report)

    return new Response(Buffer.from(artifact.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Reportin-Version': artifact.reportinVersion,
        'X-Reportin-Preview': 'canonical-code-preview',
      },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'REPORTIN_CODE_PREVIEW_FAILED'
    console.error('REPORTIN_CODE_PREVIEW_FAILED', { code })
    return NextResponse.json(
      { error: 'No fue posible generar la vista previa PDF.', code },
      { status: 500 },
    )
  }
}
