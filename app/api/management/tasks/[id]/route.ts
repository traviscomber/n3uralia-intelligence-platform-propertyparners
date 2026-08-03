import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accessErrorResponse, requireCapability } from '@/lib/access-guards'

const allowedStatuses = new Set(['open', 'in_progress', 'done'])

function logTaskFailure(stage: string, error: { code?: string } | null) {
  console.error('TASK_SELF_UPDATE_FAILED', { stage, code: error?.code ?? 'unknown' })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCapability('tasks.self.manage')
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const status = String(body?.status ?? '').trim().toLowerCase()
    const resolutionNote = String(body?.resolutionNote ?? '').trim() || null

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Estado de tarea no permitido' }, { status: 400 })
    }
    if (status === 'done' && !resolutionNote) {
      return NextResponse.json({ error: 'Se requiere una nota de resolución para completar la tarea' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: task, error: taskError } = await supabase
      .from('management_tasks')
      .select('id,assigned_to,status')
      .eq('id', id)
      .maybeSingle()

    if (taskError) {
      logTaskFailure('lookup', taskError)
      return NextResponse.json({ error: 'No pudimos consultar la tarea.' }, { status: 500 })
    }
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    if (task.assigned_to !== scope.profileId) {
      return NextResponse.json({ error: 'No puede modificar tareas asignadas a otro perfil' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status, updated_by: scope.profileId, updated_at: now }
    if (status === 'in_progress') patch.started_at = now
    if (status === 'done') {
      patch.completed_at = now
      patch.resolution_note = resolutionNote
    }

    const { data, error } = await supabase
      .from('management_tasks')
      .update(patch)
      .eq('id', id)
      .eq('assigned_to', scope.profileId)
      .select('id,status,started_at,completed_at,resolution_note,updated_at')
      .single()

    if (error) {
      logTaskFailure('update', error)
      return NextResponse.json({ error: 'No pudimos actualizar la tarea.' }, { status: 422 })
    }
    return NextResponse.json({ task: data })
  } catch (error) {
    return accessErrorResponse(error)
  }
}
