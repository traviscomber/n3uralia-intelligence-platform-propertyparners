import { NextRequest, NextResponse } from 'next/server'

type TaskRow = {
  id: string
  source_key: string | null
  title: string
  status: 'open' | 'in_progress' | 'done' | 'dismissed' | string | null
  priority: string | null
  due_date: string | null
  resolution_note: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  events?: Array<{ event_type?: string | null; created_at?: string | null }>
}

function isPedroPabloTask(task: TaskRow) {
  return String(task.source_key ?? '').startsWith('pedro-pablo:')
}

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''
  const response = await fetch(new URL('/api/management/tasks', request.url), {
    headers: { cookie },
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        available: false,
        reason: 'role_scope',
        summary: null,
        items: [],
        generatedAt: new Date().toISOString(),
        mode: 'verified-task-history-only',
        writesPerformed: 0,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({
      available: false,
      reason: 'source_unavailable',
      summary: null,
      items: [],
      generatedAt: new Date().toISOString(),
      mode: 'verified-task-history-only',
      writesPerformed: 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const payload = await response.json() as { tasks?: TaskRow[] }
  const tasks = (payload.tasks ?? []).filter(isPedroPabloTask).slice(0, 20)
  const items = tasks.slice(0, 8).map((task) => ({
    id: task.id,
    proposalReference: task.source_key?.slice('pedro-pablo:'.length) || null,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at,
    resolution: task.status === 'done' ? task.resolution_note : null,
    outcomeRecorded: task.status === 'done' && Boolean(task.resolution_note),
    eventCount: Array.isArray(task.events) ? task.events.length : 0,
  }))

  return NextResponse.json({
    available: true,
    reason: null,
    summary: {
      total: tasks.length,
      open: tasks.filter((task) => task.status === 'open').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      done: tasks.filter((task) => task.status === 'done').length,
      dismissed: tasks.filter((task) => task.status === 'dismissed').length,
      outcomesRecorded: tasks.filter((task) => task.status === 'done' && Boolean(task.resolution_note)).length,
    },
    items,
    generatedAt: new Date().toISOString(),
    mode: 'verified-task-history-only',
    learningClaim: 'none',
    writesPerformed: 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
