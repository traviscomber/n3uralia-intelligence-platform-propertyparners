import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Schedule = {
  id: string
  agent_key: 'market_intelligence' | 'executive_reports' | 'valuation'
  name: string
  input: Record<string, unknown> | null
  created_by: string
  last_run_at: string | null
  next_run_at: string | null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service credentials')
  return createSupabaseClient(url, key)
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function nextWeeklyRun(current: Date) {
  return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
}

async function createRun(
  supabase: ReturnType<typeof getServiceClient>,
  schedule: Schedule,
  title: string,
  output: Record<string, unknown>,
  confidence: number,
  findings: Array<{ finding_type: string; title: string; summary: string; severity: string }>,
  sources: Array<{ source_type: string; source_name: string; source_table?: string; source_record_id?: string; observed_at?: string }>,
) {
  const now = new Date().toISOString()
  const idempotencyKey = `${schedule.id}:${schedule.next_run_at || now}`

  const { data: existing } = await supabase
    .from('agent_runs')
    .select('id,status')
    .eq('requested_by', schedule.created_by)
    .eq('agent_key', schedule.agent_key)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existing) return { runId: existing.id, skipped: true }

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      agent_key: schedule.agent_key,
      status: findings.length ? 'needs_review' : 'completed',
      title,
      instructions: 'Ejecución automática programada por Vercel Cron.',
      input: schedule.input || {},
      output,
      confidence,
      requested_by: schedule.created_by,
      started_at: now,
      finished_at: now,
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .single()
  if (runError) throw runError

  if (sources.length) {
    const { error } = await supabase.from('agent_sources').insert(sources.map((source) => ({
      run_id: run.id,
      source_type: source.source_type,
      source_name: source.source_name,
      source_table: source.source_table || null,
      source_record_id: source.source_record_id || null,
      observed_at: source.observed_at || now,
      freshness_status: 'current',
      metadata: {},
    })))
    if (error) throw error
  }

  if (findings.length) {
    const { error } = await supabase.from('agent_findings').insert(findings.map((finding) => ({
      run_id: run.id,
      finding_type: finding.finding_type,
      title: finding.title,
      summary: finding.summary,
      severity: finding.severity,
      confidence,
      evidence: [],
      dimensions: { scheduled: true, scheduleId: schedule.id },
    })))
    if (error) throw error
  }

  const { error: artifactError } = await supabase.from('agent_artifacts').insert({
    run_id: run.id,
    artifact_type: schedule.agent_key === 'executive_reports' ? 'report' : 'json',
    title,
    version: 1,
    content: output,
    created_by: schedule.created_by,
  })
  if (artifactError) throw artifactError

  return { runId: run.id, skipped: false }
}

async function runMarketSchedule(supabase: ReturnType<typeof getServiceClient>, schedule: Schedule) {
  const neighborhood = typeof schedule.input?.neighborhood === 'string' ? schedule.input.neighborhood : null
  let query = supabase
    .from('market_data')
    .select('id,neighborhood,period_date,avg_price_m2_uf,inventory_count,avg_days_on_market,source,recorded_at')
    .order('period_date', { ascending: false })
    .limit(240)
  if (neighborhood) query = query.eq('neighborhood', neighborhood)

  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  const dates = [...new Set(rows.map((row) => row.period_date))].sort().reverse()
  const currentDate = dates[0] || null
  const previousDate = dates[1] || null
  const currentRows = rows.filter((row) => row.period_date === currentDate)
  const previousRows = rows.filter((row) => row.period_date === previousDate)

  const avg = (items: typeof rows, key: 'avg_price_m2_uf' | 'inventory_count' | 'avg_days_on_market') => {
    const values = items.map((row) => Number(row[key]) || 0).filter((value) => value > 0)
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  }
  const pct = (current: number, previous: number) => previous ? ((current - previous) / Math.abs(previous)) * 100 : null

  const current = {
    avgPriceM2Uf: avg(currentRows, 'avg_price_m2_uf'),
    inventory: avg(currentRows, 'inventory_count'),
    daysOnMarket: avg(currentRows, 'avg_days_on_market'),
  }
  const previous = {
    avgPriceM2Uf: avg(previousRows, 'avg_price_m2_uf'),
    inventory: avg(previousRows, 'inventory_count'),
    daysOnMarket: avg(previousRows, 'avg_days_on_market'),
  }
  const changes = {
    avgPriceM2Uf: pct(current.avgPriceM2Uf, previous.avgPriceM2Uf),
    inventory: pct(current.inventory, previous.inventory),
    daysOnMarket: pct(current.daysOnMarket, previous.daysOnMarket),
  }
  const confidence = Math.min(0.95, rows.length / 12 * 0.45 + (rows.filter((row) => row.source).length / Math.max(rows.length, 1)) * 0.55)
  const scope = neighborhood || 'Vitacura'
  const findings = [] as Array<{ finding_type: string; title: string; summary: string; severity: string }>
  if (changes.inventory !== null && Math.abs(changes.inventory) >= 8) findings.push({ finding_type: 'inventory_change', title: 'Cambio relevante de inventario', summary: `El inventario promedio de ${scope} cambió ${changes.inventory.toFixed(1)}%.`, severity: changes.inventory > 0 ? 'warning' : 'opportunity' })
  if (changes.avgPriceM2Uf !== null && Math.abs(changes.avgPriceM2Uf) >= 4) findings.push({ finding_type: 'price_m2_change', title: 'Cambio relevante en UF/m²', summary: `El precio promedio por m² de ${scope} cambió ${changes.avgPriceM2Uf.toFixed(1)}%.`, severity: changes.avgPriceM2Uf > 0 ? 'opportunity' : 'warning' })
  if (changes.daysOnMarket !== null && Math.abs(changes.daysOnMarket) >= 10) findings.push({ finding_type: 'days_on_market_change', title: 'Cambio en días de publicación', summary: `Los días promedio en mercado de ${scope} cambiaron ${changes.daysOnMarket.toFixed(1)}%.`, severity: changes.daysOnMarket > 0 ? 'warning' : 'opportunity' })
  if (!findings.length) findings.push({ finding_type: 'market_stable', title: 'Mercado sin variaciones críticas', summary: `No se detectaron cambios por sobre los umbrales operativos para ${scope}.`, severity: 'info' })

  const sourceMap = new Map<string, { source_type: string; source_name: string; source_table: string; observed_at: string }>()
  for (const row of rows) {
    const name = row.source || 'market_data'
    if (!sourceMap.has(name)) sourceMap.set(name, { source_type: 'market_dataset', source_name: name, source_table: 'market_data', observed_at: row.recorded_at || `${row.period_date}T00:00:00.000Z` })
  }

  return createRun(supabase, schedule, `Análisis automático de mercado: ${scope}`, { scope, currentDate, previousDate, current, previous, changes, sampleSize: rows.length }, confidence, findings, [...sourceMap.values()])
}

