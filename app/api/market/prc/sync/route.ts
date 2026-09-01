import { NextResponse } from 'next/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncVitacuraPrc } from '@/lib/vitacura-prc-sync'

export async function POST() {
  try {
    await requireAnyCapability(['valuations.global.approve'])
    const result = await syncVitacuraPrc(createAdminClient())
    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VITACURA_PRC_SYNC_UNEXPECTED', error)
    return NextResponse.json({ error: 'No fue posible sincronizar el PRC de Vitacura.' }, { status: 500 })
  }
}
