import { NextResponse } from 'next/server'
import { requireRoleAccess } from '@/lib/api-access'
import { buildReportinProPdf } from '@/lib/reportin-pro-pdf'
import type { CanonicalClientReport } from '@/lib/n3uralia-canonical-client-report'
import report from '@/reports/canonical/property-partners-april-2026.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  const access = await requireRoleAccess(['admin', 'ceo'])
  if (!access.allowed) {
    return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })
  }

  try {
    const artifact = await buildReportinProPdf(report as CanonicalClientReport)
    return new Response(Buffer.from(artifact.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Reportin-Version': artifact.reportinVersion,
        'X-Canonical-Period': '2026-01-01_2026-04-30',
      },
    })
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : 'REPORTIN_APRIL_PDF_FAILED'
    console.error('REPORTIN_APRIL_PDF_FAILED', { code })
    return NextResponse.json(
      { error: 'No fue posible generar el PDF de abril.', code },
      { status: 500 },
    )
  }
}
