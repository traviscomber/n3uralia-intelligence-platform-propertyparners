import { NextResponse } from 'next/server'
import { fetchVitacuraPrcRows } from '@/lib/vitacura-prc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return new NextResponse(null, { status: 404 })

  try {
    const result = await fetchVitacuraPrcRows()
    return NextResponse.json({
      ok: true,
      sourceVersion: result.sourceVersion,
      diagnostics: result.diagnostics,
      changesChampionWeights: false,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'PRC source probe failed',
      changesChampionWeights: false,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
