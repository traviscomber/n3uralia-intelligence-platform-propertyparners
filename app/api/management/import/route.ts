import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { managementReportEntityScopes, metricsForManagementReportScope } from '@/lib/management-report-scope'

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

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError) {
    console.error('[management-import] profile lookup failed', { code: profileError.code })
    return NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 })
  }
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
    supabase.from('management_entities').select('id,name,entity_type').in('id', entityIds),
    supabase.from('management_metric_definitions').select('code,active,formula_version').in('code', metricCodes),
  ])

  if (entityError || definitionError) {
    console.error('[management-import] reference lookup failed', {
      entityCode: entityError?.code ?? null,
      definitionCode: definitionError?.code ?? null,
    })
    return NextResponse.json({ error: 'No fue posible validar las referencias de la carga.' }, { status: 500 })
  }

  const knownEntities = new Set((entities ?? []).map((entity) => entity.id))
  const entityById = new Map((entities ?? []).map((entity) => [entity.id, entity]))
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
  if (runError) {
    console.error('[management-import] run creation failed', { code: runError.code })
    return NextResponse.json({ error: 'No fue posible iniciar la ejecución de importación.' }, { status: 500 })
  }

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
  }).select('id,entity_id,metric_code,period_start,period_end,value,source_name,source_reference,quality_status,evaluation_status,formula_version,source_cutoff_at')

  if (importError) {
    console.error('[management-import] metric upsert failed', { code: importError.code, runId: run.id })
    await supabase.from('management_import_runs').update({
      status: 'failed',
      rows_rejected: rows.length,
      errors: [{ code: 'IMPORT_WRITE_FAILED' }],
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    return NextResponse.json({ error: 'No fue posible completar la importación.', runId: run.id }, { status: 500 })
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

  if (alertError) {
    console.error('[management-import] alert evaluation failed', { code: alertError.code, runId: run.id })
  }

  let reportGenerationFailed = false
  const importedMetrics = imported ?? []
  const reportEntityIds = managementReportEntityScopes(role, entityIds)

  const { data: existingReports, error: existingReportError } = await supabase
    .from('management_report_runs')
    .select('id,entity_id')
    .eq('report_type', 'executive')
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .contains('snapshot', { sourceImportRunId: run.id })

  const reportRunIds: string[] = []

  if (existingReportError) {
    reportGenerationFailed = true
    console.error('[management-import] weekly report dedupe lookup failed', { code: existingReportError.code, runId: run.id })
  } else {
    const existingByEntity = new Map((existingReports ?? []).map((report) => [report.entity_id ?? '__global__', report.id]))
    const missingReports = reportEntityIds
      .filter((entityId) => !existingByEntity.has(entityId ?? '__global__'))
      .map((entityId) => {
        const metrics = metricsForManagementReportScope(importedMetrics, entityId)
        return {
          report_type: 'executive',
          entity_id: entityId,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'generated',
          generated_by: user.id,
          snapshot: {
            trigger: 'weekly_source_upload',
            sourceImportRunId: run.id,
            sourceName,
            sourceReference: body?.sourceReference ?? null,
            generatedAt: new Date().toISOString(),
            scope: entityId === null
              ? { type: 'global', id: null, name: 'Property Partners Vitacura' }
              : {
                  type: entityById.get(entityId)?.entity_type ?? 'entity',
                  id: entityId,
                  name: entityById.get(entityId)?.name ?? entityId,
                },
            rowsReceived: rows.filter((row) => entityId === null || row.entityId === entityId).length,
            rowsImported: metrics.length,
            warnings: warnings.filter((warning) => entityId === null || rows[warning.index]?.entityId === entityId),
            alertEvaluation: alerts?.[0] ?? null,
            metrics,
          },
        }
      })

    for (const report of existingReports ?? []) reportRunIds.push(report.id)

    if (missingReports.length) {
      const { data: createdReports, error: reportError } = await supabase
        .from('management_report_runs')
        .insert(missingReports)
        .select('id')

      if (reportError) {
        reportGenerationFailed = true
        console.error('[management-import] weekly report generation failed', { code: reportError.code, runId: run.id })
      } else {
        reportRunIds.push(...(createdReports ?? []).map((report) => report.id))
      }
    }
  }

  return NextResponse.json({
    runId: run.id,
    status,
    imported: imported?.length ?? rows.length,
    warnings,
    alerts: alerts?.[0] ?? null,
    alertEvaluationFailed: Boolean(alertError),
    reportRunId: reportRunIds[0] ?? null,
    reportRunIds,
    reportGenerationFailed,
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

  if (error) {
    console.error('[management-import] history lookup failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible cargar el historial de importaciones.' }, { status: 500 })
  }
  return NextResponse.json({ runs: data ?? [] })
}
