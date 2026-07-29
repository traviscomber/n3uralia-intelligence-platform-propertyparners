import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function previousMonthBounds() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
}

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const period = previousMonthBounds()
  const [{ data: entities, error: entityError }, { data: definitions, error: definitionError }, { data: metrics, error: metricError }, { data: alerts, error: alertError }, { data: schedules, error: scheduleError }] = await Promise.all([
    supabase.from('management_entities').select('id,name,entity_type,parent_id').eq('active', true).order('name'),
    supabase.from('management_metric_definitions').select('code,label,unit,methodology').eq('active', true).order('sort_order'),
    supabase.from('management_metric_values').select('*').eq('period_start', period.start).eq('period_end', period.end),
    supabase.from('management_alerts').select('*').eq('period_start', period.start).eq('period_end', period.end).in('status',['open','acknowledged']),
    supabase.from('management_report_schedules').select('*').eq('active', true).lte('next_run_at', new Date().toISOString()),
  ])
  const firstError = entityError || definitionError || metricError || alertError || scheduleError
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

  const evaluation = await supabase.rpc('evaluate_management_alerts', { p_period_start: period.start, p_period_end: period.end })
  if (evaluation.error) return NextResponse.json({ error: evaluation.error.message }, { status: 500 })

  const results:any[] = []
  for (const schedule of schedules ?? []) {
    const scopedEntities = schedule.entity_id ? (entities ?? []).filter(entity => entity.id === schedule.entity_id) : (entities ?? [])
    const snapshot = {
      period: period.start.slice(0,7), generatedBy: 'scheduled-automation', definitions,
      entities: scopedEntities.map(entity => ({ ...entity, metrics: (metrics ?? []).filter(metric => metric.entity_id === entity.id) })),
      alerts: (alerts ?? []).filter(alert => !schedule.entity_id || alert.entity_id === schedule.entity_id),
    }
    const { data: report, error: reportError } = await supabase.from('management_report_runs').insert({ report_type: schedule.report_type, entity_id: schedule.entity_id, period_start: period.start, period_end: period.end, status: 'generated', snapshot }).select('*').single()
    if (reportError) { results.push({ scheduleId:schedule.id,error:reportError.message }); continue }
    const recipients = Array.isArray(schedule.recipients) ? schedule.recipients.map(String).filter(Boolean) : []
    if (recipients.length) await supabase.from('management_report_distributions').insert(recipients.map(recipient => ({ report_run_id: report.id, recipient, channel:'email', status:'pending' })))
    const next = new Date(schedule.next_run_at || new Date().toISOString())
    if (schedule.cadence === 'monthly') next.setUTCMonth(next.getUTCMonth()+1)
    if (schedule.cadence === 'quarterly') next.setUTCMonth(next.getUTCMonth()+3)
    if (schedule.cadence === 'yearly') next.setUTCFullYear(next.getUTCFullYear()+1)
    await supabase.from('management_report_schedules').update({ last_run_at:new Date().toISOString(), next_run_at:next.toISOString(), updated_at:new Date().toISOString() }).eq('id',schedule.id)
    results.push({ scheduleId:schedule.id,reportId:report.id,recipients:recipients.length })
  }

  return NextResponse.json({ period, evaluation:evaluation.data, schedulesProcessed:results.length, results })
}
