import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { supabase, user, role: String(profile?.role ?? '').toLowerCase() }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!['admin','ceo','director','subdirector'].includes(ctx.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const [{ data: schedules, error }, { data: entities }] = await Promise.all([
    ctx.supabase.from('management_report_schedules').select('*').order('created_at', { ascending: false }),
    ctx.supabase.from('management_entities').select('id,name,entity_type').eq('active', true).order('name'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: schedules ?? [], entities: entities ?? [] })
}

export async function POST(request: Request) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  if (!['admin','ceo'].includes(ctx.role)) return NextResponse.json({ error: 'Solo administración y CEO pueden programar reportes.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.name || !body?.reportType || !body?.cadence) return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
  const recipients = Array.isArray(body.recipients) ? body.recipients.map(String).filter(Boolean) : []
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, Math.min(28, Math.max(1, Number(body.dayOfMonth ?? 1))), 9, 0, 0))
  const { data, error } = await ctx.supabase.from('management_report_schedules').insert({
    name: String(body.name), report_type: String(body.reportType), entity_id: body.entityId || null,
    cadence: String(body.cadence), day_of_month: Math.min(28, Math.max(1, Number(body.dayOfMonth ?? 1))),
    recipients, active: body.active !== false, next_run_at: next.toISOString(), created_by: ctx.user.id,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
