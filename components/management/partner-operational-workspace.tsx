import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePageCapability } from '@/lib/access-guards'

type AssignmentRow = {
  id: string
  assignment_role: string
  status: string
  assigned_at: string
  notes: string | null
  market_properties: Array<{
    id: string
    normalized_address: string | null
    neighborhood: string | null
    property_type: string | null
    useful_area_m2: number | null
    built_area_m2: number | null
    bedrooms: number | null
    bathrooms: number | null
    parking_spaces: number | null
  }>
}

type ValuationRow = {
  id: string
  status: string
  address: string | null
  updated_at: string
  version_number: number | null
}

type TaskRow = {
  id: string
  title: string
  status: string
  due_date: string | null
  priority: string | null
}

type DecisionRow = {
  id: string
  valuation_case_id: string
  action: string
  reason: string | null
  created_at: string
}

function qs(value: string | number | null | undefined) {
  return encodeURIComponent(String(value ?? ''))
}

function date(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha inválida' : parsed.toLocaleDateString('es-CL')
}

export async function PartnerOperationalWorkspace() {
  const scope = await requirePageCapability('dashboard.self.read')
  const supabase = await createClient()

  const [assignmentsResult, valuationsResult, tasksResult] = await Promise.all([
    supabase
      .from('property_assignments')
      .select('id,assignment_role,status,assigned_at,notes,market_properties(id,normalized_address,neighborhood,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces)')
      .eq('assigned_to', scope.profileId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(12),
    supabase
      .from('valuation_cases')
      .select('id,status,address,updated_at,version_number')
      .eq('requested_by', scope.profileId)
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('management_tasks')
      .select('id,title,status,due_date,priority')
      .eq('assigned_to', scope.profileId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(12),
  ])

  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[]
  const valuations = (valuationsResult.data ?? []) as ValuationRow[]
  const tasks = (tasksResult.data ?? []) as TaskRow[]
  const valuationIds = valuations.map((item) => item.id)
  const decisionsResult = valuationIds.length
    ? await supabase
      .from('valuation_decision_log')
      .select('id,valuation_case_id,action,reason,created_at')
      .in('valuation_case_id', valuationIds)
      .order('created_at', { ascending: false })
      .limit(20)
    : { data: [], error: null }
  const decisions = (decisionsResult.data ?? []) as DecisionRow[]

  const errors = [assignmentsResult.error, valuationsResult.error, tasksResult.error, decisionsResult.error]
    .filter(Boolean)
    .map((item) => item?.message)

  return (
    <section className="mx-auto mt-8 max-w-7xl space-y-6 pb-16">
      <div className="border-b border-[var(--n3-line)] pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff766f]">Operación personal conectada</p>
        <h2 className="mt-2 text-2xl font-semibold">Cartera, valorizaciones, tareas y revisiones</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Todas las consultas usan el perfil autenticado y permanecen limitadas por RLS al alcance personal.</p>
      </div>

      {errors.length ? <div className="border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">Parte del espacio operativo no pudo cargarse: {errors.join(' · ')}</div> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="border border-[var(--n3-line)] bg-[#0c1111]">
          <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Propiedades asignadas</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Cada propiedad abre una valorización con ficha prellenada y evidencia de origen.</p></div>
          <div className="divide-y divide-[var(--n3-line)]">
            {assignments.map((assignment) => {
              const property = assignment.market_properties[0] ?? null
              const href = `/dashboard/valuation?assignmentId=${qs(assignment.id)}&propertyId=${qs(property?.id)}&address=${qs(property?.normalized_address)}&neighborhood=${qs(property?.neighborhood)}&propertyType=${qs(property?.property_type)}&usefulAreaM2=${qs(property?.useful_area_m2)}&builtAreaM2=${qs(property?.built_area_m2)}&bedrooms=${qs(property?.bedrooms)}&bathrooms=${qs(property?.bathrooms)}&parkingSpaces=${qs(property?.parking_spaces)}`
              return <article key={assignment.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><strong>{property?.normalized_address || 'Dirección no normalizada'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipo n/d'} · asignada {date(assignment.assigned_at)}</p></div>
                  <Link href={href} className="border border-[#d7332b] px-3 py-2 text-xs font-semibold text-[#ff766f]">Iniciar valorización</Link>
                </div>
              </article>
            })}
            {!assignments.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">No existen propiedades activas asignadas a este perfil.</p> : null}
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[#0c1111]">
          <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Valorizaciones personales</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Estado e historial reciente del expediente.</p></div>
          <div className="divide-y divide-[var(--n3-line)]">
            {valuations.map((item) => <Link key={item.id} href={`/dashboard/valuations/${item.id}`} className="block p-4 hover:bg-white/[0.03]"><div className="flex items-center justify-between gap-3"><div><strong>{item.address || 'Propiedad sin dirección'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">v{item.version_number || 1} · actualizado {date(item.updated_at)}</p></div><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{item.status}</span></div></Link>)}
            {!valuations.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">Aún no existen valorizaciones para este perfil.</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="border border-[var(--n3-line)] bg-[#0c1111]">
          <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Tareas y alertas personales</h3></div>
          <div className="divide-y divide-[var(--n3-line)]">
            {tasks.map((task) => <article key={task.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><strong>{task.title}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Vence: {date(task.due_date)} · prioridad {task.priority || 'n/d'}</p></div><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{task.status}</span></div></article>)}
            {!tasks.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">No hay tareas personales visibles.</p> : null}
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[#0c1111]">
          <div className="border-b border-[var(--n3-line)] p-4"><h3 className="font-semibold">Observaciones e historial de revisión</h3></div>
          <div className="divide-y divide-[var(--n3-line)]">
            {decisions.map((decision) => <article key={decision.id} className="p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{decision.action} · {date(decision.created_at)}</p><p className="mt-2 text-sm leading-6">{decision.reason || 'Sin observación adicional.'}</p><Link href={`/dashboard/valuations/${decision.valuation_case_id}`} className="mt-2 inline-block text-xs font-semibold text-[#ff766f]">Abrir expediente</Link></article>)}
            {!decisions.length ? <p className="p-5 text-sm text-[var(--n3-text-muted)]">No existen observaciones de revisión registradas.</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
