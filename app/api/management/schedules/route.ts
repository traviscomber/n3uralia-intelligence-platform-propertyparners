import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import dependencyStatus from '@/config/client-dependencies-status.json'

const LEADER_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const SCHEDULER_ROLES = new Set(['admin', 'ceo'])
const CADENCES = new Set(['monthly'])
const REPORT_TYPES = new Set(['management', 'executive', 'director'])
const APPROVED_DEPENDENCY_STATUSES = new Set(['received', 'approved', 'waived'])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type DependencyId = 'reporting-approval' | 'kpi-dictionary'

function dependencyReadiness(id: DependencyId, fallbackLabel: string) {
  const dependency = dependencyStatus.dependencies.find((item) => item.id === id)
  const status = dependency?.status ?? 'pending'
  return {
    id,
    status,
    ready: APPROVED_DEPENDENCY_STATUSES.has(status),
    label: dependency?.label ?? fallbackLabel,
  }
}

function automationReadiness() {
  const reportingApproval = dependencyReadiness('reporting-approval', 'Calendario, destinatarios y reglas de reportes')
  const kpiDictionary = dependencyReadiness('kpi-dictionary', 'Diccionario oficial de KPI')
  return {
    ready: reportingApproval.ready && kpiDictionary.ready,
    reportingApproval,
    kpiDictionary,
  }
}

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error) {
    console.error('[management-schedules] profile lookup failed', { code: error.code })
    return { error: NextResponse.json({ error: 'No fue posible validar el perfil.' }, { status: 500 }) }
  }

  return { supabase, user, role: String(profile?.role ?? '').toLowerCase() }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!LEADER_ROLES.has(ctx.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const [{ data: schedules, error: scheduleError }, { data: entities, error: entityError }] = await Promise.all([
    ctx.supabase.from('management_report_schedules').select('*').order('created_at', { ascending: false }),
    ctx.supabase.from('management_entities').select('id,name,entity_type').eq('active', true).order('name'),
  ])

  if (scheduleError || entityError) {
    console.error('[management-schedules] lookup failed', {
      scheduleCode: scheduleError?.code ?? null,
      entityCode: entityError?.code ?? null,
    })
    return NextResponse.json({ error: 'No fue posible cargar la programación de reportes.' }, { status: 500 })
  }

  return NextResponse.json({ schedules: schedules ?? [], entities: entities ?? [], automationReadiness: automationReadiness() })
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!SCHEDULER_ROLES.has(ctx.role)) {
    return NextResponse.json({ error: 'Solo administración y CEO pueden programar reportes.' }, { status: 403 })
  }

  const readiness = automationReadiness()
  if (!readiness.ready) {
    const pendingDependencies = [readiness.reportingApproval, readiness.kpiDictionary]
      .filter((dependency) => !dependency.ready)
      .map((dependency) => ({ id: dependency.id, status: dependency.status, label: dependency.label }))
    return NextResponse.json({
      error: 'La programación está bloqueada hasta contar con definiciones KPI y reglas de reporting aprobadas o formalmente eximidas.',
      dependencies: pendingDependencies,
    }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim().slice(0, 160)
  const reportType = String(body?.reportType ?? '').trim().toLowerCase()
  const cadence = String(body?.cadence ?? '').trim().toLowerCase()
  const dayOfMonth = Math.min(28, Math.max(1, Number(body?.dayOfMonth ?? 1)))
  const recipients = Array.isArray(body?.recipients)
    ? [...new Set(body.recipients.map(String).map((value: string) => value.trim().toLowerCase()).filter(Boolean))].slice(0, 200)
    : []

  if (!name || !REPORT_TYPES.has(reportType) || !CADENCES.has(cadence) || !Number.isInteger(dayOfMonth)) {
    return NextResponse.json({ error: 'La configuración del reporte es inválida.' }, { status: 400 })
  }
  if (recipients.length === 0 || recipients.some((recipient) => !EMAIL_PATTERN.test(recipient))) {
    return NextResponse.json({ error: 'La programación requiere al menos un destinatario de email válido.' }, { status: 400 })
  }

  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth, 9, 0, 0))
  const { data, error } = await ctx.supabase.from('management_report_schedules').insert({
    name,
    report_type: reportType,
    entity_id: body?.entityId || null,
    cadence,
    day_of_month: dayOfMonth,
    recipients,
    active: body?.active !== false,
    next_run_at: next.toISOString(),
    created_by: ctx.user.id,
  }).select('*').single()

  if (error) {
    console.error('[management-schedules] schedule creation failed', { code: error.code })
    return NextResponse.json({ error: 'No fue posible crear la programación del reporte.' }, { status: 500 })
  }

  return NextResponse.json({ schedule: data }, { status: 201 })
}
