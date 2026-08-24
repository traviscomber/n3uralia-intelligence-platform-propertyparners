import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

export async function GET() {
  try {
    await requireAnyCapability([
      'valuations.global.read',
      'valuations.office.review',
      'valuations.global.approve',
      'market.manage_sources',
    ])

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_ml_model_status_v1')
    if (error) {
      console.error('VALUATION_ML_STATUS_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible leer el estado del ML.' }, { status: 500 })
    }

    return NextResponse.json(data ?? { model: null })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VALUATION_ML_STATUS_UNEXPECTED', error)
    return NextResponse.json({ error: 'Error inesperado consultando el ML.' }, { status: 500 })
  }
}
