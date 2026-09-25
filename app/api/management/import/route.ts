import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { managementReportEntityScopes, managementReportTypeForEntity, metricsForManagementReportScope } from '@/lib/management-report-scope'

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

type PersistedMetric = {
  entity_id: string
  metric_code: string
  value: number | null
  source_name: string
  source_reference: string | null
  quality_status: string
  evaluation_status: string
  formula_version: number
  source_cutoff_at: string | null
}

function valueOf(metrics: PersistedMetric[], code: string) {
  const row = metrics.find((item) => item.metric_code === code && item.evaluation_status === 'evaluable')
  return row?.value == null ? null : Number(row.value)
}

function reportCompany(metrics: PersistedMetric[]) {
  const scheduled = valueOf(metrics, 'scheduled_visits')
  const realized = valueOf(metrics, 'realized_visits')
  return {
    cartera: valueOf(metrics, 'stock'),
    captaciones: valueOf(metrics, 'listings'),
    leadsNuevos: valueOf(metrics, 'leads'),
    requerimientos: valueOf(metrics, 'requirements'),
    visitasAgendadas: scheduled,
    visitasRealizadas: realized,
    cumplimientoVisitas: scheduled && realized != null ? (realized / scheduled) * 100 : null,
    cierresAcreditados: valueOf(metrics, 'management_credited_sales') ?? valueOf(metrics, 'sales'),
    cierresOperacionales: valueOf(metrics, 'sales_operations_in_scope') ?? valueOf(metrics, 'sales'),
    volumenUfAcreditado: valueOf(metrics, 'management_credited_sales_uf') ?? valueOf(metrics, 'sales_uf'),
    volumenUfBruto: valueOf(metrics, 'management_credited_sales_uf') ?? valueOf(metrics, 'sales_uf'),
    suspendidas: valueOf(metrics, 'suspended_listings'),
    productividad: valueOf(metrics, 'productivity'),
    scoreGestion: valueOf(metrics, 'canonical_management_score'),
    scoreCartera: valueOf(metrics, 'canonical_portfolio_score'),
    scoreSeguimiento: valueOf(metrics, 'canonical_follow_up_score'),
    scoreConversion: valueOf(metrics, 'canonical_conversion_score'),
  }
}

function reportCompleteness(metrics: PersistedMetric[]) {
  const required = ['stock','listings','leads','requirements','scheduled_visits','realized_visits','suspended_listings']
  const operationalReportReady = required.every((code) => valueOf(metrics, code) != null)
    && (valueOf(metrics, 'management_credited_sales') != null || valueOf(metrics, 'sales') != null)
  const fullManagementScoreReady = valueOf(metrics, 'canonical_management_score') != null
  const blocked: Array<{ code: string; reason: string }> = []
  if (!operationalReportReady) blocked.push({ code: 'operational_report', reason: 'Faltan una o más métricas canónicas del período; el snapshot conserva únicamente lo disponible.' })
  if (!fullManagementScoreReady) blocked.push({ code: 'canonical_management_score', reason: 'El score integral aún no está persistido como métrica evaluable para este alcance y período.' })
  return { operationalReportReady, fullManagementScoreReady, blocked }
}

