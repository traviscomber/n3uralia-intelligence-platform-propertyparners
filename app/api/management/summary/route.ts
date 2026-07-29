import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function monthBounds(period?: string) {
  const safe = /^\d{4}-\d{2}$/.test(period ?? '') ? String(period) : new Date().toISOString().slice(0, 7)
  const start = `${safe}-01`
  const endDate = new Date(`${start}T00:00:00Z`)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)
  endDate.setUTCDate(0)
  return { period: safe, start, end: endDate.toISOString().slice(0, 10) }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('id,role,full_name').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  const { searchParams } = new URL(request.url)
  const bounds = monthBounds(searchParams.get('period') ?? undefined)

  const [{ data: entities, error: entityError }, { data: definitions, error: definitionError }] = await Promise.all([
    supabase.from('management_entities').select('id,name,entity_type,parent_id,profile_id,active').eq('active', true).order('name'),
    supabase.from('management_metric_definitions').select('code,label,description,unit,methodology,sort_order').eq('active', true).order('sort_order'),
  ])

  if (entityError || definitionError) {
    return NextResponse.json({ error: entityError?.message ?? definitionError?.message }, { status: 500 })
  }

  const visibleEntities = (entities ?? []).filter((entity) => {
    if (['admin', 'ceo'].includes(role)) return true
    if (['director', 'subdirector'].includes(role)) return entity.entity_type !== 'company'
    return entity.profile_id === user.id
  })
  const entityIds = visibleEntities.map((entity) => entity.id)

  if (entityIds.length === 0) {
    return NextResponse.json({
      period: bounds.period,
      profile: { role, fullName: profile?.full_name ?? null },
      entities: [],
      definitions: definitions ?? [],
      metrics: [],
      goals: [],
      alerts: [],
      comparisons: [],
    })
  }

  const previousStartDate = new Date(`${bounds.start}T00:00:00Z`)
  previousStartDate.setUTCMonth(previousStartDate.getUTCMonth() - 1)
  const previousStart = previousStartDate.toISOString().slice(0, 10)
  const previousEndDate = new Date(`${bounds.start}T00:00:00Z`)
  previousEndDate.setUTCDate(0)
  const previousEnd = previousEndDate.toISOString().slice(0, 10)

  const year = bounds.period.slice(0, 4)
  const previousYear = String(Number(year) - 1)
  const previousYearStart = `${previousYear}-${bounds.period.slice(5)}-01`
  const previousYearEndDate = new Date(`${previousYearStart}T00:00:00Z`)
  previousYearEndDate.setUTCMonth(previousYearEndDate.getUTCMonth() + 1)
  previousYearEndDate.setUTCDate(0)
  const previousYearEnd = previousYearEndDate.toISOString().slice(0, 10)

  const [{ data: metrics, error: metricError }, { data: goals, error: goalError }, { data: alerts, error: alertError }, { data: priorMetrics }] = await Promise.all([
    supabase.from('management_metric_values').select('*').in('entity_id', entityIds).eq('period_start', bounds.start).eq('period_end', bounds.end),
    supabase.from('management_goals').select('*').in('entity_id', entityIds).eq('period_start', bounds.start).eq('period_end', bounds.end),
    supabase.from('management_alerts').select('*').in('entity_id', entityIds).in('status', ['open', 'acknowledged']).order('severity').order('created_at', { ascending: false }),
    supabase.from('management_metric_values').select('entity_id,metric_code,period_start,period_end,value').in('entity_id', entityIds).in('period_start', [previousStart, previousYearStart]),
  ])

  if (metricError || goalError || alertError) {
    return NextResponse.json({ error: metricError?.message ?? goalError?.message ?? alertError?.message }, { status: 500 })
  }

  const prior = priorMetrics ?? []
  const comparisons = (metrics ?? []).map((metric) => {
    const previous = prior.find((item) => item.entity_id === metric.entity_id && item.metric_code === metric.metric_code && item.period_start === previousStart)
    const previousYearValue = prior.find((item) => item.entity_id === metric.entity_id && item.metric_code === metric.metric_code && item.period_start === previousYearStart)
    const mom = previous && Number(previous.value) !== 0 ? ((Number(metric.value) - Number(previous.value)) / Math.abs(Number(previous.value))) * 100 : null
    const yoy = previousYearValue && Number(previousYearValue.value) !== 0 ? ((Number(metric.value) - Number(previousYearValue.value)) / Math.abs(Number(previousYearValue.value))) * 100 : null
    return { entityId: metric.entity_id, metricCode: metric.metric_code, mom, yoy, previousPeriod: { start: previousStart, end: previousEnd }, previousYearPeriod: { start: previousYearStart, end: previousYearEnd } }
  })

  return NextResponse.json({
    period: bounds.period,
    profile: { role, fullName: profile?.full_name ?? null },
    entities: visibleEntities,
    definitions: definitions ?? [],
    metrics: metrics ?? [],
    goals: goals ?? [],
    alerts: alerts ?? [],
    comparisons,
  })
}
