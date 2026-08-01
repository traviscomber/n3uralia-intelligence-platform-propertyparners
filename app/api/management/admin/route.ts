import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LEADER_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const EXECUTIVE_ROLES = new Set(['admin', 'ceo'])
const CALCULATED_SOURCE = 'canonical_calculated_v1'
const MANUAL_QUALITY = new Set(['provisional', 'verified'])

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile, error } = await supabase.from('profiles').select('id,role').eq('id', user.id).maybeSingle()
  if (error) {
    console.error('[management-admin] profile lookup failed', { message: error.message })
    return { error: NextResponse.json({ error: 'No fue posible validar el perfil' }, { status: 500 }) }
  }
  const role = String(profile?.role ?? '').toLowerCase()
  if (!LEADER_ROLES.has(role)) return { error: NextResponse.json({ error: 'Sin permisos de administración' }, { status: 403 }) }
  return { supabase, user, role }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx
  const [entities, definitions, goals, rules, alerts, imports] = await Promise.all([
    supabase.from('management_entities').select('id,name,entity_type,parent_id,active').eq('active', true).order('name'),
    supabase.from('management_metric_definitions').select('code,label,unit,methodology,formula_version').eq('active', true).order('sort_order'),
    supabase.from('management_goals').select('*,management_entities(name),management_metric_definitions(label,unit)').order('period_start', { ascending: false }).limit(500),
    supabase.from('management_alert_rules').select('*,management_metric_definitions(label,unit)').order('created_at', { ascending: false }),
    supabase.from('management_alerts').select('*,management_entities(name)').order('created_at', { ascending: false }).limit(300),
    supabase.from('management_import_runs').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  const failure = [entities, definitions, goals, rules, alerts, imports].find((result) => result.error)
  if (failure?.error) return NextResponse.json({ error: failure.error.message }, { status: 500 })
  return NextResponse.json({ entities: entities.data, definitions: definitions.data, goals: goals.data, rules: rules.data, alerts: alerts.data, imports: imports.data })
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, user, role } = ctx
  const body = await request.json() as Record<string, unknown>
  const type = String(body.type ?? '')

  if (type === 'goal') {
    const record = {
      entity_id: body.entityId,
      metric_code: body.metricCode,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      target_value: Number(body.targetValue),
      source_name: String(body.sourceName || 'Configuración de gestión'),
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }
    if (!record.entity_id || !record.metric_code || !record.period_start || !record.period_end || !Number.isFinite(record.target_value)) return NextResponse.json({ error: 'Meta incompleta' }, { status: 400 })
    const { data, error } = await supabase.from('management_goals').upsert(record, { onConflict: 'entity_id,metric_code,period_start,period_end' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await supabase.from('management_change_log').insert({ entity_name: 'management_goals', entity_id: data.id, action: 'update', after_data: data, changed_by: user.id })
    return NextResponse.json(data, { status: 201 })
  }

  if (type === 'rule') {
    if (!EXECUTIVE_ROLES.has(role)) return NextResponse.json({ error: 'Solo CEO o administración puede configurar reglas' }, { status: 403 })
    const record = {
      code: String(body.code ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      label: String(body.label ?? '').trim(),
      metric_code: body.metricCode,
      comparison: body.comparison,
      threshold: Number(body.threshold),
      severity: body.severity,
      scope_type: body.scopeType,
      responsible_role: String(body.responsibleRole || 'director'),
      active: body.active !== false,
    }
    if (!record.code || !record.label || !record.metric_code || !Number.isFinite(record.threshold)) return NextResponse.json({ error: 'Regla incompleta' }, { status: 400 })
    const { data, error } = await supabase.from('management_alert_rules').upsert(record, { onConflict: 'code' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await supabase.from('management_change_log').insert({ entity_name: 'management_alert_rules', entity_id: data.id, action: 'update', after_data: data, changed_by: user.id })
    return NextResponse.json(data, { status: 201 })
  }

  if (type === 'metric') {
    const value = Number(body.value)
    const sourceName = String(body.sourceName || 'Carga administrativa').trim().slice(0, 160)
    const qualityStatus = String(body.qualityStatus || 'provisional').trim().toLowerCase()
    if (sourceName === CALCULATED_SOURCE) {
      return NextResponse.json({ error: 'La carga manual no puede utilizar la identidad del cálculo canónico' }, { status: 400 })
    }
    if (!MANUAL_QUALITY.has(qualityStatus)) {
      return NextResponse.json({ error: 'La carga manual sólo admite calidad provisional o verificada' }, { status: 400 })
    }

    const definitionResult = await supabase
      .from('management_metric_definitions')
      .select('formula_version')
      .eq('code', String(body.metricCode ?? ''))
      .eq('active', true)
      .maybeSingle()
    if (definitionResult.error || !definitionResult.data) {
      return NextResponse.json({ error: 'Definición de métrica inválida' }, { status: 400 })
    }

    const submittedAt = new Date().toISOString()
    const record = {
      entity_id: body.entityId,
      metric_code: body.metricCode,
      period_start: body.periodStart,
      period_end: body.periodEnd,
      value,
      source_name: sourceName,
      source_reference: String(body.sourceReference ?? '').trim().slice(0, 500) || null,
      source_cutoff_at: body.sourceCutoffAt || submittedAt,
      quality_status: qualityStatus,
      evaluation_status: 'evaluable',
      formula_version: definitionResult.data.formula_version,
      evaluated_at: submittedAt,
      evidence: {
        ...(body.evidence && typeof body.evidence === 'object' ? body.evidence : {}),
        submissionMethod: 'management_admin_manual',
        submittedBy: user.id,
        submittedAt,
        publicationStatus: 'not_published',
      },
    }
    if (!record.entity_id || !record.metric_code || !record.period_start || !record.period_end || !Number.isFinite(value) || !sourceName) return NextResponse.json({ error: 'Métrica incompleta' }, { status: 400 })
    const { data, error } = await supabase.from('management_metric_values').upsert(record, { onConflict: 'entity_id,metric_code,period_start,period_end,source_name' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await supabase.from('management_change_log').insert({ entity_name: 'management_metric_values', entity_id: data.id, action: 'import', after_data: data, changed_by: user.id })
    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json({ error: 'Tipo de operación no soportado' }, { status: 400 })
}

export async function PATCH(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { supabase, user } = ctx
  const body = await request.json() as Record<string, unknown>
  const id = String(body.id ?? '')
  const action = String(body.action ?? '')
  if (!id || !['acknowledge', 'resolve', 'dismiss'].includes(action)) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })

  const { data: before } = await supabase.from('management_alerts').select('*').eq('id', id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })
  const now = new Date().toISOString()
  const update = action === 'acknowledge'
    ? { status: 'acknowledged', acknowledged_by: user.id, acknowledged_at: now }
    : action === 'resolve'
      ? { status: 'resolved', resolved_by: user.id, resolved_at: now, resolution_notes: String(body.notes ?? '') }
      : { status: 'dismissed', resolved_by: user.id, resolved_at: now, resolution_notes: String(body.notes ?? '') }
  const { data, error } = await supabase.from('management_alerts').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await supabase.from('management_change_log').insert({ entity_name: 'management_alerts', entity_id: id, action, before_data: before, after_data: data, changed_by: user.id })
  return NextResponse.json(data)
}
