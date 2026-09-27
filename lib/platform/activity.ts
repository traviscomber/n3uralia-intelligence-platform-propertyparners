export type PlatformActivityDomain = 'management' | 'valuation'

export type PlatformActivityItem = {
  id: string
  occurredAt: string
  domain: PlatformActivityDomain
  action: string
  title: string
  objectId: string
  actorId: string | null
  actorName: string | null
  href: string
  source: 'management_task_events' | 'valuation_decision_log'
  metadata: Record<string, unknown>
}

type TaskEventRow = {
  id: string
  task_id: string
  actor_id: string | null
  event_type: string
  from_status: string | null
  to_status: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

type ValuationEventRow = {
  id: string
  valuation_case_id: string
  actor_id: string | null
  action: string
  from_status: string | null
  to_status: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const valuationLabels: Record<string, string> = {
  case_created: 'Valorización creada',
  submitted_for_review: 'Valorización enviada a revisión',
  rejected: 'Valorización devuelta',
  approved: 'Valorización aprobada',
  issued: 'Valorización emitida',
  comparable_selected: 'Comparable aceptado',
  comparable_excluded: 'Comparable excluido',
}

const taskLabels: Record<string, string> = {
  created: 'Tarea creada',
  status_changed: 'Estado de tarea actualizado',
  assignment_changed: 'Responsable de tarea actualizado',
  priority_changed: 'Prioridad de tarea actualizada',
  due_date_changed: 'Vencimiento de tarea actualizado',
  completed: 'Tarea completada',
  reopened: 'Tarea reabierta',
}

export function normalizeTaskActivity(
  event: TaskEventRow,
  taskTitle: string | null,
  actorName: string | null,
): PlatformActivityItem {
  return {
    id: `task:${event.id}`,
    occurredAt: event.created_at,
    domain: 'management',
    action: event.event_type,
    title: `${taskLabels[event.event_type] ?? 'Tarea actualizada'}${taskTitle ? ` · ${taskTitle}` : ''}`,
    objectId: event.task_id,
    actorId: event.actor_id,
    actorName,
    href: `/dashboard/control/operations?taskId=${encodeURIComponent(event.task_id)}`,
    source: 'management_task_events',
    metadata: {
      fromStatus: event.from_status,
      toStatus: event.to_status,
      changes: event.changes ?? {},
    },
  }
}

export function normalizeValuationActivity(
  event: ValuationEventRow,
  address: string | null,
  actorName: string | null,
): PlatformActivityItem {
  return {
    id: `valuation:${event.id}`,
    occurredAt: event.created_at,
    domain: 'valuation',
    action: event.action,
    title: `${valuationLabels[event.action] ?? 'Valorización actualizada'}${address ? ` · ${address}` : ''}`,
    objectId: event.valuation_case_id,
    actorId: event.actor_id,
    actorName,
    href: `/dashboard/valuations/${encodeURIComponent(event.valuation_case_id)}`,
    source: 'valuation_decision_log',
    metadata: {
      fromStatus: event.from_status,
      toStatus: event.to_status,
      reason: event.reason,
      ...(event.metadata ?? {}),
    },
  }
}

export function sortPlatformActivity(items: PlatformActivityItem[], limit: number) {
  return [...items]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, Math.max(1, limit))
}
