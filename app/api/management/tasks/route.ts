import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = new Set(['open', 'in_progress', 'done', 'dismissed'])

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('id,role,full_name,team').eq('id', user.id).maybeSingle()
  if (!profile || !['admin', 'ceo', 'director', 'subdirector'].includes(String(profile.role).toLowerCase())) {
    return { error: NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 }) }
  }
  return { supabase, user, profile }
}

export async function GET() {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const { data, error } = await ctx.supabase
    .from('management_tasks')
    .select('id,source_key,title,detail,severity,status,office,subject_profile_id,assigned_to,created_by,due_date,resolution_note,completed_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tasks: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const body = await request.json()
  const title = String(body.title ?? '').trim()
  const sourceKey = String(body.sourceKey ?? '').trim() || null
  const entityName = String(body.entityName ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  let subjectProfileId: string | null = null
  if (entityName) {
    const { data: candidates } = await ctx.supabase.from('profiles').select('id,full_name,team').eq('team', ctx.profile.team)
    const normalize = (value: string | null) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    subjectProfileId = candidates?.find((item) => normalize(item.full_name) === normalize(entityName))?.id ?? null
  }

  const { data, error } = await ctx.supabase.from('management_tasks').insert({
    source_key: sourceKey,
    title,
    detail: String(body.detail ?? '').trim() || null,
    severity: ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'warning',
    status: 'open',
    office: ctx.profile.team,
    subject_profile_id: subjectProfileId,
    assigned_to: subjectProfileId,
    created_by: ctx.user.id,
    due_date: body.dueDate || null,
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Esta alerta ya tiene una tarea abierta.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ task: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const body = await request.json()
  const id = String(body.id ?? '')
  const status = String(body.status ?? '')
  if (!id || !allowedStatuses.has(status)) return NextResponse.json({ error: 'Actualización inválida' }, { status: 400 })
  const { data, error } = await ctx.supabase.from('management_tasks').update({
    status,
    resolution_note: String(body.resolutionNote ?? '').trim() || null,
    due_date: body.dueDate || null,
  }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ task: data })
}
