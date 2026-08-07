import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LEADER_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const CALCULATED_SOURCE = 'canonical_calculated_v1'
const APPROVABLE_RECONCILIATION = new Set(['exact', 'within_tolerance'])

type ReconciliationRow = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  published_value_id: string | null
  calculated_value_id: string | null
  published_value: number | string | null
  calculated_value: number | string | null
  absolute_delta: number | string | null
  relative_delta: number | string | null
  tolerance: number | string
  reconciliation_status: string
  publication_status: string
  formula_version: number
  evidence: Record<string, unknown> | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[management-reconciliation] profile lookup failed', { code: error.code })
    return { error: NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 }) }
  }

  const role = String(profile?.role ?? '').toLowerCase()
  if (!LEADER_ROLES.has(role)) {
    return { error: NextResponse.json({ error: 'Sin permisos de gestión' }, { status: 403 }) }
  }

  return { supabase, user, role }
}

function numeric(value: number | string | null | undefined) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, role } = ctx

  const [valuesResult, reconciliationsResult, entitiesResult, definitionsResult] = await Promise.all([
    supabase
      .from('management_metric_values')
      .select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,quality_status,evaluation_status,formula_version,updated_at')
      .order('period_end', { ascending: false })
      .limit(500),
    supabase
      .from('management_metric_reconciliations')
      .select('*')
      .order('period_end', { ascending: false })
      .limit(500),
    supabase.from('management_entities').select('id,name,entity_type').eq('active', true).order('name'),
    supabase.from('management_metric_definitions').select('code,label,unit,formula_version').eq('active', true).order('sort_order'),
  ])

  const failure = [valuesResult, reconciliationsResult, entitiesResult, definitionsResult].find((result) => result.error)
  if (failure?.error) {
    console.error('[management-reconciliation] query failed', { code: failure.error.code })
    return NextResponse.json({ error: 'No fue posible cargar la reconciliación.' }, { status: 500 })
  }

  const values = valuesResult.data ?? []
  const reconciliations = (reconciliationsResult.data ?? []) as ReconciliationRow[]
  const valueById = new Map(values.map((value) => [value.id, value]))
  const entityById = new Map((entitiesResult.data ?? []).map((entity) => [entity.id, entity]))
  const definitionByCode = new Map((definitionsResult.data ?? []).map((definition) => [definition.code, definition]))

  const verifiedEvaluable = values.filter((value) => value.quality_status === 'verified' && value.evaluation_status === 'evaluable')
  const calculatedValues = verifiedEvaluable.filter((value) => value.source_name === CALCULATED_SOURCE)
  const sourceValues = verifiedEvaluable.filter((value) => value.source_name !== CALCULATED_SOURCE)

  const rows = reconciliations.map((row) => {
    const calculated = row.calculated_value_id ? valueById.get(row.calculated_value_id) ?? null : null
    const published = row.published_value_id ? valueById.get(row.published_value_id) ?? null : null
    const eligible = Boolean(
      row.calculated_value_id &&
      calculated?.source_name === CALCULATED_SOURCE &&
      calculated?.quality_status === 'verified' &&
      calculated?.evaluation_status === 'evaluable' &&
      APPROVABLE_RECONCILIATION.has(row.reconciliation_status) &&
      numeric(row.calculated_value) !== null,
    )

    return {
      ...row,
      entityName: entityById.get(row.entity_id)?.name ?? row.entity_id,
      metricLabel: definitionByCode.get(row.metric_code)?.label ?? row.metric_code,
      calculatedSource: calculated?.source_name ?? null,
      publishedSource: published?.source_name ?? null,
      eligible,
    }
  })

  const pendingApproval = rows.filter((row) => row.eligible && row.publication_status !== 'approved')
  const approved = rows.filter((row) => row.publication_status === 'approved')
  const blocked = rows.filter((row) => !row.eligible || row.publication_status === 'blocked')

  const sourceSummary = [...new Map(values.map((value) => [value.source_name, value.source_name])).values()]
    .map((sourceName) => {
      const sourceRows = values.filter((value) => value.source_name === sourceName)
      return {
        sourceName,
        count: sourceRows.length,
        verified: sourceRows.filter((value) => value.quality_status === 'verified').length,
        evaluable: sourceRows.filter((value) => value.evaluation_status === 'evaluable').length,
      }
    })
    .sort((left, right) => right.count - left.count || left.sourceName.localeCompare(right.sourceName))

  return NextResponse.json({
    role,
    canApprove: role === 'ceo',
    calculatedSource: CALCULATED_SOURCE,
    counts: {
      metricValues: values.length,
      verifiedEvaluable: verifiedEvaluable.length,
      sourceValues: sourceValues.length,
      calculatedValues: calculatedValues.length,
      reconciliations: rows.length,
      pendingApproval: pendingApproval.length,
      approved: approved.length,
      blocked: blocked.length,
    },
    readiness: {
      calculatedSourceAvailable: calculatedValues.length > 0,
      reconciliationAvailable: rows.length > 0,
      approvalAvailable: pendingApproval.length > 0,
    },
    sourceSummary,
    reconciliations: rows,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, user, role } = ctx
  if (role !== 'ceo') {
    return NextResponse.json({ error: 'Solo Dirección puede aprobar o rechazar publicación.' }, { status: 403 })
  }

  const body = await request.json() as Record<string, unknown>
  const id = String(body.id ?? '')
  const action = String(body.action ?? '')
  const notes = String(body.notes ?? '').trim().slice(0, 1000) || null
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const { data: before, error: beforeError } = await supabase
    .from('management_metric_reconciliations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (beforeError) {
    console.error('[management-reconciliation] lookup failed', { code: beforeError.code })
    return NextResponse.json({ error: 'No fue posible consultar la reconciliación.' }, { status: 500 })
  }
  if (!before) return NextResponse.json({ error: 'Reconciliación no encontrada' }, { status: 404 })

  if (action === 'approve') {
    if (!before.calculated_value_id || !APPROVABLE_RECONCILIATION.has(String(before.reconciliation_status))) {
      return NextResponse.json({ error: 'La reconciliación no cumple condiciones de publicación.' }, { status: 409 })
    }

    const { data: calculated, error: calculatedError } = await supabase
      .from('management_metric_values')
      .select('id,source_name,quality_status,evaluation_status,value,formula_version')
      .eq('id', before.calculated_value_id)
      .maybeSingle()

    if (calculatedError) {
      console.error('[management-reconciliation] calculated value lookup failed', { code: calculatedError.code })
      return NextResponse.json({ error: 'No fue posible validar el cálculo canónico.' }, { status: 500 })
    }
    if (!calculated || calculated.source_name !== CALCULATED_SOURCE || calculated.quality_status !== 'verified' || calculated.evaluation_status !== 'evaluable' || calculated.value == null) {
      return NextResponse.json({ error: 'Falta un cálculo canónico verificado y evaluable.' }, { status: 409 })
    }

    if (Number(calculated.formula_version) !== Number(before.formula_version)) {
      return NextResponse.json({ error: 'La versión de fórmula no coincide con la reconciliación.' }, { status: 409 })
    }
  }

  const now = new Date().toISOString()
  const update = action === 'approve'
    ? { publication_status: 'approved', approved_by: user.id, approved_at: now, notes }
    : { publication_status: 'rejected', approved_by: null, approved_at: null, notes }

  const { data, error } = await supabase
    .from('management_metric_reconciliations')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[management-reconciliation] update failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible actualizar la publicación.' }, { status: 400 })
  }

  const { error: logError } = await supabase.from('management_change_log').insert({
    entity_name: 'management_metric_reconciliations',
    entity_id: id,
    action: action === 'approve' ? 'approve' : 'reject',
    before_data: before,
    after_data: data,
    changed_by: user.id,
  })

  if (logError) {
    console.error('[management-reconciliation] change log failed', { code: logError.code })
    return NextResponse.json({ error: 'La publicación cambió, pero falló el registro de trazabilidad.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
