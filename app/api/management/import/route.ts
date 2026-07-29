import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ImportRow = {
  entityId: string
  metricCode: string
  value: number
  periodStart: string
  periodEnd: string
  sourceName: string
  sourceReference?: string
  qualityStatus?: 'verified' | 'provisional' | 'missing' | 'rejected'
  evidence?: Record<string, unknown>
}

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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
    if (!row.entityId) errors.push('entityId')
    if (!row.metricCode) errors.push('metricCode')
    if (!Number.isFinite(Number(row.value))) errors.push('value')
    if (!validDate(row.periodStart)) errors.push('periodStart')
    if (!validDate(row.periodEnd)) errors.push('periodEnd')
    if (!row.sourceName) errors.push('sourceName')
    return errors.length ? [{ index, errors }] : []
  })
  if (invalid.length) return NextResponse.json({ error: 'Filas inválidas', invalid }, { status: 400 })

  const periodStart = rows[0].periodStart
  const periodEnd = rows[0].periodEnd
  if (rows.some((row) => row.periodStart !== periodStart || row.periodEnd !== periodEnd)) {
    return NextResponse.json({ error: 'Una ejecución solo puede contener un período común' }, { status: 400 })
  }

  const sourceName = String(body?.sourceName || rows[0].sourceName)
  const { data: run, error: runError } = await supabase.from('management_import_runs').insert({
    source_name: sourceName,
    source_reference: body?.sourceReference ?? null,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'processing',
    rows_received: rows.length,
    requested_by: user.id,
    started_at: new Date().toISOString(),
  }).select('id').single()
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  const payload = rows.map((row) => ({
    entity_id: row.entityId,
    metric_code: row.metricCode,
    period_start: row.periodStart,
    period_end: row.periodEnd,
    value: Number(row.value),
    source_name: row.sourceName,
    source_reference: row.sourceReference ?? body?.sourceReference ?? null,
    source_cutoff_at: body?.sourceCutoffAt ?? new Date().toISOString(),
    quality_status: row.qualityStatus ?? 'verified',
    evidence: { ...(row.evidence ?? {}), importRunId: run.id },
    updated_at: new Date().toISOString(),
  }))

  const { data: imported, error: importError } = await supabase.from('management_metric_values').upsert(payload, {
    onConflict: 'entity_id,metric_code,period_start,period_end,source_name',
  }).select('id')

  if (importError) {
    await supabase.from('management_import_runs').update({ status: 'failed', rows_rejected: rows.length, errors: [{ message: importError.message }], completed_at: new Date().toISOString() }).eq('id', run.id)
    return NextResponse.json({ error: importError.message, runId: run.id }, { status: 500 })
  }

  await supabase.from('management_import_runs').update({ status: 'completed', rows_inserted: imported?.length ?? rows.length, completed_at: new Date().toISOString() }).eq('id', run.id)
  await supabase.from('management_change_log').insert({ entity_name: 'management_metric_values', entity_id: run.id, action: 'import', after_data: { sourceName, periodStart, periodEnd, rows: rows.length }, changed_by: user.id })

  const { data: alerts } = await supabase.rpc('evaluate_management_alerts', { p_period_start: periodStart, p_period_end: periodEnd })
  return NextResponse.json({ runId: run.id, imported: imported?.length ?? rows.length, alerts: alerts?.[0] ?? null })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data, error } = await supabase.from('management_import_runs').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}
