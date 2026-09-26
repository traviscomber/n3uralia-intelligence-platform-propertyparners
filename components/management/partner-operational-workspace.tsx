import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePageCapability } from '@/lib/access-guards'
import { PartnerTaskAction } from '@/components/management/partner-task-action'

type AssignmentRow = {
  id: string
  assignment_role: string
  status: string
  assigned_at: string
  notes: string | null
  market_properties: Array<{
    id: string
    normalized_address: string | null
    neighborhood_id: string | null
    property_type: string | null
    useful_area_m2: number | null
    built_area_m2: number | null
    bedrooms: number | null
    bathrooms: number | null
    parking_spaces: number | null
  }>
}

type TaskRow = { id: string; title: string; status: string; due_date: string | null; priority: string | null }

function qs(value: string | number | null | undefined) { return encodeURIComponent(String(value ?? '')) }
function date(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha inválida' : parsed.toLocaleDateString('es-CL')
}

function taskStatus(value: string) {
  if (value === 'open') return 'Pendiente'
  if (value === 'in_progress') return 'En curso'
  if (value === 'done') return 'Completada'
  if (value === 'dismissed') return 'Cerrada'
  return value
}


function priorityLabel(value: string | null) {
  if (value === 'high') return 'Alta'
  if (value === 'medium') return 'Media'
  if (value === 'low') return 'Baja'
  return 'Sin prioridad'
}

export async function PartnerOperationalWorkspace() {
  const scope = await requirePageCapability('dashboard.self.read')
  const supabase = await createClient()
  const [assignmentsResult, tasksResult] = await Promise.all([
    supabase.from('property_assignments').select('id,assignment_role,status,assigned_at,notes,market_properties(id,normalized_address,neighborhood_id,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces)').eq('assigned_to', scope.profileId).eq('status', 'active').order('assigned_at', { ascending: false }).limit(12),
    supabase.from('management_tasks').select('id,title,status,due_date,priority').eq('assigned_to', scope.profileId).in('status', ['open','in_progress']).order('due_date', { ascending: true, nullsFirst: false }).limit(12),
  ])
  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[]
  const tasks = ((tasksResult.data ?? []) as TaskRow[]).sort((a, b) => {
    const priorityWeight = (value: string | null) => value === 'high' ? 0 : value === 'medium' ? 1 : value === 'low' ? 2 : 3
    const priorityDelta = priorityWeight(a.priority) - priorityWeight(b.priority)
    if (priorityDelta !== 0) return priorityDelta
    const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
    const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
    return aTime - bTime
  })
  const visibleTasks = tasks.slice(0, 3)
  const hiddenTasks = tasks.slice(3)
  const visibleAssignments = assignments.slice(0, 3)
  const hiddenAssignments = assignments.slice(3)
  const errors = [assignmentsResult.error, tasksResult.error].filter(Boolean).map((item) => item?.message)

  return <section className="mx-auto mt-8 max-w-7xl space-y-6 pb-16">
    <div className="border-b border-[var(--n3-line)] pb-4"><h1 className="text-3xl font-semibold">Hoy</h1><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Lo que requiere tu atención.</p></div>
    {errors.length ? <div className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No se pudo cargar toda tu información. Recarga la página o intenta nuevamente.</div> : null}
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-4"><h2 className="font-semibold">Tareas</h2></div>
        <div className="divide-y divide-[var(--n3-line)]">
          {visibleTasks.map((task) => <article key={task.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><strong>{task.title}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Vence: {date(task.due_date)} · prioridad {priorityLabel(task.priority)}</p><PartnerTaskAction taskId={task.id} status={task.status} /></div><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{taskStatus(task.status)}</span></div></article>)}
          {!tasks.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">No tienes tareas pendientes.</p> : null}
        </div>
        {hiddenTasks.length ? <details className="border-t border-[var(--n3-line)]"><summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver {hiddenTasks.length} tarea{hiddenTasks.length === 1 ? '' : 's'} más</summary><div className="divide-y divide-[var(--n3-line)]">{hiddenTasks.map((task) => <article key={task.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><strong>{task.title}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Vence: {date(task.due_date)} · prioridad {priorityLabel(task.priority)}</p><PartnerTaskAction taskId={task.id} status={task.status} /></div><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{taskStatus(task.status)}</span></div></article>)}</div></details> : null}
      </div>
      <div className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-4"><h2 className="font-semibold">Cartera</h2></div>
        <div className="divide-y divide-[var(--n3-line)]">
          {visibleAssignments.map((assignment) => { const property = assignment.market_properties[0] ?? null; const href = `/dashboard/valuation?assignmentId=${qs(assignment.id)}&propertyId=${qs(property?.id)}&address=${qs(property?.normalized_address)}&neighborhoodId=${qs(property?.neighborhood_id)}&propertyType=${qs(property?.property_type)}&usefulAreaM2=${qs(property?.useful_area_m2)}&builtAreaM2=${qs(property?.built_area_m2)}&bedrooms=${qs(property?.bedrooms)}&bathrooms=${qs(property?.bathrooms)}&parkingSpaces=${qs(property?.parking_spaces)}`; return <article key={assignment.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{property?.normalized_address || 'Dirección no disponible'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipo no disponible'} · asignada {date(assignment.assigned_at)}</p></div><Link href={href} className="border border-[#d7332b] px-3 py-2 text-xs font-semibold text-[#ff766f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]">Iniciar valorización</Link></div></article> })}
          {!assignments.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">No tienes propiedades asignadas en este momento.</p> : null}
        </div>
        {hiddenAssignments.length ? <details className="border-t border-[var(--n3-line)]"><summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Ver {hiddenAssignments.length} propiedad{hiddenAssignments.length === 1 ? '' : 'es'} más</summary><div className="divide-y divide-[var(--n3-line)]">{hiddenAssignments.map((assignment) => { const property = assignment.market_properties[0] ?? null; const href = `/dashboard/valuation?assignmentId=${qs(assignment.id)}&propertyId=${qs(property?.id)}&address=${qs(property?.normalized_address)}&neighborhoodId=${qs(property?.neighborhood_id)}&propertyType=${qs(property?.property_type)}&usefulAreaM2=${qs(property?.useful_area_m2)}&builtAreaM2=${qs(property?.built_area_m2)}&bedrooms=${qs(property?.bedrooms)}&bathrooms=${qs(property?.bathrooms)}&parkingSpaces=${qs(property?.parking_spaces)}`; return <article key={assignment.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{property?.normalized_address || 'Dirección no disponible'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipo no disponible'} · asignada {date(assignment.assigned_at)}</p></div><Link href={href} className="border border-[#d7332b] px-3 py-2 text-xs font-semibold text-[#ff766f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]">Iniciar valorización</Link></div></article> })}</div></details> : null}
      </div>
    </div>
  </section>
}
