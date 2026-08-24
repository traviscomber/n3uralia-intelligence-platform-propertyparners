import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'

type ShadowPayload = {
  propertyType?: 'Casa'
  neighborhood: string
  rol?: string | null
  address?: string | null
  builtAreaM2: number
  landAreaM2: number
  constructionYear?: number | null
  baselineRateUfM2: number
  strictComparableCount?: number | null
  averageSimilarity?: number | null
  comparableSpread?: number | null
}

type MlPrediction = {
  available?: boolean
  modelVersion?: string
  mode?: string
  baselineRateUfM2?: number
  challengerRateUfM2?: number
  adjustmentPct?: number
  confidence?: string
  evidenceStatus?: string
  evidenceId?: string | null
  physicalOverride?: Record<string, unknown> | null
  features?: Record<string, unknown>
  nonBinding?: boolean
  promotionGate?: string
  reason?: string
}

const numberOrNull = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  try {
    await requireAnyCapability([
      'valuations.global.read',
      'valuations.self.create',
      'valuations.office.review',
      'valuations.global.approve',
    ])

    const payload = await request.json() as ShadowPayload
    const built = numberOrNull(payload?.builtAreaM2)
    const land = numberOrNull(payload?.landAreaM2)
    const baselineRate = numberOrNull(payload?.baselineRateUfM2)

    if (!payload?.neighborhood?.trim() || !built || !land || !baselineRate || built <= 0 || land <= 0 || baselineRate <= 0) {
      return NextResponse.json({ error: 'Barrio, superficies y tasa base validas son obligatorias.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('valuation_ml_house_shadow_v1', {
      p_barrio: payload.neighborhood.trim(),
      p_rol: payload.rol ?? null,
      p_address: payload.address ?? null,
      p_built_area_m2: built,
      p_land_area_m2: land,
      p_construction_year: numberOrNull(payload.constructionYear),
      p_baseline_rate_uf_m2: baselineRate,
      p_strict_comparable_count: numberOrNull(payload.strictComparableCount),
      p_average_similarity: numberOrNull(payload.averageSimilarity),
      p_comparable_spread: numberOrNull(payload.comparableSpread),
      p_as_of: new Date().toISOString(),
    })

    if (error) {
      console.error('VALUATION_ML_SHADOW_FAILED', { code: error.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible calcular el challenger ML.' }, { status: 500 })
    }

    const prediction = (data ?? {}) as MlPrediction
    let predictionId: string | null = null

    if (prediction.available && prediction.modelVersion && prediction.challengerRateUfM2 && prediction.baselineRateUfM2) {
      const { data: loggedId, error: logError } = await admin.rpc('valuation_ml_log_shadow_prediction_v1', {
        p_model_version: prediction.modelVersion,
        p_subject_rol: payload.rol ?? null,
        p_subject_address: payload.address ?? null,
        p_barrio: payload.neighborhood.trim(),
        p_baseline_rate_uf_m2: prediction.baselineRateUfM2,
        p_challenger_rate_uf_m2: prediction.challengerRateUfM2,
        p_adjustment_pct: numberOrNull(prediction.adjustmentPct) ?? 0,
        p_confidence: prediction.confidence ?? 'low',
        p_evidence_status: prediction.evidenceStatus ?? 'none',
        p_evidence_id: prediction.evidenceId ?? null,
        p_features: prediction.features ?? {},
      })
      if (logError) console.error('VALUATION_ML_SHADOW_LOG_FAILED', { code: logError.code ?? 'UNKNOWN' })
      else predictionId = typeof loggedId === 'string' ? loggedId : null
    }

    return NextResponse.json({
      mlChallenger: prediction,
      predictionId,
      productionImpact: 'none',
      note: 'Shadow mode: el ML no modifica la recomendacion ni el workflow de valorizacion.',
    })
  } catch (error) {
    const access = accessErrorResponse(error)
    if (access) return access
    console.error('VALUATION_ML_SHADOW_UNEXPECTED', error)
    return NextResponse.json({ error: 'Error inesperado del ML de valorizacion.' }, { status: 500 })
  }
}
