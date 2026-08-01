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
import {
  evaluatePropertyCondition,
  type PropertyConditionAssessment,
} from '@/lib/valuation-condition'

type CreateCasePayload = {
  subject: ValuationSubject
  comparables: ValuationComparable[]
  qualitativeFactors: QualitativeFactors
  conditionAssessment?: PropertyConditionAssessment | null
  justification?: string
  propertyAssignmentId?: string | null
  sourcePropertyId?: string | null
}

function isFiniteOptional(value: number | undefined) {
  return value === undefined || Number.isFinite(value)
}

function validateCoordinates(subject: ValuationSubject) {
  const hasLatitude = subject.latitude !== undefined
  const hasLongitude = subject.longitude !== undefined
  if (hasLatitude !== hasLongitude) return 'Latitud y longitud deben informarse juntas.'
  if (!isFiniteOptional(subject.latitude) || !isFiniteOptional(subject.longitude)) return 'Las coordenadas deben ser numéricas.'
  if (subject.latitude !== undefined && (subject.latitude < -90 || subject.latitude > 90)) return 'La latitud debe estar entre -90 y 90.'
  if (subject.longitude !== undefined && (subject.longitude < -180 || subject.longitude > 180)) return 'La longitud debe estar entre -180 y 180.'
  return null
}

function comparableHasEvidence(item: ValuationComparable) {
  return Boolean(
    item.sourceReference.trim() ||
    item.address.trim() ||
    item.priceUf > 0 ||
    item.priceUfM2 > 0 ||
    item.transactionDate ||
    item.distanceMeters !== undefined,
  )
}

function validateComparable(item: ValuationComparable, index: number) {
  const label = `Comparable ${index + 1}`
  if (!Number.isFinite(item.priceUf) || item.priceUf < 0) return `${label}: precio UF inválido.`
  if (!Number.isFinite(item.priceUfM2) || item.priceUfM2 < 0) return `${label}: UF/m² inválido.`
  if (!Number.isFinite(item.similarityScore) || item.similarityScore < 0 || item.similarityScore > 1) return `${label}: la similitud debe estar entre 0 y 1.`
  if (!Number.isFinite(item.adjustmentPct) || item.adjustmentPct < -35 || item.adjustmentPct > 35) return `${label}: el ajuste debe estar entre -35% y 35%.`
  if (item.distanceMeters !== undefined && (!Number.isFinite(item.distanceMeters) || item.distanceMeters < 0)) return `${label}: la distancia debe ser un número no negativo.`
  if (item.transactionDate) {
    const parsed = Date.parse(`${item.transactionDate}T00:00:00Z`)
    if (Number.isNaN(parsed)) return `${label}: fecha de transacción inválida.`
    if (item.transactionDate > new Date().toISOString().slice(0, 10)) return `${label}: la fecha de transacción no puede estar en el futuro.`
  }
  if (item.selected && item.priceUfM2 > 0) {
    if (!item.sourceReference.trim()) return `${label}: la referencia de fuente es obligatoria.`
    if (!item.address.trim()) return `${label}: la dirección es obligatoria.`
    if (item.sourceType === 'CBRS' && !item.transactionDate) return `${label}: una transacción CBRS requiere fecha.`
  }
  return null
}

function validatePayload(payload: CreateCasePayload) {
  if (!payload || typeof payload !== 'object') return 'Payload inválido.'
  if (!payload.subject || !Array.isArray(payload.comparables) || !payload.qualitativeFactors) return 'Faltan datos de la valorización.'
  if (!payload.subject.address?.trim() || !payload.subject.neighborhood?.trim()) return 'Dirección y barrio son obligatorios.'
  const coordinateError = validateCoordinates(payload.subject)
  if (coordinateError) return coordinateError
  const submitted = payload.comparables.filter(comparableHasEvidence)
  for (const [index, item] of submitted.entries()) {
    const error = validateComparable(item, index)
    if (error) return error
  }
  return null
}

