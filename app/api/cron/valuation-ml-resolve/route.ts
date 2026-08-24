import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.rpc('valuation_ml_resolve_from_cbrs_v1', { p_limit: 250 })
    if (error) {
      console.error('VALUATION_ML_CBRS_RESOLUTION_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ ok: false, error: 'No fue posible resolver outcomes ML.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, result: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('VALUATION_ML_CBRS_RESOLUTION_UNEXPECTED', error)
    return NextResponse.json({ ok: false, error: 'Error inesperado resolviendo outcomes ML.' }, { status: 500 })
  }
}
