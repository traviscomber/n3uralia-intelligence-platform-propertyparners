import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireAnyCapability } from '@/lib/access-guards'
import {
  buildValuationReportPayload,
  calculateContractualValuation,
  type QualitativeFactors,
  type ValuationComparable,
  type ValuationSubject,
} from '@/lib/valuation-contract'

type CreateCasePayload = {
  subject: ValuationSubject
  comparables: ValuationComparable[]
  qualitativeFactors: QualitativeFactors
  justification?: string
  propertyAssignmentId?: string | null
  sourcePropertyId?: string | null
}

export async function GET() {
  try {
    const scope = await requireAnyCapability(['valuations.global.read', 'valuations.office.read', 'valuations.self.read'])
    const supabase = await createClient()
    let query = supabase
      .from('valuation_cases')
      .select('id,status,valuation_date,address,neighborhood,property_type,estimated_value_uf,low_value_uf,high_value_uf,confidence,version_number,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (scope.scope === 'self') query = query.eq('requested_by', scope.profileId)
    else if (scope.scope === 'office') query = query.in('requested_by', scope.visibleProfileIds)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ cases: data ?? [] })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const scope = await requireAnyCapability(['valuations.self.create', 'valuations.office.review', 'valuations.global.approve'])
    const supabase = await createClient()

    let payload: CreateCasePayload
    try {
      payload = await request.json() as CreateCasePayload
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    let assignmentEvidence: Record<string, unknown> | null = null
    if (payload.propertyAssignmentId) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('property_assignments')
        .select('id,assigned_to,property_id,status,assignment_role,assigned_at')
        .eq('id', payload.propertyAssignmentId)
        .maybeSingle()

      if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 422 })
      if (!assignment || assignment.assigned_to !== scope.profileId || assignment.status !== 'active') {
        return NextResponse.json({ error: 'La asignación no pertenece al perfil autenticado o ya no está activa.' }, { status: 403 })
      }
      if (payload.sourcePropertyId && assignment.property_id !== payload.sourcePropertyId) {
        return NextResponse.json({ error: 'La propiedad no corresponde a la asignación indicada.' }, { status: 400 })
      }
      assignmentEvidence = {
        propertyAssignmentId: assignment.id,
        sourcePropertyId: assignment.property_id,
        assignmentRole: assignment.assignment_role,
        assignedAt: assignment.assigned_at,
      }
    }

    const result = calculateContractualValuation(payload.subject, payload.comparables, payload.qualitativeFactors)
    const reportPayload = buildValuationReportPayload(payload.subject, payload.comparables, payload.qualitativeFactors, result)
    const status = 'draft' as const
    const evidence = { comparableCount: result.comparableCount, assignment: assignmentEvidence }
    const assumptions = { selectedComparablesOnly: true, sourceAssignmentVerified: Boolean(assignmentEvidence) }

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .insert({
        requested_by: scope.profileId,
        status,
        valuation_date: new Date().toISOString().slice(0, 10),
        property_type: payload.subject.propertyType,
        address: payload.subject.address,
        neighborhood: payload.subject.neighborhood,
        homogeneous_area: payload.subject.homogeneousArea ?? null,
        latitude: payload.subject.latitude ?? null,
        longitude: payload.subject.longitude ?? null,
        rol: payload.subject.rol ?? null,
        land_area_m2: payload.subject.landAreaM2 ?? null,
        built_area_m2: payload.subject.builtAreaM2 ?? null,
        useful_area_m2: payload.subject.usefulAreaM2 ?? null,
        terrace_area_m2: payload.subject.terraceAreaM2 ?? null,
        bedrooms: payload.subject.bedrooms ?? null,
        bathrooms: payload.subject.bathrooms ?? null,
        parking_spaces: payload.subject.parkingSpaces ?? null,
        construction_year: payload.subject.constructionYear ?? null,
        floor_number: payload.subject.floorNumber ?? null,
        qualitative_factors: payload.qualitativeFactors,
        adjustment_total_pct: result.qualitativeAdjustmentPct,
        base_value_uf: result.baseValueUf,
        estimated_value_uf: result.adjustedValueUf,
        low_value_uf: result.lowValueUf,
        high_value_uf: result.highValueUf,
        confidence: result.comparableCount >= 4 ? 'high' : 'medium',
        methodology_version: 'valuation-contract-v1',
        evidence,
        assumptions,
        warnings: result.comparableCount < 3 ? ['Se requieren al menos tres comparables aceptados para solicitar revisión.'] : [],
        justification: payload.justification || result.justification,
        report_payload: { ...reportPayload, evidence, assumptions },
      })
      .select('id,version_number')
      .single()

    if (caseError || !valuationCase) {
      return NextResponse.json({ error: caseError?.message ?? 'No fue posible crear la valorización' }, { status: 422 })
    }

    const comparableRows = payload.comparables.map((item, index) => ({
      valuation_case_id: valuationCase.id,
      rank: index + 1,
      similarity_score: item.similarityScore,
      source_type: item.sourceType,
      source_reference: item.sourceReference,
      transaction_date: item.transactionDate ?? null,
      address: item.address,
      neighborhood: item.neighborhood,
      property_type: item.propertyType,
      useful_area_m2: item.usefulAreaM2 ?? null,
      built_area_m2: item.builtAreaM2 ?? null,
      land_area_m2: item.landAreaM2 ?? null,
      bedrooms: item.bedrooms ?? null,
      bathrooms: item.bathrooms ?? null,
      parking_spaces: item.parkingSpaces ?? null,
      price_uf: item.priceUf,
      price_uf_m2: item.priceUfM2,
      selected: item.selected,
      adjustment_pct: item.adjustmentPct,
      adjustment_notes: item.adjustmentNotes ?? null,
      base_value_uf: item.priceUf,
      adjusted_value_uf: item.priceUf * (1 + item.adjustmentPct / 100),
      adjustments: { pct: item.adjustmentPct },
      evidence: { sourceReference: item.sourceReference },
      contradictions: [],
      match_status: item.selected ? 'accepted' : 'excluded',
      selection_reason: item.selected ? 'Seleccionado durante la creación del borrador' : null,
      exclusion_reason: item.selected ? null : 'Excluido durante la creación del borrador',
      selected_at: item.selected ? new Date().toISOString() : null,
      selected_by: item.selected ? scope.profileId : null,
    }))

    const { error: comparableError } = await supabase.from('valuation_comparables').insert(comparableRows)
    if (comparableError) return NextResponse.json({ error: comparableError.message, caseId: valuationCase.id }, { status: 422 })

    await supabase.from('valuation_case_versions').insert({
      valuation_case_id: valuationCase.id,
      version_number: valuationCase.version_number,
      status,
      snapshot: { ...reportPayload, evidence, assumptions },
      created_by: scope.profileId,
    })

    await supabase.from('valuation_decision_log').insert({
      valuation_case_id: valuationCase.id,
      action: 'case_created',
      from_status: null,
      to_status: status,
      reason: assignmentEvidence
        ? 'Caso creado desde una propiedad asignada y verificada. La revisión debe solicitarse desde el expediente canónico.'
        : 'Caso creado como borrador. La revisión debe solicitarse desde el expediente canónico.',
      actor_id: scope.profileId,
      metadata: { comparableCount: result.comparableCount, assignment: assignmentEvidence },
    })

    return NextResponse.json({ caseId: valuationCase.id, result, status, assignmentVerified: Boolean(assignmentEvidence) }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
