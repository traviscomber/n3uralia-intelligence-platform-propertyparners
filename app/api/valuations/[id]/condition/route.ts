import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  accessErrorResponse,
  assertProfileVisible,
  requireAnyCapability,
} from '@/lib/access-guards'
import {
  evaluatePropertyCondition,
  type PropertyConditionAssessment,
} from '@/lib/valuation-condition'

async function getAccess() {
  const scope = await requireAnyCapability([
    'valuations.self.read',
    'valuations.office.read',
    'valuations.global.read',
  ])
  const supabase = await createClient()
  return { scope, supabase }
}

function logDatabaseFailure(stage: string, error: unknown) {
  console.error(stage, {
    code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN',
  })
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { scope, supabase } = await getAccess()
    const { id } = await context.params
    const { data, error } = await supabase
      .from('valuation_cases')
      .select('id,status,requested_by,condition_assessment,condition_result,condition_status,condition_score,condition_version')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logDatabaseFailure('VALUATION_CONDITION_LOAD_FAILED', error)
      return NextResponse.json({ error: 'No pudimos cargar la inspección de la valorización.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    assertProfileVisible(scope, data.requested_by)

    return NextResponse.json({
      assessment: data.condition_assessment,
      result: data.condition_result,
      status: data.status,
      canEdit: data.status === 'draft' && (
        data.requested_by === scope.profileId
        || scope.capabilities.includes('valuations.office.review')
        || scope.capabilities.includes('valuations.global.approve')
      ),
    })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { scope, supabase } = await getAccess()
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const assessment = body?.assessment as PropertyConditionAssessment | undefined
    if (!assessment) return NextResponse.json({ error: 'assessment requerido' }, { status: 400 })

    const { data: valuationCase, error: caseError } = await supabase
      .from('valuation_cases')
      .select('id,status,requested_by,version_number,report_payload,rol,address')
      .eq('id', id)
      .maybeSingle()

    if (caseError) {
      logDatabaseFailure('VALUATION_CONDITION_CASE_LOAD_FAILED', caseError)
      return NextResponse.json({ error: 'No pudimos cargar la valorización.' }, { status: 500 })
    }
    if (!valuationCase) return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    assertProfileVisible(scope, valuationCase.requested_by)

    const canEdit = valuationCase.requested_by === scope.profileId
      || scope.capabilities.includes('valuations.office.review')
      || scope.capabilities.includes('valuations.global.approve')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso para editar la inspección' }, { status: 403 })
    if (valuationCase.status !== 'draft') {
      return NextResponse.json({ error: 'La inspección sólo puede modificarse mientras el caso está en borrador' }, { status: 409 })
    }

    const result = evaluatePropertyCondition(assessment)
    const nextVersion = Number(valuationCase.version_number) + 1
    const nextReportPayload = {
      ...(valuationCase.report_payload as Record<string, unknown> ?? {}),
      conditionAssessment: assessment,
      conditionResult: result,
    }

    const { data: updated, error: updateError } = await supabase
      .from('valuation_cases')
      .update({
        condition_assessment: assessment,
        condition_result: result,
        report_payload: nextReportPayload,
        version_number: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version_number', valuationCase.version_number)
      .select('id,status,version_number,condition_status,condition_score,condition_version')
      .single()

    if (updateError) {
      logDatabaseFailure('VALUATION_CONDITION_UPDATE_FAILED', updateError)
      return NextResponse.json({ error: 'No pudimos actualizar la inspección. Recarga la valorización e inténtalo nuevamente.' }, { status: 409 })
    }

    const { error: versionError } = await supabase.from('valuation_case_versions').insert({
      valuation_case_id: id,
      version_number: updated.version_number,
      status: updated.status,
      snapshot: nextReportPayload,
      created_by: scope.profileId,
    })
    if (versionError) {
      logDatabaseFailure('VALUATION_CONDITION_VERSION_FAILED', versionError)
      return NextResponse.json({ error: 'La inspección fue actualizada, pero no pudimos registrar su versión.' }, { status: 422 })
    }

    const { error: logError } = await supabase.from('valuation_decision_log').insert({
      valuation_case_id: id,
      action: 'condition_assessment_updated',
      actor_id: scope.profileId,
      from_status: updated.status,
      to_status: updated.status,
      reason: String(body?.reason || 'Actualización de ficha de inspección del estado de la propiedad'),
      metadata: {
        conditionStatus: updated.condition_status,
        conditionScore: updated.condition_score,
        conditionVersion: updated.condition_version,
        coveragePct: result.coveragePct,
        evidenceCoveragePct: result.evidenceCoveragePct,
        blockers: result.blockers,
        transformation: result.transformation,
      },
    })
    if (logError) {
      logDatabaseFailure('VALUATION_CONDITION_AUDIT_LOG_FAILED', logError)
      return NextResponse.json({ error: 'La inspección fue actualizada, pero no pudimos registrar la trazabilidad.' }, { status: 422 })
    }

    let transformationEvidenceId: string | null = null
    const transformation = assessment.transformation
    const source = transformation?.sources?.find((item) => item.reference?.trim())
    if (transformation && source && ['weak_evidence', 'verified'].includes(transformation.status)) {
      const admin = createAdminClient()
      const { data: evidenceId, error: evidenceError } = await admin.rpc('valuation_ml_upsert_transformation_evidence_v1', {
        p_rol: valuationCase.rol ?? null,
        p_address: valuationCase.address ?? null,
        p_evidence_type: source.kind,
        p_source_url: source.reference.trim(),
        p_source_observed_at: source.observedAt || new Date().toISOString(),
        p_effective_date: transformation.effectiveDate || null,
        p_verified: transformation.status === 'verified',
        p_strength: transformation.status === 'verified' ? 3 : 1,
        p_built_area_override: transformation.builtAreaOverrideM2 ?? null,
        p_construction_year_override: transformation.constructionYearOverride ?? null,
        p_notes: transformation.summary || source.note || null,
        p_metadata: { valuationCaseId: id, source: 'condition_assessment', conditionVersion: updated.condition_version },
      })
      if (evidenceError) logDatabaseFailure('VALUATION_TRANSFORMATION_EVIDENCE_SYNC_FAILED', evidenceError)
      else transformationEvidenceId = typeof evidenceId === 'string' ? evidenceId : null
    }

    return NextResponse.json({ assessment, result, versionNumber: updated.version_number, transformationEvidenceId })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
