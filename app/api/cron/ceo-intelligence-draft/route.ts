import { NextResponse } from 'next/server'
import { generateLatestCeoIntelligenceDraft } from '@/lib/ceo-intelligence-report-service'
import { getCronAuthorizationFailure } from '@/lib/management-report-schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authorizationFailure = getCronAuthorizationFailure(
    request.headers.get('authorization'),
    process.env.CRON_SECRET,
  )
  if (authorizationFailure) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await generateLatestCeoIntelligenceDraft({ actorId: null })
    return NextResponse.json({
      ok: true,
      reportId: result.id,
      reused: result.reused,
      period: result.sourceSnapshot
        ? {
            start: result.sourceSnapshot.periodStart,
            end: result.sourceSnapshot.periodEnd,
            cutoff: result.sourceSnapshot.sourceCutoff,
          }
        : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CEO_INTELLIGENCE_REPORT_FAILED'
    console.error('[ceo-intelligence-draft] generation failed', { code })
    return NextResponse.json({ ok: false, error: code }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
