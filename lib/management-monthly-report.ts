import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getManagementAutomationReadiness } from '@/lib/management-automation-readiness'
import { buildCanonicalMonthlySnapshot } from '@/lib/management-canonical-monthly-snapshot'
import {
  advanceSchedule,
  previousMonthBounds,
  type ManagementReportTrigger,
} from '@/lib/management-report-schedule'

type RunOptions = {
  trigger: ManagementReportTrigger
  actorId?: string | null
  now?: Date
}

type ExistingReport = {
  id: string
  snapshot: Record<string, unknown> | null
}

function snapshotScheduleId(snapshot: ExistingReport['snapshot']) {
  return snapshot && typeof snapshot.scheduleId === 'string' ? snapshot.scheduleId : null
}

export async function runDueManagementReports(options: RunOptions) {
  const now = options.now ?? new Date()
  const period = previousMonthBounds(now)
  const readiness = getManagementAutomationReadiness()

  if (!readiness.ready) {
    return {
      trigger: options.trigger,
      period,
      blocked: true,
      readiness,
      evaluation: null,
      schedulesDue: 0,
      schedulesProcessed: 0,
      schedulesFailed: 0,
      results: [],
    }
  }

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

  const canonicalPeriod = period.start.slice(0, 7)
  const canonicalSnapshot = buildCanonicalMonthlySnapshot(canonicalPeriod, now.toISOString(), options.trigger)
  let canonicalArchive: Record<string, unknown> | null = null

  if (canonicalSnapshot) {
    const existingCanonical = await supabase
      .from('management_report_runs')
      .select('id')
      .eq('report_type', 'monthly')
      .is('entity_id', null)
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .contains('snapshot', { schemaVersion: 'canonical-monthly-report-v1' })
      .limit(1)

    if (existingCanonical.error) throw new Error(existingCanonical.error.message)

    if (existingCanonical.data?.[0]?.id) {
      canonicalArchive = {
        reportId: existingCanonical.data[0].id,
        status: 'already_generated',
        period: canonicalPeriod,
      }
    } else {
      const insertPayload: Record<string, unknown> = {
        report_type: 'monthly',
        entity_id: null,
        period_start: period.start,
        period_end: period.end,
        status: 'generated',
        snapshot: canonicalSnapshot,
      }
      if (options.actorId) insertPayload.generated_by = options.actorId

      const createdCanonical = await supabase
        .from('management_report_runs')
        .insert(insertPayload)
        .select('id')
        .single()

      if (createdCanonical.error) throw new Error(createdCanonical.error.message)
      canonicalArchive = {
        reportId: createdCanonical.data.id,
        status: 'generated',
        period: canonicalPeriod,
      }
    }
  }

  for (const schedule of schedules) {
    let reportQuery = supabase
      .from('management_report_runs')
      .select('id,snapshot')
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
    const reportStatus = existing ? 'already_generated' : 'generated'

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
    blocked: false,
    readiness,
    evaluation: evaluation.data,
    schedulesDue: schedules.length,
    schedulesProcessed: results.filter((result) => result.status !== 'failed').length,
    schedulesFailed: results.filter((result) => result.status === 'failed').length,
    canonicalArchive,
    results,
  }
}
