import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type ResolvePayload = {
  predictionId: string
  actualRateUfM2: number
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability(['valuations.global.approve', 'market.manage_sources'])
    const payload = await request.json() as ResolvePayload
    const actualRate = Number(payload?.actualRateUfM2)

    if (!payload?.predictionId || !Number.isFinite(actualRate) || actualRate <= 0) {
      return NextResponse.json({ error: 'Prediction ID y tasa real valida son obligatorios.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_ml_resolve_shadow_prediction_v1', {
      p_prediction_id: payload.predictionId,
      p_actual_rate_uf_m2: actualRate,
    })

    if (error) {
      console.error('VALUATION_ML_RESOLVE_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible resolver el outcome del ML.' }, { status: 500 })
    }

    return NextResponse.json(data ?? { updated: false })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VALUATION_ML_RESOLVE_UNEXPECTED', error)
    return NextResponse.json({ error: 'Error inesperado resolviendo el outcome ML.' }, { status: 500 })
  }
}