export async function GET() {
  try {
    const scope = await requireAnyCapability(['valuations.global.read', 'valuations.office.read', 'valuations.self.read'])
    const supabase = await createClient()
    let query = supabase
      .from('valuation_cases')
      .select('id,status,valuation_date,subject_property_id,address,neighborhood,property_type,estimated_value_uf,low_value_uf,high_value_uf,confidence,condition_status,condition_score,condition_version,version_number,created_at,updated_at')
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

    const payloadError = validatePayload(payload)
    if (payloadError) return NextResponse.json({ error: payloadError }, { status: 400 })

    const submittedComparables = payload.comparables.filter(comparableHasEvidence)
    let assignmentEvidence: Record<string, unknown> | null = null
    let resolvedSubjectPropertyId = payload.sourcePropertyId?.trim() || null

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
      if (resolvedSubjectPropertyId && assignment.property_id !== resolvedSubjectPropertyId) {
        return NextResponse.json({ error: 'La propiedad no corresponde a la asignación indicada.' }, { status: 400 })
      }
      resolvedSubjectPropertyId = assignment.property_id
      assignmentEvidence = {
        propertyAssignmentId: assignment.id,
        sourcePropertyId: assignment.property_id,
        assignmentRole: assignment.assignment_role,
        assignedAt: assignment.assigned_at,
      }
    } else if (resolvedSubjectPropertyId && scope.scope === 'self') {
      return NextResponse.json({ error: 'Para vincular una propiedad se requiere una asignación activa.' }, { status: 403 })
    }

    if (resolvedSubjectPropertyId) {
      const { data: property, error: propertyError } = await supabase
        .from('market_properties')
        .select('id,canonical_key')
        .eq('id', resolvedSubjectPropertyId)
        .maybeSingle()

      if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 422 })
      if (!property) return NextResponse.json({ error: 'La propiedad vinculada no existe en el inventario operacional.' }, { status: 400 })
    }

    let result
    try {
      result = calculateContractualValuation(payload.subject, submittedComparables, payload.qualitativeFactors)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible calcular la valorización.' }, { status: 400 })
    }

    const conditionResult = payload.conditionAssessment
      ? evaluatePropertyCondition(payload.conditionAssessment)
      : null
    const reportPayload = {
      ...buildValuationReportPayload(payload.subject, submittedComparables, payload.qualitativeFactors, result),
      subjectPropertyId: resolvedSubjectPropertyId,
      conditionAssessment: payload.conditionAssessment ?? null,
      conditionResult,
    }
    const status = 'draft' as const
    const selectedComparables = submittedComparables.filter((item) => item.selected && item.priceUfM2 > 0)
    const distanceCoverage = selectedComparables.length
      ? selectedComparables.filter((item) => item.distanceMeters !== undefined).length / selectedComparables.length
      : 0
    const transactionDateCoverage = selectedComparables.length
      ? selectedComparables.filter((item) => Boolean(item.transactionDate)).length / selectedComparables.length
      : 0
    const evidence = {
      comparableCount: result.comparableCount,
      subjectPropertyId: resolvedSubjectPropertyId,
      assignment: assignmentEvidence,
      subjectCoordinatesPresent: payload.subject.latitude !== undefined && payload.subject.longitude !== undefined,
      comparableDistanceCoveragePct: Number((distanceCoverage * 100).toFixed(1)),
      comparableTransactionDateCoveragePct: Number((transactionDateCoverage * 100).toFixed(1)),
      conditionEvidenceCoveragePct: conditionResult?.evidenceCoveragePct ?? null,
    }
    const assumptions = {
      selectedComparablesOnly: true,
      sourceAssignmentVerified: Boolean(assignmentEvidence),
      subjectPropertyLinked: Boolean(resolvedSubjectPropertyId),
      coordinatesUserSupplied: payload.subject.latitude !== undefined && payload.subject.longitude !== undefined,
      conditionDoesNotApplyAutomaticEconomicAdjustment: true,
    }
    const warnings = [
      ...(result.comparableCount < 3 ? ['Se requieren al menos tres comparables aceptados para solicitar revisión.'] : []),
      ...(!resolvedSubjectPropertyId ? ['La valorización no está vinculada a una propiedad operacional y no puede alimentar pricing.'] : []),
      ...(conditionResult?.status === 'not_evaluable' ? ['El estado de la propiedad no es evaluable con la evidencia disponible.'] : []),
      ...(conditionResult?.blockers ?? []).map((blocker) => `Estado de propiedad: ${blocker}`),
    ]

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .insert({
        subject_property_id: resolvedSubjectPropertyId,
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
        condition_assessment: payload.conditionAssessment ?? {},
        condition_result: conditionResult ?? {},
        adjustment_total_pct: result.qualitativeAdjustmentPct,
        base_value_uf: result.baseValueUf,
        estimated_value_uf: result.adjustedValueUf,
        low_value_uf: result.lowValueUf,
        high_value_uf: result.highValueUf,
        confidence: result.comparableCount >= 4 ? 'high' : 'medium',
        methodology_version: 'valuation-contract-v1',
        evidence,
        assumptions,
        warnings,
        justification: payload.justification?.trim() || result.justification,
        report_payload: { ...reportPayload, evidence, assumptions },
      })
      .select('id,subject_property_id,version_number,condition_status,condition_score,condition_version')
      .single()

    if (caseError || !valuationCase) {
      return NextResponse.json({ error: caseError?.message ?? 'No fue posible crear la valorización' }, { status: 422 })
    }

    const comparableRows = submittedComparables.map((item, index) => ({
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
      adjustment_notes: item.adjustmentNotes?.trim() || null,
      base_value_uf: item.priceUf,
      adjusted_value_uf: item.priceUf * (1 + item.adjustmentPct / 100),
      adjustments: [{ type: 'manual_pct', value: item.adjustmentPct }],
      evidence: [{
        sourceReference: item.sourceReference,
        transactionDate: item.transactionDate ?? null,
        distanceMeters: item.distanceMeters ?? null,
      }],
      contradictions: [],
      match_status: item.selected ? 'accepted' : 'excluded',
      selection_reason: item.selected ? 'Seleccionado durante la creación del borrador' : null,
      exclusion_reason: item.selected ? null : 'Excluido durante la creación del borrador',
      selected_at: item.selected ? new Date().toISOString() : null,
      selected_by: item.selected ? scope.profileId : null,
      source_observed_at: null,
      source_methodology_version: 'valuation-contract-v1',
    }))

    const { error: comparableError } = await supabase.from('valuation_comparables').insert(comparableRows)
    if (comparableError) return NextResponse.json({ error: comparableError.message, caseId: valuationCase.id }, { status: 422 })

    const { error: versionError } = await supabase.from('valuation_case_versions').insert({
      valuation_case_id: valuationCase.id,
      version_number: valuationCase.version_number,
      status,
      snapshot: { ...reportPayload, evidence, assumptions },
      created_by: scope.profileId,
    })
    if (versionError) return NextResponse.json({ error: versionError.message, caseId: valuationCase.id }, { status: 422 })

    const { error: decisionError } = await supabase.from('valuation_decision_log').insert({
      valuation_case_id: valuationCase.id,
      action: 'case_created',
      from_status: null,
      to_status: status,
      reason: assignmentEvidence
        ? 'Caso creado desde una propiedad asignada y verificada. La revisión debe solicitarse desde el expediente canónico.'
        : 'Caso creado como borrador. La revisión debe solicitarse desde el expediente canónico.',
      actor_id: scope.profileId,
      metadata: {
        comparableCount: result.comparableCount,
        subjectPropertyId: valuationCase.subject_property_id,
        assignment: assignmentEvidence,
        subjectCoordinates: payload.subject.latitude !== undefined && payload.subject.longitude !== undefined
          ? { latitude: payload.subject.latitude, longitude: payload.subject.longitude }
          : null,
        conditionStatus: valuationCase.condition_status,
        conditionScore: valuationCase.condition_score,
        conditionVersion: valuationCase.condition_version,
      },
    })
    if (decisionError) return NextResponse.json({ error: decisionError.message, caseId: valuationCase.id }, { status: 422 })

    return NextResponse.json({
      caseId: valuationCase.id,
      subjectPropertyId: valuationCase.subject_property_id,
      propertyLinked: Boolean(valuationCase.subject_property_id),
      result,
      conditionResult,
      status,
      assignmentVerified: Boolean(assignmentEvidence),
    }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
