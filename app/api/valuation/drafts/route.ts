import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { canUnlockV2Features } from '@/lib/v2-feature-access'
import { canLinkValuationProperty } from '@/lib/valuation-property-link-access'
import {
  buildValuationReportPayload,
  calculateCanonicalComparableUfM2,
  calculateContractualValuation,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationSubject,
} from '@/lib/valuation-contract'

type DraftPayload = {
  subject: ValuationSubject
  comparables?: ValuationComparable[]
  qualitativeFactors?: QualitativeFactors
  justification?: string
  decision?: { rateAnchor?: string | null } | null
  propertyAssignmentId?: string | null
  sourcePropertyId?: string | null
}

type ChampionComparable = ValuationComparable & {
  rankingScore?: number
  strictPhysicalCompatibility?: boolean
}

type ChampionRecommendation = {
  recommendedRateUfM2: number
  recommendedBuiltRateUfM2: number
  recommendedLandRateUfM2: number
  recommendedEstimatedValueUf: number
  comparableCount: number
  strictComparableCount: number
  averageSimilarity: number
  comparableSpread: number
  evidenceGate: 'strict_6_plus' | 'strict_4_recovery' | 'strict_5_coherent_recovery'
  recommendationMethod: 'champion_v5_geo50_mean30_median20_similarity_squared'
}

const emptyFactors: QualitativeFactors = {
  condition: 0,
  remodeling: 0,
  orientation: 0,
  floor: 0,
  light: 0,
  view: 0,
  noise: 0,
  commercialPotential: 0,
}

function isFinalizable(subject: ValuationSubject, comparables: ValuationComparable[], justification: string) {
  const selected = comparables.filter((item) => item.selected && item.priceUf > 0 && calculateCanonicalComparableUfM2(item) > 0)
  const hasRates = subject.propertyType === 'Casa'
    ? Boolean(subject.builtRateUfM2 && subject.landRateUfM2)
    : Boolean(subject.usefulRateUfM2)
  return selected.length >= 3 && hasRates && Boolean(justification.trim())
}

function rankingScore(item: ChampionComparable) {
  const value = Number(item.rankingScore)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function weightedMedianRate(items: ChampionComparable[]) {
  const usable = items
    .map((item) => ({ rate: calculateCanonicalComparableUfM2(item), score: rankingScore(item) }))
    .filter((item) => item.rate > 0 && item.score > 0)
    .map((item) => ({ ...item, weight: item.score ** 2 }))
    .sort((a, b) => a.rate - b.rate)
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0)
  if (!usable.length || totalWeight <= 0) return null
  let cumulative = 0
  for (const item of usable) {
    cumulative += item.weight
    if (cumulative >= totalWeight / 2) return item.rate
  }
  return usable[usable.length - 1]?.rate ?? null
}

function weightedArithmeticRate(items: ChampionComparable[]) {
  const usable = items
    .map((item) => ({ rate: calculateCanonicalComparableUfM2(item), score: rankingScore(item) }))
    .filter((item) => item.rate > 0 && item.score > 0)
  const totalWeight = usable.reduce((sum, item) => sum + item.score ** 2, 0)
  if (!usable.length || totalWeight <= 0) return null
  return usable.reduce((sum, item) => sum + item.rate * item.score ** 2, 0) / totalWeight
}

function weightedGeometricRate(items: ChampionComparable[]) {
  const usable = items
    .map((item) => ({ rate: calculateCanonicalComparableUfM2(item), score: rankingScore(item) }))
    .filter((item) => item.rate > 0 && item.score > 0)
  const totalWeight = usable.reduce((sum, item) => sum + item.score ** 2, 0)
  if (!usable.length || totalWeight <= 0) return null
  const weightedLog = usable.reduce((sum, item) => sum + Math.log(item.rate) * item.score ** 2, 0) / totalWeight
  return Math.exp(weightedLog)
}

function comparableSpread(items: ChampionComparable[]) {
  const rates = items.map((item) => calculateCanonicalComparableUfM2(item)).filter((rate) => rate > 0).sort((a, b) => a - b)
  if (rates.length < 2) return 1
  const middle = Math.floor(rates.length / 2)
  const median = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2
  if (!median) return 1
  return (rates[rates.length - 1] - rates[0]) / median
}

