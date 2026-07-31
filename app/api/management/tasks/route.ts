import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, assertProfileVisible, requireAnyCapability } from '@/lib/access-guards'

const allowedStatuses = new Set(['open', 'in_progress', 'done', 'dismissed'])
const allowedPriorities = new Set(['low', 'medium', 'high', 'urgent'])
const taskCapabilities = ['tasks.global.manage', 'tasks.office.manage', 'tasks.self.manage'] as const

export async function GET(request: NextRequest) {
  try {
    const scope = await requireAnyCapability(taskCapabilities)
    const supabase = await createClient()
    const taskId = request.nextUrl.searchParams.get('taskId')

    let query = supabase
      .from('management_tasks')
      .select('id,source_key,title,detail,severity,status,priority,office,subject_profile_id,assigned_to,created_by,due_date,resolution_note,completed_at,started_at,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (taskId) query = query.eq('id', taskId)
    if (scope.scope === 'office' && scope.team) query = query.eq('office', scope.team)
    if (scope.scope === 'self') query = query.eq('assigned_to', scope.profileId)

    const { data: tasks, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const ids = (tasks ?? []).map((task) => task.id)
    const profileIds = Array.from(new Set((tasks ?? []).flatMap((task) => [task.assigned_to, task.subject_profile_id, task.created_by]).filter(Boolean))) as string[]
    const [{ data: comments }, { data: events }, { data: profiles }] = await Promise.all([
      ids.length ? supabase.from('management_task_comments').select('id,task_id,author_id,body,created_at').in('task_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('management_task_events').select('id,task_id,actor_id,event_type,from_status,to_status,changes,created_at').in('task_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
      profileIds.length ? supabase.from('profiles').select('id,full_name,team,role').in('id', profileIds) : Promise.resolve({ data: [] }),
    ])
    const profileMap = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile]))

    return NextResponse.json({ tasks: (tasks ?? []).map((task) => ({
      ...task,
      assignedProfile: task.assigned_to ? profileMap[task.assigned_to] ?? null : null,
      subjectProfile: task.subject_profile_id ? profileMap[task.subject_profile_id] ?? null : null,
      createdByProfile: task.created_by ? profileMap[task.created_by] ?? null : null,
      comments: (comments ?? []).filter((comment) => comment.task_id === task.id).map((comment) => ({ ...comment, authorProfile: profileMap[comment.author_id] ?? null })),
      events: (events ?? []).filter((event) => event.task_id === task.id).map((event) => ({ ...event, actorProfile: event.actor_id ? profileMap[event.actor_id] ?? null : null })),
    })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireAnyCapability(['tasks.global.manage', 'tasks.office.manage'])
    const supabase = await createClient()
    const body = await request.json()

    if (body.action === 'comment') {
      const taskId = String(body.taskId ?? '')
      const comment = String(body.comment ?? '').trim()
      if (!taskId || !comment) return NextResponse.json({ error: 'Tarea y comentario requeridos' }, { status: 400 })
      const { data: task } = await supabase.from('management_tasks').select('id,office,assigned_to').eq('id', taskId).maybeSingle()
      if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
      if (scope.scope === 'office' && task.office !== scope.team) return NextResponse.json({ error: 'Tarea fuera del alcance de oficina' }, { status: 403 })
      const { data, error } = await supabase.from('management_task_comments').insert({ task_id: taskId, author_id: scope.profileId, body: comment }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ comment: data }, { status: 201 })
    }

    const title = String(body.title ?? '').trim()
    const sourceKey = String(body.sourceKey ?? '').trim() || null
    const entityName = String(body.entityName ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

    let subjectProfileId: string | null = body.subjectProfileId ? String(body.subjectProfileId) : null
    if (!subjectProfileId && entityName) {
      let candidatesQuery = supabase.from('profiles').select('id,full_name,team')
      if (scope.scope === 'office' && scope.team) candidatesQuery = candidatesQuery.eq('team', scope.team)
      const { data: candidates } = await candidatesQuery
      const normalize = (value: string | null) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      subjectProfileId = candidates?.find((item) => normalize(item.full_name) === normalize(entityName))?.id ?? null
    }
    const assignedTo = body.assignedTo ? String(body.assignedTo) : subjectProfileId
    if (subjectProfileId) assertProfileVisible(scope, subjectProfileId)
    if (assignedTo) assertProfileVisible(scope, assignedTo)

    const { data, error } = await supabase.from('management_tasks').insert({
      source_key: sourceKey,
      title,
      detail: String(body.detail ?? '').trim() || null,
      severity: ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'warning',
      priority: allowedPriorities.has(String(body.priority)) ? body.priority : 'medium',
      status: 'open',
      office: scope.team,
      subject_profile_id: subjectProfileId,
      assigned_to: assignedTo,
      created_by: scope.profileId,
      updated_by: scope.profileId,
      due_date: body.dueDate || null,
    }).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Esta alerta ya tiene una tarea abierta.' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error) {
    return accessErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await requireAnyCapability(taskCapabilities)
    const supabase = await createClient()
    const body = await request.json()
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ error: 'Tarea requerida' }, { status: 400 })

    const { data: existing } = await supabase.from('management_tasks').select('id,office,assigned_to').eq('id', id).maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    if (scope.scope === 'office' && existing.office !== scope.team) return NextResponse.json({ error: 'Tarea fuera del alcance de oficina' }, { status: 403 })
    if (scope.scope === 'self' && existing.assigned_to !== scope.profileId) return NextResponse.json({ error: 'Tarea fuera del alcance personal' }, { status: 403 })

    const update: Record<string, unknown> = { updated_by: scope.profileId }
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
      if (assignedTo) assertProfileVisible(scope, assignedTo)
      update.assigned_to = assignedTo
    }

    const { data, error } = await supabase.from('management_tasks').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ task: data })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
