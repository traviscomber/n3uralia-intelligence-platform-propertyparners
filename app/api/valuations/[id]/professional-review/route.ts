import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, assertProfileVisible, requireAnyCapability } from '@/lib/access-guards'

type ProfessionalReview = {
  available?: boolean
  caseConfidence?: string | null
  quality?: { grade?: string; status?: string; reasons?: Record<string, unknown> }
  evidence?: {
    selectedComparables?: number
    averageSimilarity?: number | null
    dispersionPct?: number | null
    contradictions?: number
  }
  loCurroAdvisory?: { available?: boolean; severity?: string }
  [key: string]: unknown
}

type ReliabilityRow = {
  barrio: string
  evaluation_year: number
  methodology_version: string
  sample_count: number
  mape_pct: number | string | null
  median_abs_error_pct: number | string | null
  p80_abs_error_pct: number | string | null
  p90_abs_error_pct: number | string | null
  within_10_pct: number | string | null
  within_15_pct: number | string | null
  within_20_pct: number | string | null
  reliability: string
  review_mode: string
}

function numeric(value: number | string | null | undefined) {
  return value == null ? null : Number(value)
}

function buildReviewGate(review: ProfessionalReview, propertyType: string | null, reliability: ReliabilityRow | null) {
  const selected = review.evidence?.selectedComparables ?? 0
  const similarity = review.evidence?.averageSimilarity ?? null
  const dispersion = review.evidence?.dispersionPct ?? null
  const contradictions = review.evidence?.contradictions ?? 0
  const reasons: string[] = []

  if (selected < 3) reasons.push('Menos de 3 comparables seleccionados')
  if (review.caseConfidence === 'low') reasons.push('Confianza del expediente baja')
  if (similarity !== null && similarity < 0.85) reasons.push('Similitud media inferior a 85%')
  if (dispersion !== null && dispersion >= 35) reasons.push(`Dispersión alta (${dispersion.toFixed(1)}%)`)
  if (contradictions > 0) reasons.push(`${contradictions} contradicción${contradictions === 1 ? '' : 'es'} en comparables`)
  if (review.loCurroAdvisory?.available && review.loCurroAdvisory.severity === 'high') reasons.push('Challenger material requiere contraste profesional')
  if (propertyType === 'Casa' && reliability?.reliability === 'low') reasons.push('Backtest del barrio con confiabilidad baja')

  let mode: 'blocked' | 'mandatory_professional_review' | 'reinforced_review' | 'standard_review' = 'standard_review'
  if (review.quality?.status === 'BLOCK_REVIEW' || selected < 3) mode = 'blocked'
  else if (
    review.caseConfidence === 'low' ||
    reliability?.review_mode === 'mandatory_professional_review' ||
    (review.loCurroAdvisory?.available && review.loCurroAdvisory.severity === 'high')
  ) mode = 'mandatory_professional_review'
  else if (
    reliability?.review_mode === 'reinforced_review' ||
    (dispersion !== null && dispersion >= 30) ||
    (similarity !== null && similarity < 0.9) ||
    contradictions > 0
  ) mode = 'reinforced_review'

  const modelEvidence = reliability ? {
    scope: reliability.barrio === '__GLOBAL__' ? 'global' : 'barrio',
    barrio: reliability.barrio,
    evaluationYear: reliability.evaluation_year,
    methodologyVersion: reliability.methodology_version,
    sampleCount: reliability.sample_count,
    mapePct: numeric(reliability.mape_pct),
    medianAbsErrorPct: numeric(reliability.median_abs_error_pct),
    p80AbsErrorPct: numeric(reliability.p80_abs_error_pct),
    p90AbsErrorPct: numeric(reliability.p90_abs_error_pct),
    within10Pct: numeric(reliability.within_10_pct),
    within15Pct: numeric(reliability.within_15_pct),
    within20Pct: numeric(reliability.within_20_pct),
    reliability: reliability.reliability,
    reviewMode: reliability.review_mode,
  } : null

  return {
    mode,
    reasons,
    modelEvidence,
    changesOfficialValue: false,
    purpose: 'review_prioritization',
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireAnyCapability([
      'valuations.self.read',
      'valuations.office.read',
      'valuations.global.read',
    ])
    const supabase = await createClient()
    const { id } = await context.params

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .select('id,requested_by,property_type,neighborhood')
      .eq('id', id)
      .maybeSingle()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })

    assertProfileVisible(scope, valuationCase.requested_by)

    const { data, error } = await supabase.rpc('valuation_professional_review_v1', { p_case_id: id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const review = (data ?? {}) as ProfessionalReview
    let reliability: ReliabilityRow | null = null

    if (valuationCase.property_type === 'Casa') {
      const barrios = [valuationCase.neighborhood, '__GLOBAL__'].filter((value): value is string => Boolean(value))
      const { data: reliabilityRows, error: reliabilityError } = await supabase
        .from('valuation_house_champion_v5_reliability')
        .select('barrio,evaluation_year,methodology_version,sample_count,mape_pct,median_abs_error_pct,p80_abs_error_pct,p90_abs_error_pct,within_10_pct,within_15_pct,within_20_pct,reliability,review_mode')
        .in('barrio', barrios)
        .order('evaluation_year', { ascending: false })

      if (!reliabilityError) {
        const rows = (reliabilityRows ?? []) as ReliabilityRow[]
        reliability = rows.find((row) => row.barrio === valuationCase.neighborhood) ?? rows.find((row) => row.barrio === '__GLOBAL__') ?? null
      }
    }

    return NextResponse.json({
      ...review,
      reviewGate: buildReviewGate(review, valuationCase.property_type, reliability),
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