function uploadSnapshot(args: {
  metrics: PersistedMetric[]
  sourceImportRunId: string
  sourceName: string
  sourceReference: string | null
  generatedAt: string
  periodStart: string
  periodEnd: string
  scope: { type: string; id: string | null; name: string }
  alerts: unknown
  warnings: unknown[]
  offices?: Array<{ id: string; name: string; metrics: PersistedMetric[] }>
}) {
  const sourceFiles = [...new Set(args.metrics.map((item) => item.source_name).filter(Boolean))]
  return {
    schemaVersion: 'management-upload-report-v2',
    trigger: 'canonical_source_upload',
    sourceImportRunId: args.sourceImportRunId,
    sourceName: args.sourceName,
    sourceReference: args.sourceReference,
    generatedAt: args.generatedAt,
    period: { start: args.periodStart, end: args.periodEnd, label: args.periodStart.slice(0, 7) },
    scope: args.scope,
    company: reportCompany(args.metrics),
    offices: (args.offices ?? []).map((office) => ({ id: office.id, name: office.name, ...reportCompany(office.metrics) })),
    completeness: reportCompleteness(args.metrics),
    provenance: { sourceFiles },
    qualityNotes: [
      'Snapshot regenerado automáticamente después de una carga canónica.',
      'El reporte agrega el estado canónico completo disponible del período; no sólo las filas de la última carga.',
    ],
    warnings: args.warnings,
    alertEvaluation: args.alerts,
    metrics: args.metrics,
  }
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
  const reportRunIds: string[] = []

  const [{ data: activeEntities, error: activeEntitiesError }, { data: periodMetrics, error: periodMetricsError }] = await Promise.all([
    supabase.from('management_entities').select('id,name,entity_type').eq('active', true).order('name'),
    supabase.from('management_metric_values')
      .select('entity_id,metric_code,value,source_name,source_reference,quality_status,evaluation_status,formula_version,source_cutoff_at')
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd),
  ])

  if (activeEntitiesError || periodMetricsError) {
    reportGenerationFailed = true
    console.error('[management-import] report snapshot lookup failed', {
      entityCode: activeEntitiesError?.code ?? null,
      metricCode: periodMetricsError?.code ?? null,
      runId: run.id,
    })
  } else {
    const allEntities = activeEntities ?? []
    const allMetrics = (periodMetrics ?? []) as PersistedMetric[]
    const companyEntity = allEntities.find((entity) => entity.entity_type === 'company')
    const officeEntities = allEntities.filter((entity) => entity.entity_type === 'office')
    const partnerEntities = allEntities.filter((entity) => entity.entity_type === 'partner')
    const reportEntityIds = managementReportEntityScopes(role, entityIds)
    const scopes = reportEntityIds.map((entityId) => {
      if (entityId === null) {
        const companyMetrics = companyEntity ? metricsForManagementReportScope(allMetrics, companyEntity.id) : []
        return {
          reportType: managementReportTypeForEntity(null, true),
          entityId: null,
          scope: { type: 'global', id: null, name: 'Property Partners Vitacura' },
          metrics: companyMetrics,
          offices: officeEntities.map((office) => ({
            id: office.id,
            name: office.name,
            metrics: metricsForManagementReportScope(allMetrics, office.id),
          })),
        }
      }
      const entity = allEntities.find((item) => item.id === entityId)
      return {
        reportType: managementReportTypeForEntity(entity?.entity_type),
        entityId,
        scope: { type: entity?.entity_type ?? 'entity', id: entityId, name: entity?.name ?? entityId },
        metrics: metricsForManagementReportScope(allMetrics, entityId),
        offices: [] as Array<{ id: string; name: string; metrics: PersistedMetric[] }>,
      }
    })

    for (const scope of scopes) {
      const { data: existing, error: existingError } = await supabase
        .from('management_report_runs')
        .select('id')
        .eq('report_type', scope.reportType)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .contains('snapshot', { sourceImportRunId: run.id })
        .limit(1)

      if (existingError) {
        reportGenerationFailed = true
        console.error('[management-import] report dedupe lookup failed', { code: existingError.code, runId: run.id, reportType: scope.reportType })
        continue
      }
      if (existing?.[0]?.id) {
        reportRunIds.push(existing[0].id)
        continue
      }

      const snapshot = uploadSnapshot({
        metrics: scope.metrics,
        sourceImportRunId: run.id,
        sourceName,
        sourceReference: body?.sourceReference ?? null,
        generatedAt: now,
        periodStart,
        periodEnd,
        scope: scope.scope,
        alerts: alerts?.[0] ?? null,
        warnings,
        offices: scope.offices,
      })

      const { data: created, error: reportError } = await supabase
        .from('management_report_runs')
        .insert({
          report_type: scope.reportType,
          entity_id: scope.entityId,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'generated',
          generated_by: user.id,
          snapshot,
        })
        .select('id')
        .single()

      if (reportError) {
        reportGenerationFailed = true
        console.error('[management-import] automatic report generation failed', { code: reportError.code, runId: run.id, reportType: scope.reportType })
      } else {
        reportRunIds.push(created.id)
      }
    }

    // Partner reports are generated automatically when partner-scoped metrics are present
    // in the uploaded canonical period. No synthetic attribution is created here.
    if (role === 'admin' || role === 'ceo') {
      for (const partner of partnerEntities.filter((entity) => allMetrics.some((metric) => metric.entity_id === entity.id))) {
        const metrics = metricsForManagementReportScope(allMetrics, partner.id)
        const { data: existing } = await supabase
          .from('management_report_runs')
          .select('id')
          .eq('report_type', 'partner')
          .eq('entity_id', partner.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .contains('snapshot', { sourceImportRunId: run.id })
          .limit(1)
        if (existing?.[0]?.id) {
          reportRunIds.push(existing[0].id)
          continue
        }
        const { data: created, error: reportError } = await supabase
          .from('management_report_runs')
          .insert({
            report_type: 'partner',
            entity_id: partner.id,
            period_start: periodStart,
            period_end: periodEnd,
            status: 'generated',
            generated_by: user.id,
            snapshot: uploadSnapshot({
              metrics,
              sourceImportRunId: run.id,
              sourceName,
              sourceReference: body?.sourceReference ?? null,
              generatedAt: now,
              periodStart,
              periodEnd,
              scope: { type: 'partner', id: partner.id, name: partner.name },
              alerts: alerts?.[0] ?? null,
              warnings,
            }),
          })
          .select('id')
          .single()
        if (reportError) reportGenerationFailed = true
        else reportRunIds.push(created.id)
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
