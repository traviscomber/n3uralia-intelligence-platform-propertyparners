import type { UserRole } from '@/lib/types'
import type { NextBestAction } from '@/lib/platform/next-best-action'

export type AttentionPriority = 'urgent' | 'high' | 'medium' | 'low'
export type AttentionKind = 'task' | 'valuation' | 'proactive'

export type AttentionItem = {
  id: string
  kind: AttentionKind
  title: string
  reason: string
  priority: AttentionPriority
  href: string
  dueDate: string | null
  sourceId: string | null
  source: 'management_tasks' | 'valuation_cases' | 'next-best-action'
}

type TaskRow = {
  id: string
  title: string
  priority: string
  status: string
  due_date: string | null
}

type ValuationRow = {
  id: string
  address: string | null
  status: string
  requested_by: string
  updated_at: string
}

const priorityRank: Record<AttentionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function normalizeTaskPriority(value: string): AttentionPriority {
  if (value === 'urgent' || value === 'high' || value === 'low') return value
  return 'medium'
}

export function taskAttentionItems(tasks: TaskRow[], today: string): AttentionItem[] {
  return tasks
    .filter((task) => task.status === 'open' || task.status === 'in_progress')
    .map((task) => {
      const overdue = Boolean(task.due_date && task.due_date < today)
      const priority = overdue ? 'urgent' : normalizeTaskPriority(task.priority)
      const reason = overdue
        ? `Venció el ${task.due_date}.`
        : task.due_date
          ? `Vence el ${task.due_date}.`
          : task.status === 'in_progress'
            ? 'Está en progreso.'
            : 'Está pendiente.'

      return {
        id: `task:${task.id}`,
        kind: 'task' as const,
        title: task.title,
        reason,
        priority,
        href: `/dashboard/control/operations?taskId=${encodeURIComponent(task.id)}`,
        dueDate: task.due_date,
        sourceId: task.id,
        source: 'management_tasks' as const,
      }
    })
}

export function valuationAttentionItems(
  valuations: ValuationRow[],
  role: UserRole,
  profileId: string,
): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const valuation of valuations) {
    const label = valuation.address || valuation.id.slice(0, 8)

    if (role === 'seller' && valuation.requested_by === profileId && valuation.status === 'draft') {
      items.push({
        id: `valuation:${valuation.id}:draft`,
        kind: 'valuation',
        title: `Avanzar valorización · ${label}`,
        reason: 'El expediente sigue en borrador y puede avanzar.',
        priority: 'medium',
        href: `/dashboard/valuations/${valuation.id}`,
        dueDate: null,
        sourceId: valuation.id,
        source: 'valuation_cases',
      })
    }

    if ((role === 'director' || role === 'subdirector') && valuation.status === 'review') {
      items.push({
        id: `valuation:${valuation.id}:review`,
        kind: 'valuation',
        title: `Revisar valorización · ${label}`,
        reason: 'Está en revisión dentro del alcance de tu oficina.',
        priority: 'high',
        href: `/dashboard/valuations/${valuation.id}`,
        dueDate: null,
        sourceId: valuation.id,
        source: 'valuation_cases',
      })
    }

    if (role === 'ceo' && valuation.status === 'review') {
      items.push({
        id: `valuation:${valuation.id}:decision`,
        kind: 'valuation',
        title: `Decidir valorización · ${label}`,
        reason: 'Está disponible para decisión ejecutiva.',
        priority: 'high',
        href: `/dashboard/valuations/${valuation.id}`,
        dueDate: null,
        sourceId: valuation.id,
        source: 'valuation_cases',
      })
    }

    if (role === 'ceo' && valuation.status === 'approved') {
      items.push({
        id: `valuation:${valuation.id}:issue`,
        kind: 'valuation',
        title: `Emitir valorización · ${label}`,
        reason: 'Está aprobada y lista para emisión.',
        priority: 'high',
        href: `/dashboard/valuations/${valuation.id}`,
        dueDate: null,
        sourceId: valuation.id,
        source: 'valuation_cases',
      })
    }
  }

  return items
}

export function proactiveAttentionItems(actions: NextBestAction[]): AttentionItem[] {
  return actions.map((action) => ({
    id: `proactive:${action.id}`,
    kind: 'proactive' as const,
    title: action.title,
    reason: 'Siguiente mejor acción sugerida por el perfil operativo.',
    priority: action.priority,
    href: action.href,
    dueDate: null,
    sourceId: action.id,
    source: 'next-best-action' as const,
  }))
}

export function composeAttentionInbox(
  formalItems: AttentionItem[],
  proactiveItems: AttentionItem[],
  limit = 5,
) {
  const formal = [...formalItems].sort((a, b) => {
    const rank = priorityRank[a.priority] - priorityRank[b.priority]
    if (rank !== 0) return rank
    return String(a.dueDate ?? '9999-12-31').localeCompare(String(b.dueDate ?? '9999-12-31'))
  })

  const hrefs = new Set(formal.map((item) => item.href))
  const proactive = proactiveItems.filter((item) => !hrefs.has(item.href))
  const items = [...formal, ...proactive].slice(0, Math.max(1, limit))

  return {
    items,
    formalCount: formal.length,
    proactiveCount: items.filter((item) => item.kind === 'proactive').length,
    mode: formal.length ? 'attention' as const : 'proactive' as const,
  }
}
