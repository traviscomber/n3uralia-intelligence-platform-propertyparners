import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncVitacuraPrc } from '@/lib/vitacura-prc-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const result = await syncVitacuraPrc(createAdminClient())
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('VITACURA_PRC_CRON_FAILED', error)
    return NextResponse.json(
      { ok: false, error: 'VITACURA_PRC_SYNC_FAILED' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