async function runReportSchedule(supabase: ReturnType<typeof getServiceClient>, schedule: Schedule) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: findings, error: findingsError } = await supabase
    .from('agent_findings')
    .select('id,title,summary,severity,confidence,created_at,agent_runs!inner(agent_key,title)')
    .eq('approval_status', 'approved')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)
  if (findingsError) throw findingsError

  const { data: weekly, error: weeklyError } = await supabase
    .from('weekly_reports')
    .select('id,report_key,sales_count,commission_total,conversion_rate,target_progress,status,generated_at')
    .order('generated_at', { ascending: false })
    .limit(4)
  if (weeklyError) throw weeklyError

  const approved = findings || []
  const critical = approved.filter((finding) => finding.severity === 'critical')
  const warnings = approved.filter((finding) => finding.severity === 'warning')
  const opportunities = approved.filter((finding) => finding.severity === 'opportunity')
  const latest = weekly?.[0] || null
  const confidenceValues = approved.map((finding) => Number(finding.confidence) || 0).filter((value) => value > 0)
  const confidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0.4
  const title = typeof schedule.input?.title === 'string' ? schedule.input.title : 'Reporte ejecutivo semanal'
  const output = {
    title,
    generatedAt: new Date().toISOString(),
    executiveSummary: critical.length ? `${critical.length} alertas críticas requieren decisión.` : warnings.length ? `${warnings.length} señales requieren seguimiento.` : 'Sin alertas críticas en el período.',
    metrics: {
      approvedFindings: approved.length,
      criticalAlerts: critical.length,
      warnings: warnings.length,
      opportunities: opportunities.length,
      latestSalesCount: latest?.sales_count ?? null,
      latestTargetProgress: latest?.target_progress ?? null,
      latestStatus: latest?.status ?? null,
    },
    priorities: approved.slice(0, 8).map((finding) => ({ title: finding.title, summary: finding.summary, severity: finding.severity, confidence: finding.confidence })),
  }
  const derived = critical.length ? [{ finding_type: 'executive_critical_alerts', title: `${critical.length} alertas críticas`, summary: critical.map((finding) => finding.title).join(' · '), severity: 'critical' }] : []
  const sources = [
    ...approved.map((finding) => ({ source_type: 'approved_agent_finding', source_name: finding.title, source_table: 'agent_findings', source_record_id: finding.id, observed_at: finding.created_at })),
    ...(weekly || []).map((row) => ({ source_type: 'management_report', source_name: row.report_key, source_table: 'weekly_reports', source_record_id: String(row.id), observed_at: row.generated_at })),
  ]
  return createRun(supabase, schedule, title, output, confidence, derived, sources)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const { data, error } = await supabase
      .from('agent_schedules')
      .select('id,agent_key,name,input,created_by,last_run_at,next_run_at')
      .eq('enabled', true)
      .lte('next_run_at', now.toISOString())
      .order('next_run_at', { ascending: true })
      .limit(10)
    if (error) throw error

    const results = []
    for (const schedule of (data || []) as Schedule[]) {
      try {
        const result = schedule.agent_key === 'market_intelligence'
          ? await runMarketSchedule(supabase, schedule)
          : schedule.agent_key === 'executive_reports'
            ? await runReportSchedule(supabase, schedule)
            : { skipped: true, reason: 'Valuation requires subject input' }

        const nextRun = nextWeeklyRun(schedule.next_run_at ? new Date(schedule.next_run_at) : now)
        const { error: updateError } = await supabase
          .from('agent_schedules')
          .update({ last_run_at: now.toISOString(), next_run_at: nextRun.toISOString() })
          .eq('id', schedule.id)
        if (updateError) throw updateError
        results.push({ scheduleId: schedule.id, agentKey: schedule.agent_key, ok: true, ...result })
      } catch (error) {
        results.push({ scheduleId: schedule.id, agentKey: schedule.agent_key, ok: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({ checkedAt: now.toISOString(), due: (data || []).length, results })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cron execution failed' }, { status: 500 })
  }
}
