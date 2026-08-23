import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import { canUnlockV2Features } from '@/lib/v2-feature-access'
import {
  calculateCanonicalComparableUfM2,
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
      return NextResponse.json(
        { error: 'Para guardar el borrador se requieren dirección y barrio.' },
        { status: 400 },
      )
    }

    if (payload.subject.propertyType === 'Departamento') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!canUnlockV2Features(user)) {
        return NextResponse.json(
          { error: 'La valorización de departamentos estará disponible en la versión 2.' },
          { status: 403 },
        )
      }
    }

    const comparables = Array.isArray(payload.comparables) ? payload.comparables : []
    const selectedComparableCount = comparables.filter((item) => item.selected).length
    const snapshot = {
      draft: true,
      incomplete: true,
      methodologyVersion: 'property-partners-valuation-v2',
      generatedAt: new Date().toISOString(),
      subject: payload.subject,
      comparables: comparables.map((item) => ({
        ...item,
        canonicalUfM2: calculateCanonicalComparableUfM2(item),
      })),
      qualitativeFactors: payload.qualitativeFactors ?? {},
      justification: payload.justification?.trim() || null,
      decision: payload.decision ?? null,
      completion: {
        selectedComparableCount,
        hasBuiltRate: Boolean(payload.subject.builtRateUfM2),
        hasLandRate: Boolean(payload.subject.landRateUfM2),
        hasUsefulRate: Boolean(payload.subject.usefulRateUfM2),
        hasProfessionalJustification: Boolean(payload.justification?.trim()),
      },
    }

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .insert({
        subject_property_id: payload.sourcePropertyId?.trim() || null,
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
        qualitative_factors: payload.qualitativeFactors ?? {},
        adjustment_total_pct: 0,
        base_value_uf: null,
        estimated_value_uf: null,
        low_value_uf: null,
        high_value_uf: null,
        confidence: 'low',
        methodology_version: 'property-partners-valuation-v2',
        evidence: {
          draft: true,
          selectedComparableCount,
          propertyAssignmentId: payload.propertyAssignmentId ?? null,
          subjectPropertyId: payload.sourcePropertyId ?? null,
        },
        assumptions: {
          incompleteDraft: true,
          noEconomicResultUntilProfessionalRatesAreConfirmed: true,
        },
        warnings: ['Borrador incompleto: no publicable ni enviable a revisión.'],
        justification: payload.justification?.trim() || null,
        report_payload: snapshot,
      })
      .select('id,version_number')
      .single()

    if (caseError || !valuationCase) {
      console.error('VALUATION_DRAFT_CREATE_FAILED', { code: caseError?.code ?? 'UNKNOWN' })
      return NextResponse.json({ error: 'No fue posible guardar el borrador.' }, { status: 422 })
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
        useful_area_m2: item.usefulAreaM2 ?? null,
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
        evidence: [{ draft: true, sourceReference: item.sourceReference }],
        contradictions: [],
        match_status: item.selected ? 'accepted' : 'candidate',
        exclusion_reason: null,
        selected_at: item.selected ? new Date().toISOString() : null,
        selected_by: item.selected ? scope.profileId : null,
      }))

      const { error: comparableError } = await supabase.from('valuation_comparables').insert(rows)
      if (comparableError) {
        console.error('VALUATION_DRAFT_COMPARABLES_FAILED', { code: comparableError.code ?? 'UNKNOWN' })
        return NextResponse.json(
          { error: 'El borrador fue creado, pero no pudimos guardar sus comparables.', caseId: valuationCase.id },
          { status: 422 },
        )
      }
    }

    await supabase.from('valuation_case_versions').insert({
      valuation_case_id: valuationCase.id,
      version_number: valuationCase.version_number,
      status: 'draft',
      snapshot,
      created_by: scope.profileId,
    })

    await supabase.from('valuation_decision_log').insert({
      valuation_case_id: valuationCase.id,
      action: 'case_created',
      from_status: null,
      to_status: 'draft',
      reason: 'Borrador guardado antes de completar la decisión profesional.',
      actor_id: scope.profileId,
      metadata: {
        incompleteDraft: true,
        selectedComparableCount,
        methodologyVersion: 'property-partners-valuation-v2',
      },
    })

    return NextResponse.json({
      caseId: valuationCase.id,
      status: 'draft',
      incomplete: true,
      selectedComparableCount,
    }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
