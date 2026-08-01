import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type ManagementReportTrigger = 'cron' | 'manual'
export type CronAuthorizationFailure = 'missing_secret' | 'missing_authorization' | 'invalid_authorization' | null

export function getCronAuthorizationFailure(authorization: string | null, cronSecret: string | undefined): CronAuthorizationFailure {
  if (!cronSecret) return 'missing_secret'
  if (!authorization) return 'missing_authorization'
  if (authorization !== `Bearer ${cronSecret}`) return 'invalid_authorization'
  return null
}

export function previousMonthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function advanceSchedule(nextRunAt: string | null, cadence: string, now = new Date()) {
  const next = new Date(nextRunAt || now.toISOString())
  if (Number.isNaN(next.getTime())) throw new Error('La programación contiene next_run_at inválido.')

  const advanceOnce = () => {
    if (cadence === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
    else if (cadence === 'quarterly') next.setUTCMonth(next.getUTCMonth() + 3)
    else if (cadence === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1)
    else throw new Error(`Cadencia no soportada: ${cadence}`)
  }

  advanceOnce()
  let guard = 0
  while (next <= now && guard < 120) {
    advanceOnce()
    guard += 1
  }
  if (next <= now) throw new Error('No fue posible avanzar la programación a una fecha futura.')
  return next.toISOString()
}

type RunOptions = {
  trigger: ManagementReportTrigger
  actorId?: string | null
  now?: Date
}

type ExistingReport = {
  id: string
  snapshot: Record<string, unknown> | null
  status: string | null
}

function snapshotScheduleId(snapshot: ExistingReport['snapshot']) {
  return snapshot && typeof snapshot.scheduleId === 'string' ? snapshot.scheduleId : null
}

export async function runDueManagementReports(options: RunOptions) {
  const now = options.now ?? new Date()
  const period = previousMonthBounds(now)
  const supabase = createAdminClient()

  const [entitiesResult, definitionsResult, metricsResult, alertsResult, schedulesResult] = await Promise.all([
    supabase.from('management_entities').select('id,name,entity_type,parent_id').eq('active', true).order('name'),
    supabase.from('management_metric_definitions').select('code,label,unit,methodology,formula_version').eq('active', true).order('sort_order'),
    supabase.from('management_metric_values').select('*').eq('period_start', period.start).eq('period_end', period.end),
    supabase.from('management_alerts').select('*').eq('period_start', period.start).eq('period_end', period.end).in('status', ['open', 'acknowledged']),
    supabase.from('management_report_schedules').select('*').eq('active', true).lte('next_run_at', now.toISOString()).order('next_run_at'),
  ])

  const firstError = entitiesResult.error || definitionsResult.error || metricsResult.error || alertsResult.error || schedulesResult.error
  if (firstError) throw new Error(firstError.message)

  const evaluation = await supabase.rpc('evaluate_management_alerts', {
    p_period_start: period.start,
    p_period_end: period.end,
  })
  if (evaluation.error) throw new Error(evaluation.error.message)

  const entities = entitiesResult.data ?? []
  const definitions = definitionsResult.data ?? []
  const metrics = metricsResult.data ?? []
  const alerts = alertsResult.data ?? []
  const schedules = schedulesResult.data ?? []
  const results: Array<Record<string, unknown>> = []

  for (const schedule of schedules) {
    let reportQuery = supabase
      .from('management_report_runs')
      .select('id,snapshot,status')
      .eq('report_type', schedule.report_type)
      .eq('period_start', period.start)
      .eq('period_end', period.end)

    reportQuery = schedule.entity_id
      ? reportQuery.eq('entity_id', schedule.entity_id)
      : reportQuery.is('entity_id', null)

    const existingResult = await reportQuery
    if (existingResult.error) {
      results.push({ scheduleId: schedule.id, status: 'failed', error: existingResult.error.message })
      continue
    }

    const existing = ((existingResult.data ?? []) as ExistingReport[])
      .find((report) => snapshotScheduleId(report.snapshot) === schedule.id)

    let reportId = existing?.id ?? null
    let reportStatus = existing ? 'already_generated' : 'generated'

    if (!reportId) {
      const scopedEntities = schedule.entity_id
        ? entities.filter((entity) => entity.id === schedule.entity_id)
        : entities
      const snapshot = {
        scheduleId: schedule.id,
        trigger: options.trigger,
        generatedAt: now.toISOString(),
        period: period.start.slice(0, 7),
        definitions,
        entities: scopedEntities.map((entity) => ({
          ...entity,
          metrics: metrics.filter((metric) => metric.entity_id === entity.id),
        })),
        alerts: alerts.filter((alert) => !schedule.entity_id || alert.entity_id === schedule.entity_id),
      }
      const insertPayload: Record<string, unknown> = {
        report_type: schedule.report_type,
        entity_id: schedule.entity_id,
        period_start: period.start,
        period_end: period.end,
        status: 'generated',
        snapshot,
      }
      if (options.actorId) insertPayload.generated_by = options.actorId

      const reportResult = await supabase
        .from('management_report_runs')
        .insert(insertPayload)
        .select('id')
        .single()
      if (reportResult.error) {
        results.push({ scheduleId: schedule.id, status: 'failed', error: reportResult.error.message })
        continue
      }
      reportId = reportResult.data.id
    }

    const recipients: string[] = Array.isArray(schedule.recipients)
      ? schedule.recipients.map((value: unknown) => String(value).trim()).filter(Boolean)
      : []

    if (reportId && recipients.length) {
      const distributionResult = await supabase
        .from('management_report_distributions')
        .upsert(
          recipients.map((recipient) => ({
            report_run_id: reportId,
            recipient,
            channel: 'email',
            status: 'pending',
          })),
          { onConflict: 'report_run_id,recipient,channel', ignoreDuplicates: true },
        )
      if (distributionResult.error) {
        results.push({ scheduleId: schedule.id, reportId, status: 'failed', error: distributionResult.error.message })
        continue
      }
    }

    const nextRunAt = advanceSchedule(schedule.next_run_at, schedule.cadence, now)
    const scheduleUpdate = await supabase
      .from('management_report_schedules')
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRunAt,
        updated_at: now.toISOString(),
      })
      .eq('id', schedule.id)

    if (scheduleUpdate.error) {
      results.push({ scheduleId: schedule.id, reportId, status: 'failed', error: scheduleUpdate.error.message })
      continue
    }

    results.push({
      scheduleId: schedule.id,
      reportId,
      status: reportStatus,
      recipients: recipients.length,
      nextRunAt,
    })
  }

  return {
    trigger: options.trigger,
    period,
    evaluation: evaluation.data,
    schedulesDue: schedules.length,
    schedulesProcessed: results.filter((result) => result.status !== 'failed').length,
    schedulesFailed: results.filter((result) => result.status === 'failed').length,
    results,
  }
}