function buildChampionHouseRecommendation(subject: ValuationSubject, comparables: ChampionComparable[]): ChampionRecommendation | null {
  if (subject.propertyType !== 'Casa' || !subject.builtAreaM2 || !subject.landAreaM2) return null

  const strict = comparables
    .filter((item) => item.sourceType === 'CBRS' && item.strictPhysicalCompatibility === true && rankingScore(item) > 0 && calculateCanonicalComparableUfM2(item) > 0)
    .sort((a, b) => rankingScore(b) - rankingScore(a))
    .slice(0, 8)

  let sample: ChampionComparable[] = []
  let evidenceGate: ChampionRecommendation['evidenceGate'] | null = null
  if (strict.length >= 6) {
    sample = strict
    evidenceGate = 'strict_6_plus'
  } else if (strict.length === 4) {
    sample = strict
    evidenceGate = 'strict_4_recovery'
  } else if (strict.length === 5) {
    const averageScore = strict.reduce((sum, item) => sum + rankingScore(item), 0) / strict.length
    if (averageScore >= 0.75 && comparableSpread(strict) <= 0.5) {
      sample = strict
      evidenceGate = 'strict_5_coherent_recovery'
    }
  }

  if (!sample.length || !evidenceGate) return null

  const geometricRate = weightedGeometricRate(sample)
  const arithmeticRate = weightedArithmeticRate(sample)
  const medianRate = weightedMedianRate(sample)
  if (!geometricRate || !arithmeticRate || !medianRate) return null

  const recommendedRate = geometricRate * 0.5 + arithmeticRate * 0.3 + medianRate * 0.2
  const weightedArea = subject.builtAreaM2 + subject.landAreaM2 / 4
  const averageSimilarity = sample.reduce((sum, item) => sum + rankingScore(item), 0) / sample.length
  const spread = comparableSpread(sample)

  return {
    recommendedRateUfM2: Number(recommendedRate.toFixed(2)),
    recommendedBuiltRateUfM2: Number(recommendedRate.toFixed(2)),
    recommendedLandRateUfM2: Number((recommendedRate / 4).toFixed(2)),
    recommendedEstimatedValueUf: Math.round(recommendedRate * weightedArea),
    comparableCount: sample.length,
    strictComparableCount: strict.length,
    averageSimilarity: Number(averageSimilarity.toFixed(3)),
    comparableSpread: Number(spread.toFixed(3)),
    evidenceGate,
    recommendationMethod: 'champion_v5_geo50_mean30_median20_similarity_squared',
  }
}

