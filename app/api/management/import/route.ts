import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type QualityStatus = 'verified' | 'provisional' | 'missing' | 'rejected' | 'not_applicable' | 'not_evaluable'
type EvaluationStatus = 'evaluable' | 'missing_source' | 'not_applicable' | 'not_evaluable' | 'rejected'

type ImportRow = {
  entityId: string
  metricCode: string
  value?: number | null
  periodStart: string
  periodEnd: string
  sourceName: string
  sourceReference?: string
  qualityStatus?: QualityStatus
  evaluationStatus?: EvaluationStatus
  formulaVersion?: number
  evidence?: Record<string, unknown>
}

const qualityStatuses = new Set<QualityStatus>([
  'verified',
  'provisional',
  'missing',
  'rejected',
  'not_applicable',
  'not_evaluable',
])

const evaluationStatuses = new Set<EvaluationStatus>([
  'evaluable',
  'missing_source',
  'not_applicable',
  'not_evaluable',
  'rejected',
])

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeEvaluation(row: ImportRow) {
  const qualityStatus = row.qualityStatus ?? (row.value == null ? 'missing' : 'verified')
  const evaluationStatus = row.evaluationStatus ?? (
    qualityStatus === 'missing'
      ? 'missing_source'
      : qualityStatus === 'not_applicable'
        ? 'not_applicable'
        : qualityStatus === 'not_evaluable'
          ? 'not_evaluable'
          : qualityStatus === 'rejected'
            ? 'rejected'
            : 'evaluable'
  )

  const value = row.value == null ? null : Number(row.value)
  return { qualityStatus, evaluationStatus, value }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos para importar métricas' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const rows = Array.isArray(body?.rows) ? body.rows as ImportRow[] : []
  if (!rows.length || rows.length > 5000) {
    return NextResponse.json({ error: 'La carga debe contener entre 1 y 5000 filas' }, { status: 400 })
  }

  const invalid = rows.flatMap((row, index) => {
    const errors: string[] = []
    const normalized = normalizeEvaluation(row)

    if (!row.entityId) errors.push('entityId')
    if (!row.metricCode) errors.push('metricCode')
    if (!validDate(row.periodStart)) errors.push('periodStart')
    if (!validDate(row.periodEnd)) errors.push('periodEnd')
    if (!row.sourceName) errors.push('sourceName')
    if (!qualityStatuses.has(normalized.qualityStatus)) errors.push('qualityStatus')
    if (!evaluationStatuses.has(normalized.evaluationStatus)) errors.push('evaluationStatus')
    if (normalized.evaluationStatus === 'evaluable' && !Number.isFinite(normalized.value)) errors.push('value')
    if (normalized.evaluationStatus !== 'evaluable' && normalized.value !== null) errors.push('valueMustBeNull')
    if (row.formulaVersion != null && (!Number.isInteger(row.formulaVersion) || row.formulaVersion < 1)) errors.push('formulaVersion')

    return errors.length ? [{ index, errors }] : []
  })
  if (invalid.length) return NextResponse.json({ error: 'Filas inválidas', invalid }, { status: 400 })

  const periodStart = rows[0].periodStart
  const periodEnd = rows[0].periodEnd
  if (rows.some((row) => row.periodStart !== periodStart || row.periodEnd !== periodEnd)) {
    return NextResponse.json({ error: 'Una ejecución sólo puede contener un período común' }, { status: 400 })
  }

  const entityIds = [...new Set(rows.map((row) => row.entityId))]
  const metricCodes = [...new Set(rows.map((row) => row.metricCode))]

  const [{ data: entities, error: entityError }, { data: definitions, error: definitionError }] = await Promise.all([
    supabase.from('management_entities').select('id').in('id', entityIds),
    supabase.from('management_metric_definitions').select('code,active,formula_version').in('code', metricCodes),
  ])

  if (entityError) return NextResponse.json({ error: entityError.message }, { status: 500 })
  if (definitionError) return NextResponse.json({ error: definitionError.message }, { status: 500 })

  const knownEntities = new Set((entities ?? []).map((entity) => entity.id))
  const definitionMap = new Map((definitions ?? []).map((definition) => [definition.code, definition]))
  const warnings: Array<{ index: number; code: string; detail: string }> = []

  rows.forEach((row, index) => {
    if (!knownEntities.has(row.entityId)) {
      warnings.push({ index, code: 'unknown_entity', detail: `Entidad ${row.entityId} no disponible para el usuario o inexistente.` })
    }
    const definition = definitionMap.get(row.metricCode)
    if (!definition) {
      warnings.push({ index, code: 'unknown_metric', detail: `Métrica ${row.metricCode} inexistente.` })
    } else if (!definition.active) {
      warnings.push({ index, code: 'inactive_metric', detail: `Métrica ${row.metricCode} inactiva.` })
    }
  })

  const blockingWarnings = warnings.filter((warning) => warning.code === 'unknown_entity' || warning.code === 'unknown_metric')
  if (blockingWarnings.length) {
    return NextResponse.json({ error: 'La carga contiene referencias inválidas', warnings }, { status: 400 })
  }

  const sourceName = String(body?.sourceName || rows[0].sourceName)
  const { data: run, error: runError } = await supabase.from('management_import_runs').insert({
    source_name: sourceName,
    source_reference: body?.sourceReference ?? null,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'processing',
    rows_received: rows.length,
    warnings,
    requested_by: user.id,
    started_at: new Date().toISOString(),
  }).select('id').single()
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  const now = new Date().toISOString()
  const payload = rows.map((row) => {
    const normalized = normalizeEvaluation(row)
    const definition = definitionMap.get(row.metricCode)

    return {
      entity_id: row.entityId,
      metric_code: row.metricCode,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      value: normalized.value,
      source_name: row.sourceName,
      source_reference: row.sourceReference ?? body?.sourceReference ?? null,
      source_cutoff_at: body?.sourceCutoffAt ?? now,
      quality_status: normalized.qualityStatus,
      evaluation_status: normalized.evaluationStatus,
      formula_version: row.formulaVersion ?? definition?.formula_version ?? 1,
      evaluated_at: normalized.evaluationStatus === 'evaluable' ? now : null,
      evidence: { ...(row.evidence ?? {}), importRunId: run.id },
      updated_at: now,
    }
  })

  const { data: imported, error: importError } = await supabase.from('management_metric_values').upsert(payload, {
    onConflict: 'entity_id,metric_code,period_start,period_end,source_name',
  }).select('id')

  if (importError) {
    await supabase.from('management_import_runs').update({
      status: 'failed',
      rows_rejected: rows.length,
      errors: [{ message: importError.message }],
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    return NextResponse.json({ error: importError.message, runId: run.id }, { status: 500 })
  }

  const status = warnings.length ? 'completed_with_warnings' : 'completed'
  await supabase.from('management_import_runs').update({
    status,
    rows_inserted: imported?.length ?? rows.length,
    warnings,
    completed_at: new Date().toISOString(),
  }).eq('id', run.id)

  await supabase.from('management_change_log').insert({
    entity_name: 'management_metric_values',
    entity_id: run.id,
    action: 'import',
    after_data: { sourceName, periodStart, periodEnd, rows: rows.length, status, warnings },
    changed_by: user.id,
  })

  const { data: alerts, error: alertError } = await supabase.rpc('evaluate_management_alerts', {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  })

  return NextResponse.json({
    runId: run.id,
    status,
    imported: imported?.length ?? rows.length,
    warnings,
    alerts: alerts?.[0] ?? null,
    alertEvaluationError: alertError?.message ?? null,
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('management_import_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}
