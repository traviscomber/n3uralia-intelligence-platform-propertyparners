import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = new Set(['open', 'in_progress', 'done', 'dismissed'])
const allowedPriorities = new Set(['low', 'medium', 'high', 'urgent'])

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('id,role,full_name,team').eq('id', user.id).maybeSingle()
  if (!profile) return { error: NextResponse.json({ error: 'Perfil no configurado' }, { status: 403 }) }
  const role = String(profile.role ?? '').toLowerCase()
  if (!['admin', 'ceo', 'director', 'subdirector', 'seller'].includes(role)) {
    return { error: NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 }) }
  }
  return { supabase, user, profile, role }
}

export async function GET(request: NextRequest) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const taskId = request.nextUrl.searchParams.get('taskId')

  let query = ctx.supabase
    .from('management_tasks')
    .select('id,source_key,title,detail,severity,status,priority,office,subject_profile_id,assigned_to,created_by,due_date,resolution_note,completed_at,started_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (taskId) query = query.eq('id', taskId)

  const { data: tasks, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const ids = (tasks ?? []).map((task) => task.id)
  const profileIds = Array.from(new Set((tasks ?? []).flatMap((task) => [task.assigned_to, task.subject_profile_id, task.created_by]).filter(Boolean))) as string[]
  const [{ data: comments }, { data: events }, { data: profiles }] = await Promise.all([
    ids.length ? ctx.supabase.from('management_task_comments').select('id,task_id,author_id,body,created_at').in('task_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    ids.length ? ctx.supabase.from('management_task_events').select('id,task_id,actor_id,event_type,from_status,to_status,changes,created_at').in('task_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    profileIds.length ? ctx.supabase.from('profiles').select('id,full_name,team,role').in('id', profileIds) : Promise.resolve({ data: [] }),
  ])
  const profileMap = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile]))

  return NextResponse.json({
    tasks: (tasks ?? []).map((task) => ({
      ...task,
      assignedProfile: task.assigned_to ? profileMap[task.assigned_to] ?? null : null,
      subjectProfile: task.subject_profile_id ? profileMap[task.subject_profile_id] ?? null : null,
      createdByProfile: task.created_by ? profileMap[task.created_by] ?? null : null,
      comments: (comments ?? []).filter((comment) => comment.task_id === task.id).map((comment) => ({ ...comment, authorProfile: profileMap[comment.author_id] ?? null })),
      events: (events ?? []).filter((event) => event.task_id === task.id).map((event) => ({ ...event, actorProfile: event.actor_id ? profileMap[event.actor_id] ?? null : null })),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const ctx = await context()
  if ('error' in ctx) return ctx.error
  const body = await request.json()

  if (body.action === 'comment') {
    const taskId = String(body.taskId ?? '')
    const comment = String(body.comment ?? '').trim()
    if (!taskId || !comment) return NextResponse.json({ error: 'Tarea y comentario requeridos' }, { status: 400 })
    const { data, error } = await ctx.supabase.from('management_task_comments').insert({ task_id: taskId, author_id: ctx.user.id, body: comment }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ comment: data }, { status: 201 })
  }

  if (!['admin', 'ceo', 'director', 'subdirector'].includes(ctx.role)) return NextResponse.json({ error: 'Rol no autorizado para crear tareas' }, { status: 403 })
  const title = String(body.title ?? '').trim()
  const sourceKey = String(body.sourceKey ?? '').trim() || null
  const entityName = String(body.entityName ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  let subjectProfileId: string | null = null
  if (body.subjectProfileId) subjectProfileId = String(body.subjectProfileId)
  else if (entityName) {
    const { data: candidates } = await ctx.supabase.from('profiles').select('id,full_name,team').eq('team', ctx.profile.team)
    const normalize = (value: string | null) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    subjectProfileId = candidates?.find((item) => normalize(item.full_name) === normalize(entityName))?.id ?? null
  }
  const assignedTo = body.assignedTo ? String(body.assignedTo) : subjectProfileId
  if (assignedTo) {
    const { data: allowed } = await ctx.supabase.rpc('has_management_profile_scope', { p_profile_id: assignedTo, p_user_id: ctx.user.id })
    if (!allowed) return NextResponse.json({ error: 'Responsable fuera del alcance autorizado' }, { status: 403 })
  }

  const { data, error } = await ctx.supabase.from('management_tasks').insert({
    source_key: sourceKey,
    title,
    detail: String(body.detail ?? '').trim() || null,
    severity: ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'warning',
    priority: allowedPriorities.has(String(body.priority)) ? body.priority : 'medium',
    status: 'open',
    office: ctx.profile.team,
    subject_profile_id: subjectProfileId,
    assigned_to: assignedTo,
    created_by: ctx.user.id,
    updated_by: ctx.user.id,
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
  if (!id) return NextResponse.json({ error: 'Tarea requerida' }, { status: 400 })

  const update: Record<string, unknown> = { updated_by: ctx.user.id }
  if (body.status !== undefined) {
    const status = String(body.status)
    if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    update.status = status
    if (status === 'in_progress') update.started_at = new Date().toISOString()
    if (status === 'done') update.completed_at = new Date().toISOString()
    if (status === 'open') { update.started_at = null; update.completed_at = null }
  }
  if (body.priority !== undefined) {
    const priority = String(body.priority)
    if (!allowedPriorities.has(priority)) return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 })
    update.priority = priority
  }
  if (body.dueDate !== undefined) update.due_date = body.dueDate || null
  if (body.resolutionNote !== undefined) update.resolution_note = String(body.resolutionNote ?? '').trim() || null
  if (body.assignedTo !== undefined) {
    const assignedTo = body.assignedTo ? String(body.assignedTo) : null
    if (assignedTo) {
      const { data: allowed } = await ctx.supabase.rpc('has_management_profile_scope', { p_profile_id: assignedTo, p_user_id: ctx.user.id })
      if (!allowed) return NextResponse.json({ error: 'Responsable fuera del alcance autorizado' }, { status: 403 })
    }
    update.assigned_to = assignedTo
  }

  const { data, error } = await ctx.supabase.from('management_tasks').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ task: data })
}