export async function POST(request: Request) {
  try {
    const scope = await requireAnyCapability([
      'valuations.self.create',
      'valuations.office.review',
      'valuations.global.approve',
    ])
    const supabase = await createClient()
    const payload = await request.json().catch(() => null) as DraftPayload | null

    if (!payload?.subject?.address?.trim() || !payload.subject.neighborhood?.trim()) {
      return NextResponse.json({ error: 'Para guardar se requieren dirección y barrio.' }, { status: 400 })
    }

    if (payload.subject.propertyType === 'Departamento') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!canUnlockV2Features(user)) {
        return NextResponse.json({ error: 'La valorización de departamentos estará disponible en la versión 2.' }, { status: 403 })
      }
    }

    const authorizationDb = createServiceClient()
    let resolvedSourcePropertyId = resolvedSourcePropertyId
    let verifiedAssignment: {
      id: string
      property_id: string
      assigned_to: string
      assignment_role: string | null
      assigned_at: string | null
    } | null = null

    if (payload.propertyAssignmentId) {
      const { data: assignment, error: assignmentError } = await authorizationDb
        .from('property_assignments')
        .select('id,property_id,assigned_to,status,assignment_role,assigned_at')
        .eq('id', payload.propertyAssignmentId)
        .maybeSingle()

      if (assignmentError) {
        console.error('VALUATION_DRAFT_ASSIGNMENT_LOOKUP_FAILED', { code: assignmentError.code ?? 'UNKNOWN' })
        return NextResponse.json({ error: 'No pudimos verificar la asignación operacional.' }, { status: 422 })
      }
      if (!assignment || assignment.status !== 'active' || assignment.assigned_to !== scope.profileId) {
        return NextResponse.json({ error: 'La asignación individual no pertenece al perfil autenticado o ya no está activa.' }, { status: 403 })
      }
      if (resolvedSourcePropertyId && resolvedSourcePropertyId !== assignment.property_id) {
        return NextResponse.json({ error: 'La propiedad no corresponde a la asignación indicada.' }, { status: 400 })
      }
      resolvedSourcePropertyId = assignment.property_id
      verifiedAssignment = assignment
    }

    if (resolvedSourcePropertyId) {
      const { data: linkedProperty, error: propertyError } = await authorizationDb
        .from('market_properties')
        .select('id,neighborhood_id,property_type')
        .eq('id', resolvedSourcePropertyId)
        .maybeSingle()

      if (propertyError) {
        console.error('VALUATION_DRAFT_PROPERTY_LOOKUP_FAILED', { code: propertyError.code ?? 'UNKNOWN' })
        return NextResponse.json({ error: 'No pudimos verificar la propiedad operacional.' }, { status: 422 })
      }
      if (!linkedProperty) return NextResponse.json({ error: 'La propiedad vinculada no existe.' }, { status: 400 })

      let territoryOffice: string | null = null
      if (scope.scope === 'office' && linkedProperty.neighborhood_id) {
        const { data: territory, error: territoryError } = await authorizationDb
          .from('market_neighborhood_director_assignments')
          .select('director_key')
          .eq('neighborhood_id', linkedProperty.neighborhood_id)
          .eq('active', true)
          .is('valid_to', null)
          .maybeSingle()
        if (territoryError) {
          console.error('VALUATION_DRAFT_TERRITORY_LOOKUP_FAILED', { code: territoryError.code ?? 'UNKNOWN' })
          return NextResponse.json({ error: 'No pudimos verificar el territorio de la propiedad.' }, { status: 422 })
        }
        if (territory?.director_key) {
          const { data: director, error: directorError } = await authorizationDb
            .from('property_director_directory')
            .select('office_name')
            .eq('director_key', territory.director_key)
            .eq('active', true)
            .maybeSingle()
          if (directorError) {
            console.error('VALUATION_DRAFT_DIRECTOR_LOOKUP_FAILED', { code: directorError.code ?? 'UNKNOWN' })
            return NextResponse.json({ error: 'No pudimos verificar la dirección responsable.' }, { status: 422 })
          }
          territoryOffice = director?.office_name ?? null
        }
      }

      const authorized = canLinkValuationProperty({
        scope: scope.scope,
        scopeTeam: scope.team,
        territoryOffice,
        hasActiveSelfAssignment: Boolean(verifiedAssignment),
      })
      if (!authorized) {
        return NextResponse.json({ error: 'La propiedad está fuera del alcance autorizado para esta valorización.' }, { status: 403 })
      }
    }

    const comparables = Array.isArray(payload.comparables) ? payload.comparables : []
    const championRecommendation = buildChampionHouseRecommendation(payload.subject, comparables as ChampionComparable[])
    const qualitativeFactors = payload.qualitativeFactors ?? emptyFactors
    const selected = comparables.filter((item) => item.selected && item.priceUf > 0 && calculateCanonicalComparableUfM2(item) > 0)
    const selectedComparableCount = selected.length
    const justification = payload.justification?.trim() || ''
    const complete = isFinalizable(payload.subject, comparables, justification)

    let result: ReturnType<typeof calculateContractualValuation> | null = null
    if (complete) {
      try {
        result = calculateContractualValuation(payload.subject, comparables, qualitativeFactors)
      } catch {
        return NextResponse.json({ error: 'El expediente parece completo, pero no cumple la metodología canónica.' }, { status: 400 })
      }
    }

    const rateAnchor = payload.decision?.rateAnchor ?? (complete && payload.subject.propertyType === 'Casa' ? 'manual' : null)
    const distanceCoverage = selectedComparableCount
      ? selected.filter((item) => item.distanceMeters !== undefined).length / selectedComparableCount
      : 0
    const transactionDateCoverage = selectedComparableCount
      ? selected.filter((item) => Boolean(item.transactionDate)).length / selectedComparableCount
      : 0
    const methodologyVersion = payload.subject.propertyType === 'Casa' && championRecommendation
      ? 'property-partners-house-champion-v5'
      : result?.methodologyVersion ?? 'property-partners-valuation-v2'

    const championEvidence = championRecommendation ? {
      recommendedRateUfM2: championRecommendation.recommendedRateUfM2,
      recommendedBuiltRateUfM2: championRecommendation.recommendedBuiltRateUfM2,
      recommendedLandRateUfM2: championRecommendation.recommendedLandRateUfM2,
      recommendedEstimatedValueUf: championRecommendation.recommendedEstimatedValueUf,
      comparableCount: championRecommendation.comparableCount,
      strictComparableCount: championRecommendation.strictComparableCount,
      averageSimilarity: championRecommendation.averageSimilarity,
      comparableSpread: championRecommendation.comparableSpread,
      evidenceGate: championRecommendation.evidenceGate,
      recommendationMethod: championRecommendation.recommendationMethod,
      sourceMethodologyVersion: 'property-partners-house-champion-v5',
      recommendationNonBinding: true,
    } : {}

    const evidence = complete && result ? {
      comparableCount: result.comparableCount,
      portalComparableCount: result.portalSummary.count,
      cbrsComparableCount: result.cbrsSummary.count,
      selectedComparableCount,
      subjectPropertyId: resolvedSourcePropertyId,
      propertyAssignmentId: verifiedAssignment?.id ?? null,
      rateAnchor,
      subjectCoordinatesPresent: payload.subject.latitude !== undefined && payload.subject.longitude !== undefined,
      comparableDistanceCoveragePct: Number((distanceCoverage * 100).toFixed(1)),
      comparableTransactionDateCoveragePct: Number((transactionDateCoverage * 100).toFixed(1)),
      finalWizardComplete: true,
      ...championEvidence,
    } : {
      draft: true,
      selectedComparableCount,
      propertyAssignmentId: verifiedAssignment?.id ?? null,
      subjectPropertyId: resolvedSourcePropertyId,
      finalWizardComplete: false,
      ...championEvidence,
    }

    const assumptions = complete ? {
      incompleteDraft: false,
      selectedComparablesOnly: true,
      finalRateConfirmedByValuer: true,
      rateAnchor,
      championRecommendationIsNonBinding: Boolean(championRecommendation),
      qualitativeFactorsDoNotApplyAutomaticEconomicAdjustment: true,
      canonicalTemplates: ['Plantilla de Valorización Casas.xlsx', 'Plantilla de Valorización Departamentos.xlsx'],
    } : {
      incompleteDraft: true,
      championRecommendationIsNonBinding: Boolean(championRecommendation),
      noEconomicResultUntilProfessionalRatesAreConfirmed: true,
    }

    const reportPayload = complete && result
      ? {
          ...buildValuationReportPayload(payload.subject, comparables, qualitativeFactors, result),
          methodologyVersion,
          subjectPropertyId: resolvedSourcePropertyId,
          decision: {
            rateAnchor,
            rateConfirmedByValuer: true,
            championRecommendation: championRecommendation ?? null,
          },
          evidence,
          assumptions,
        }
      : {
          draft: true,
          incomplete: true,
          methodologyVersion,
          generatedAt: new Date().toISOString(),
          subject: payload.subject,
          comparables: comparables.map((item) => ({ ...item, canonicalUfM2: calculateCanonicalComparableUfM2(item) })),
          qualitativeFactors,
          justification: justification || null,
          decision: { rateAnchor, championRecommendation: championRecommendation ?? null },
          evidence,
          completion: {
            selectedComparableCount,
            hasBuiltRate: Boolean(payload.subject.builtRateUfM2),
            hasLandRate: Boolean(payload.subject.landRateUfM2),
            hasUsefulRate: Boolean(payload.subject.usefulRateUfM2),
            hasProfessionalJustification: Boolean(justification),
          },
        }

    const warnings = complete && result
      ? [...result.warnings, ...(!resolvedSourcePropertyId ? ['La valorización no está vinculada a una propiedad operacional y no puede alimentar pricing.'] : [])]
      : ['Borrador incompleto: no publicable ni enviable a revisión.']

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .insert({
        subject_property_id: resolvedSourcePropertyId,
        requested_by: scope.profileId,
        status: 'draft',
        valuation_date: new Date().toISOString().slice(0, 10),
        property_type: payload.subject.propertyType,
        address: payload.subject.address.trim(),
        neighborhood: payload.subject.neighborhood.trim(),
        homogeneous_area: payload.subject.homogeneousArea?.trim() || null,
        latitude: payload.subject.latitude ?? null,
        longitude: payload.subject.longitude ?? null,
        rol: payload.subject.rol?.trim() || null,
        land_area_m2: payload.subject.landAreaM2 ?? null,
        built_area_m2: payload.subject.builtAreaM2 ?? null,
        useful_area_m2: payload.subject.usefulAreaM2 ?? null,
        terrace_area_m2: payload.subject.terraceAreaM2 ?? null,
        useful_rate_uf_m2: payload.subject.usefulRateUfM2 ?? null,
        built_rate_uf_m2: payload.subject.builtRateUfM2 ?? null,
        land_rate_uf_m2: payload.subject.landRateUfM2 ?? null,
        bedrooms: payload.subject.bedrooms ?? null,
        bathrooms: payload.subject.bathrooms ?? null,
        parking_spaces: payload.subject.parkingSpaces ?? null,
        construction_year: payload.subject.constructionYear ?? null,
        floor_number: payload.subject.floorNumber ?? null,
        qualitative_factors: qualitativeFactors,
        adjustment_total_pct: 0,
        base_value_uf: result?.baseValueUf ?? null,
        estimated_value_uf: result?.adjustedValueUf ?? null,
        low_value_uf: result?.lowValueUf ?? null,
        high_value_uf: result?.highValueUf ?? null,
        confidence: championRecommendation
          ? (championRecommendation.evidenceGate === 'strict_6_plus' && championRecommendation.comparableSpread <= 0.5 ? 'high' : 'medium')
          : complete && result ? (result.cbrsSummary.count >= 3 && result.portalSummary.count >= 3 ? 'high' : 'medium') : 'low',
        methodology_version: methodologyVersion,
        evidence,
        assumptions,
        warnings,
        justification: justification || (complete ? result?.justification : null),
        report_payload: reportPayload,
      })
      .select('id,version_number')
      .single()

    if (caseError || !valuationCase) {
      console.error('VALUATION_DRAFT_CREATE_FAILED', { code: caseError?.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: complete ? 'No fue posible crear la valorización.' : 'No fue posible guardar el borrador.' }, { status: 422 })
    }

    if (comparables.length) {
      const rows = comparables.map((item, index) => ({
        valuation_case_id: valuationCase.id,
        rank: index + 1,
        similarity_score: item.similarityScore,
        distance_meters: item.distanceMeters ?? null,
        source_type: item.sourceType,
        source_reference: item.sourceReference,
        transaction_date: item.transactionDate ?? null,
        address: item.address,
        neighborhood: item.neighborhood,
        property_type: item.propertyType,
        total_area_m2: item.totalAreaM2 ?? null,
        useful_area_m2: item.sourceType === 'CBRS' && item.propertyType === 'Departamento' ? null : item.usefulAreaM2 ?? null,
        built_area_m2: item.builtAreaM2 ?? null,
        land_area_m2: item.landAreaM2 ?? null,
        bedrooms: item.bedrooms ?? null,
        bathrooms: item.bathrooms ?? null,
        parking_spaces: item.parkingSpaces ?? null,
        price_uf: item.priceUf,
        price_uf_m2: calculateCanonicalComparableUfM2(item),
        selected: item.selected,
        adjustment_pct: item.adjustmentPct,
        adjustment_notes: item.adjustmentNotes?.trim() || null,
        base_value_uf: null,
        adjusted_value_uf: null,
        adjustments: [],
        evidence: [{
          draft: !complete,
          finalWizardComplete: complete,
          sourceReference: item.sourceReference,
          rankingScore: rankingScore(item as ChampionComparable) || null,
          strictPhysicalCompatibility: (item as ChampionComparable).strictPhysicalCompatibility ?? null,
        }],
        contradictions: [],
        match_status: item.selected ? 'accepted' : 'candidate',
        exclusion_reason: null,
        selected_at: item.selected ? new Date().toISOString() : null,
        selected_by: item.selected ? scope.profileId : null,
      }))
      const { error: comparableError } = await supabase.from('valuation_comparables').insert(rows)
      if (comparableError) {
        console.error('VALUATION_DRAFT_COMPARABLES_FAILED', { code: comparableError.code ?? 'UNKNOWN' })
        return NextResponse.json({ error: 'El expediente fue creado, pero no pudimos guardar sus comparables.', caseId: valuationCase.id }, { status: 422 })
      }
    }

    await supabase.from('valuation_case_versions').insert({
      valuation_case_id: valuationCase.id,
      version_number: valuationCase.version_number,
      status: 'draft',
      snapshot: reportPayload,
      created_by: scope.profileId,
    })
    await supabase.from('valuation_decision_log').insert({
      valuation_case_id: valuationCase.id,
      action: 'case_created',
      from_status: null,
      to_status: 'draft',
      reason: complete ? 'Valorización completa creada desde el wizard; pendiente de envío a revisión.' : 'Borrador guardado antes de completar la decisión profesional.',
      actor_id: scope.profileId,
      metadata: { incompleteDraft: !complete, selectedComparableCount, methodologyVersion, rateAnchor, championRecommendation: championRecommendation ?? null },
    })

    return NextResponse.json({
      caseId: valuationCase.id,
      status: 'draft',
      incomplete: !complete,
      selectedComparableCount,
      estimatedValueUf: result?.adjustedValueUf ?? null,
      championRecommendation,
      methodologyVersion,
    }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
