import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/access-control'
import { accessErrorResponse, requireUserScope } from '@/lib/access-guards'
import {
  normalizeTaskActivity,
  normalizeValuationActivity,
  sortPlatformActivity,
  type PlatformActivityItem,
} from '@/lib/platform/activity'
import { getRuntimeOperatingProfile } from '@/lib/platform/tenant-context'
import { createClient } from '@/lib/supabase/server'

function requestedLimit(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get('limit') ?? 25)
  if (!Number.isFinite(raw)) return 25
  return Math.min(50, Math.max(1, Math.trunc(raw)))
}

function requestedDomain(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('domain')
  return value === 'management' || value === 'valuation' ? value : null
}

export async function GET(request: NextRequest) {
  try {
    const scope = await requireUserScope()
    const operatingProfile = getRuntimeOperatingProfile()
    if (!operatingProfile.features['activity-feed']) {
      return NextResponse.json({ error: 'Activity feed disabled for this client.' }, { status: 404 })
    }

    const supabase = await createClient()
    const limit = requestedLimit(request)
    const domain = requestedDomain(request)
    const canReadManagement =
      hasCapability(scope.role, 'management.global.read')
      || hasCapability(scope.role, 'management.office.read')
      || hasCapability(scope.role, 'management.self.read')
    const canReadValuations =
      hasCapability(scope.role, 'valuations.global.read')
      || hasCapability(scope.role, 'valuations.office.read')
      || hasCapability(scope.role, 'valuations.self.read')
      || hasCapability(scope.role, 'valuations.self.create')

    const taskEventsPromise = canReadManagement && domain !== 'valuation'
      ? supabase
          .from('management_task_events')
          .select('id,task_id,actor_id,event_type,from_status,to_status,changes,created_at')
          .order('created_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null })

    const valuationEventsPromise = canReadValuations && domain !== 'management'
      ? supabase
          .from('valuation_decision_log')
          .select('id,valuation_case_id,actor_id,action,from_status,to_status,reason,metadata,created_at')
          .order('created_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null })

    const [taskEventsResult, valuationEventsResult] = await Promise.all([
      taskEventsPromise,
      valuationEventsPromise,
    ])

    if (taskEventsResult.error || valuationEventsResult.error) {
      console.error('[platform-activity] source lookup failed', {
        taskCode: taskEventsResult.error?.code ?? null,
        valuationCode: valuationEventsResult.error?.code ?? null,
      })
      return NextResponse.json({ error: 'No fue posible cargar la actividad.' }, { status: 500 })
    }

    const taskEvents = taskEventsResult.data ?? []
    const valuationEvents = valuationEventsResult.data ?? []
    const taskIds = [...new Set(taskEvents.map((item) => item.task_id))]
    const valuationIds = [...new Set(valuationEvents.map((item) => item.valuation_case_id))]
    const actorIds = [...new Set([
      ...taskEvents.map((item) => item.actor_id),
      ...valuationEvents.map((item) => item.actor_id),
    ].filter((value): value is string => Boolean(value)))]

    const [tasksResult, valuationsResult, profilesResult] = await Promise.all([
      taskIds.length
        ? supabase.from('management_tasks').select('id,title').in('id', taskIds)
        : Promise.resolve({ data: [], error: null }),
      valuationIds.length
        ? supabase.from('valuation_cases').select('id,address').in('id', valuationIds)
        : Promise.resolve({ data: [], error: null }),
      actorIds.length
        ? supabase.from('profiles').select('id,full_name').in('id', actorIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const relatedFailure = [tasksResult, valuationsResult, profilesResult].find((result) => result.error)
    if (relatedFailure?.error) {
      console.error('[platform-activity] related lookup failed', { code: relatedFailure.error.code })
      return NextResponse.json({ error: 'No fue posible completar la actividad.' }, { status: 500 })
    }

    const taskTitles = Object.fromEntries((tasksResult.data ?? []).map((item) => [item.id, item.title]))
    const valuationAddresses = Object.fromEntries((valuationsResult.data ?? []).map((item) => [item.id, item.address]))
    const actorNames = Object.fromEntries((profilesResult.data ?? []).map((item) => [item.id, item.full_name]))

    const items: PlatformActivityItem[] = [
      ...taskEvents.map((event) => normalizeTaskActivity(
        event,
        taskTitles[event.task_id] ?? null,
        event.actor_id ? actorNames[event.actor_id] ?? null : null,
      )),
      ...valuationEvents.map((event) => normalizeValuationActivity(
        event,
        valuationAddresses[event.valuation_case_id] ?? null,
        event.actor_id ? actorNames[event.actor_id] ?? null : null,
      )),
    ]

    return NextResponse.json({
      items: sortPlatformActivity(items, limit),
      generatedAt: new Date().toISOString(),
      tenantId: operatingProfile.tenantId,
      scope: scope.scope,
      sources: {
        management: canReadManagement,
        valuation: canReadValuations,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
