import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  MANAGEMENT_REPORT_CADENCES,
  MANAGEMENT_REPORT_TYPES,
  canRunManagementReports,
  nextManagementScheduleRun,
  normalizeScheduleDay,
  normalizeScheduleRecipients,
} from '@/lib/management-report-schedule'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  if (!canRunManagementReports(role)) {
    return { error: NextResponse.json({ error: 'Solo CEO y administración pueden gestionar programaciones.' }, { status: 403 }) }
  }
  return { supabase, user, role }
}

function scheduleRecord(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim()
  const reportType = String(body.reportType ?? '').trim().toLowerCase()
  const cadence = String(body.cadence ?? '').trim().toLowerCase()
  const dayOfMonth = normalizeScheduleDay(body.dayOfMonth)
  const recipients = normalizeScheduleRecipients(body.recipients)

  if (!name) throw new Error('El nombre de la programación es obligatorio.')
  if (!MANAGEMENT_REPORT_TYPES.includes(reportType as (typeof MANAGEMENT_REPORT_TYPES)[number])) {
    throw new Error('Tipo de reporte no soportado.')
  }
  if (!MANAGEMENT_REPORT_CADENCES.includes(cadence as (typeof MANAGEMENT_REPORT_CADENCES)[number])) {
    throw new Error('Frecuencia no soportada.')
  }

  return {
    name,
    report_type: reportType,
    entity_id: body.entityId ? String(body.entityId) : null,
    cadence,
    day_of_month: dayOfMonth,
    recipients,
    active: body.active !== false,
  }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error

  const [{ data: schedules, error }, { data: entities, error: entitiesError }] = await Promise.all([
    ctx.supabase
      .from('management_report_schedules')
      .select('*,management_entities(name,entity_type)')
      .order('created_at', { ascending: false }),
    ctx.supabase.from('management_entities').select('id,name,entity_type').eq('active', true).order('name'),
  ])
  if (error || entitiesError) return NextResponse.json({ error: error?.message ?? entitiesError?.message }, { status: 500 })
  return NextResponse.json({ schedules: schedules ?? [], entities: entities ?? [] })
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json() as Record<string, unknown>
    const record = scheduleRecord(body)
    const { data, error } = await ctx.supabase.from('management_report_schedules').insert({
      ...record,
      next_run_at: nextManagementScheduleRun(record.day_of_month),
      created_by: ctx.user.id,
    }).select('*,management_entities(name,entity_type)').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await ctx.supabase.from('management_change_log').insert({
      entity_name: 'management_report_schedules',
      entity_id: data.id,
      action: 'create',
      after_data: data,
      changed_by: ctx.user.id,
    })
    return NextResponse.json({ schedule: data }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Programación inválida.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json() as Record<string, unknown>
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Falta el identificador de la programación.' }, { status: 400 })

    const { data: before, error: readError } = await ctx.supabase
      .from('management_report_schedules')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (readError) return NextResponse.json({ error: readError.message }, { status: 400 })
    if (!before) return NextResponse.json({ error: 'Programación no encontrada.' }, { status: 404 })

    const record = scheduleRecord({
      name: body.name ?? before.name,
      reportType: body.reportType ?? before.report_type,
      entityId: body.entityId === undefined ? before.entity_id : body.entityId,
      cadence: body.cadence ?? before.cadence,
      dayOfMonth: body.dayOfMonth ?? before.day_of_month,
      recipients: body.recipients ?? before.recipients,
      active: body.active === undefined ? before.active : body.active,
    })
    const timingChanged = record.day_of_month !== before.day_of_month || record.cadence !== before.cadence
    const reactivated = record.active && !before.active
    const nextRunAt = timingChanged || reactivated || !before.next_run_at
      ? nextManagementScheduleRun(record.day_of_month)
      : before.next_run_at

    const { data, error } = await ctx.supabase
      .from('management_report_schedules')
      .update({ ...record, next_run_at: nextRunAt, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*,management_entities(name,entity_type)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await ctx.supabase.from('management_change_log').insert({
      entity_name: 'management_report_schedules',
      entity_id: id,
      action: 'update',
      before_data: before,
      after_data: data,
      changed_by: ctx.user.id,
    })
    return NextResponse.json({ schedule: data })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Programación inválida.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
