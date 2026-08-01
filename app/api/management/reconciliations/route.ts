import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateManagementMetricReconciliation,
  canApproveManagementMetricReconciliation,
} from '@/lib/management-metric-reconciliation-core'

export const runtime = 'nodejs'

const LEADER_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CALCULATED_SOURCE = 'canonical_calculated_v1'

type MetricValueRow = {
  id: string
  entity_id: string
  metric_code: string
  period_start: string
  period_end: string
  value: number | string | null
  source_name: string
  source_reference: string | null
  source_cutoff_at: string | null
  quality_status: string
  evaluation_status: string
  formula_version: number
  evidence: Record<string, unknown> | null
}

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[management-reconciliations] profile lookup failed', { message: error.message })
    return { error: NextResponse.json({ error: 'No fue posible validar el perfil' }, { status: 500 }) }
  }

  const role = String(profile?.role ?? '').trim().toLowerCase()
  if (!LEADER_ROLES.has(role)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { supabase, user, role }
}

function validUuid(value: unknown) {
  return UUID_PATTERN.test(String(value ?? '').trim())
}

function note(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized.slice(0, 2000) : null
}

async function writeChangeLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    id: string
    action: string
    userId: string
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
  },
) {
  const { error } = await supabase.from('management_change_log').insert({
    entity_name: 'management_metric_reconciliations',
    entity_id: input.id,
    action: input.action,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
    changed_by: input.userId,
  })
  if (error) {
    console.error('[management-reconciliations] change log failed', {
      reconciliationId: input.id,
      message: error.message,
    })
  }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, role } = ctx

  const [entities, definitions, values, reconciliations] = await Promise.all([
    supabase
      .from('management_entities')
      .select('id,name,entity_type,parent_id')
      .eq('active', true)
      .order('name'),
    supabase
      .from('management_metric_definitions')
      .select('code,label,unit,formula_version,methodology')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('management_metric_values')
      .select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,source_cutoff_at,quality_status,evaluation_status,formula_version,evidence,created_at')
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('management_metric_reconciliations')
      .select('*')
      .order('period_start', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1000),
  ])

  const failure = [entities, definitions, values, reconciliations].find((result) => result.error)
  if (failure?.error) {
    console.error('[management-reconciliations] GET failed', { message: failure.error.message })
    return NextResponse.json({ error: 'No fue posible cargar la conciliación' }, { status: 500 })
  }

  return NextResponse.json({
    role,
    calculatedSource: CALCULATED_SOURCE,
    entities: entities.data ?? [],
    definitions: definitions.data ?? [],
    values: values.data ?? [],
    reconciliations: reconciliations.data ?? [],
  })
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, user, role } = ctx

  try {
    const body = await request.json() as Record<string, unknown>
    const publishedValueId = String(body.publishedValueId ?? '').trim()
    const calculatedValueId = String(body.calculatedValueId ?? '').trim()
    if (!validUuid(publishedValueId) || !validUuid(calculatedValueId) || publishedValueId === calculatedValueId) {
      return NextResponse.json({ error: 'Valores de conciliación inválidos' }, { status: 400 })
    }

    const valuesResult = await supabase
      .from('management_metric_values')
      .select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,source_cutoff_at,quality_status,evaluation_status,formula_version,evidence')
      .in('id', [publishedValueId, calculatedValueId])
    if (valuesResult.error) {
      console.error('[management-reconciliations] value lookup failed', { message: valuesResult.error.message })
      return NextResponse.json({ error: 'No fue posible validar los valores' }, { status: 500 })
    }

    const rows = (valuesResult.data ?? []) as MetricValueRow[]
    const published = rows.find((row) => row.id === publishedValueId)
    const calculated = rows.find((row) => row.id === calculatedValueId)
    if (!published || !calculated) {
      return NextResponse.json({ error: 'Uno de los valores no existe o queda fuera de su alcance' }, { status: 404 })
    }

    const sameIdentity = published.entity_id === calculated.entity_id
      && published.metric_code === calculated.metric_code
      && published.period_start === calculated.period_start
      && published.period_end === calculated.period_end
      && published.formula_version === calculated.formula_version
    if (!sameIdentity) {
      return NextResponse.json({ error: 'Los valores deben corresponder a la misma entidad, métrica, período y versión de fórmula' }, { status: 400 })
    }
    if (published.source_name === CALCULATED_SOURCE) {
      return NextResponse.json({ error: 'El valor publicado debe provenir de una fuente independiente' }, { status: 400 })
    }
    if (
      calculated.source_name !== CALCULATED_SOURCE
      || calculated.quality_status !== 'verified'
      || calculated.evaluation_status !== 'evaluable'
      || calculated.value === null
    ) {
      return NextResponse.json({ error: 'El valor calculado no cumple el contrato canónico de calidad' }, { status: 400 })
    }
    if (published.evaluation_status !== 'evaluable' || published.value === null) {
      return NextResponse.json({ error: 'El valor publicado no es evaluable' }, { status: 400 })
    }

    const result = calculateManagementMetricReconciliation({
      publishedValue: published.value,
      calculatedValue: calculated.value,
      tolerance: body.tolerance,
    })

    const existingResult = await supabase
      .from('management_metric_reconciliations')
      .select('*')
      .eq('entity_id', published.entity_id)
      .eq('metric_code', published.metric_code)
      .eq('period_start', published.period_start)
      .eq('period_end', published.period_end)
      .eq('formula_version', published.formula_version)
      .maybeSingle()
    if (existingResult.error) {
      return NextResponse.json({ error: 'No fue posible consultar la conciliación existente' }, { status: 500 })
    }
    if (existingResult.data?.publication_status === 'approved' && role !== 'ceo') {
      return NextResponse.json({ error: 'Sólo el CEO puede reemplazar una conciliación aprobada' }, { status: 403 })
    }

    const reconciledAt = new Date().toISOString()
    const record = {
      entity_id: published.entity_id,
      metric_code: published.metric_code,
      period_start: published.period_start,
      period_end: published.period_end,
      published_value_id: published.id,
      calculated_value_id: calculated.id,
      published_value: result.publishedValue,
      calculated_value: result.calculatedValue,
      absolute_delta: result.absoluteDelta,
      relative_delta: result.relativeDelta,
      tolerance: result.tolerance,
      reconciliation_status: result.reconciliationStatus,
      publication_status: result.publicationStatus,
      formula_version: published.formula_version,
      approved_by: null,
      approved_at: null,
      notes: note(body.notes),
      evidence: {
        toleranceBasis: 'relative_to_published_value',
        reconciledAt,
        reconciledBy: user.id,
        published: {
          id: published.id,
          sourceName: published.source_name,
          sourceReference: published.source_reference,
          sourceCutoffAt: published.source_cutoff_at,
          qualityStatus: published.quality_status,
          evidence: published.evidence ?? {},
        },
        calculated: {
          id: calculated.id,
          sourceName: calculated.source_name,
          sourceReference: calculated.source_reference,
          sourceCutoffAt: calculated.source_cutoff_at,
          qualityStatus: calculated.quality_status,
          evidence: calculated.evidence ?? {},
        },
      },
      updated_at: reconciledAt,
    }

    const { data, error } = await supabase
      .from('management_metric_reconciliations')
      .upsert(record, {
        onConflict: 'entity_id,metric_code,period_start,period_end,formula_version',
      })
      .select()
      .single()
    if (error) {
      console.error('[management-reconciliations] upsert failed', { message: error.message })
      return NextResponse.json({ error: 'No fue posible registrar la conciliación' }, { status: 400 })
    }

    await writeChangeLog(supabase, {
      id: data.id,
      action: existingResult.data ? 'reconcile_update' : 'reconcile_create',
      userId: user.id,
      before: existingResult.data,
      after: data,
    })
    return NextResponse.json(data, { status: existingResult.data ? 200 : 201 })
  } catch (cause) {
    console.error('[management-reconciliations] POST failed', {
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'No fue posible procesar la conciliación' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, user, role } = ctx

  try {
    const body = await request.json() as Record<string, unknown>
    const id = String(body.id ?? '').trim()
    const action = String(body.action ?? '').trim().toLowerCase()
    if (!validUuid(id) || !['approve', 'reject', 'reopen'].includes(action)) {
      return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 })
    }

    const beforeResult = await supabase
      .from('management_metric_reconciliations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (beforeResult.error) {
      return NextResponse.json({ error: 'No fue posible consultar la conciliación' }, { status: 500 })
    }
    const before = beforeResult.data as Record<string, unknown> | null
    if (!before) return NextResponse.json({ error: 'Conciliación no encontrada' }, { status: 404 })

    const currentStatus = String(before.publication_status ?? '')
    if (currentStatus === 'approved' && role !== 'ceo') {
      return NextResponse.json({ error: 'Sólo el CEO puede modificar una publicación aprobada' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const decisionNote = note(body.notes)
    let update: Record<string, unknown>

    if (action === 'approve') {
      if (!canApproveManagementMetricReconciliation({
        role,
        reconciliationStatus: String(before.reconciliation_status ?? ''),
        calculatedValueId: String(before.calculated_value_id ?? ''),
        evidence: before.evidence as Record<string, unknown> | null,
      })) {
        return NextResponse.json({ error: 'La conciliación no cumple los requisitos de aprobación CEO' }, { status: 403 })
      }
      update = {
        publication_status: 'approved',
        approved_by: user.id,
        approved_at: now,
        notes: decisionNote ?? before.notes ?? null,
        updated_at: now,
      }
    } else if (action === 'reject') {
      update = {
        publication_status: 'rejected',
        approved_by: null,
        approved_at: null,
        notes: decisionNote ?? before.notes ?? null,
        updated_at: now,
      }
    } else {
      const reconciled = ['exact', 'within_tolerance'].includes(String(before.reconciliation_status ?? ''))
      update = {
        publication_status: reconciled ? 'provisional' : 'blocked',
        approved_by: null,
        approved_at: null,
        notes: decisionNote ?? before.notes ?? null,
        updated_at: now,
      }
    }

    const { data, error } = await supabase
      .from('management_metric_reconciliations')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('[management-reconciliations] decision failed', { action, message: error.message })
      return NextResponse.json({ error: 'No fue posible registrar la decisión' }, { status: 400 })
    }

    await writeChangeLog(supabase, {
      id,
      action: `reconciliation_${action}`,
      userId: user.id,
      before,
      after: data,
    })
    return NextResponse.json(data)
  } catch (cause) {
    console.error('[management-reconciliations] PATCH failed', {
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'No fue posible actualizar la conciliación' }, { status: 500 })
  }
}
