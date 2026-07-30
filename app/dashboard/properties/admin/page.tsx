import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const LEADERSHIP_ROLES = new Set(['admin', 'ceo', 'director', 'subdirector'])
const ASSIGNMENT_ROLES = new Set(['owner', 'co_broker', 'support'])
const ASSIGNMENT_STATUSES = new Set(['active', 'paused', 'closed'])

function text(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-CL')
}

async function requireLeadership() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()
  if (!LEADERSHIP_ROLES.has(role)) redirect('/auth/error')

  return { supabase, user }
}

async function createAssignment(formData: FormData) {
  'use server'
  const { supabase, user } = await requireLeadership()
  const propertyId = text(formData.get('property_id'))
  const assignedTo = text(formData.get('assigned_to'))
  const assignmentRole = text(formData.get('assignment_role'))
  const notes = text(formData.get('notes'))

  if (!propertyId || !assignedTo || !ASSIGNMENT_ROLES.has(assignmentRole)) return

  const { error } = await supabase.from('property_assignments').insert({
    property_id: propertyId,
    assigned_to: assignedTo,
    assigned_by: user.id,
    assignment_role: assignmentRole,
    status: 'active',
    notes: notes || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/properties/admin')
}

async function updateAssignment(formData: FormData) {
  'use server'
  const { supabase } = await requireLeadership()
  const assignmentId = text(formData.get('assignment_id'))
  const assignmentRole = text(formData.get('assignment_role'))
  const status = text(formData.get('status'))
  const notes = text(formData.get('notes'))

  if (!assignmentId || !ASSIGNMENT_ROLES.has(assignmentRole) || !ASSIGNMENT_STATUSES.has(status)) return

  const { error } = await supabase.from('property_assignments').update({
    assignment_role: assignmentRole,
    status,
    notes: notes || null,
    ended_at: status === 'closed' ? new Date().toISOString() : null,
  }).eq('id', assignmentId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/properties')
  revalidatePath('/dashboard/properties/admin')
}

export default async function PropertyAssignmentAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireLeadership()
  const { q = '' } = await searchParams
  const query = q.trim()

  const [profilesResult, assignmentsResult] = await Promise.all([
    supabase.from('profiles').select('id,full_name,team,role').eq('role', 'seller').order('full_name'),
    supabase.from('property_assignments').select('id,property_id,assigned_to,assignment_role,status,notes,assigned_at,ended_at').order('assigned_at', { ascending: false }).limit(100),
  ])

  let propertiesQuery = supabase.from('market_properties').select('id,normalized_address,property_type,bedrooms,bathrooms,useful_area_m2,identity_status,last_seen_at').order('last_seen_at', { ascending: false }).limit(30)
  if (query) propertiesQuery = propertiesQuery.ilike('normalized_address', `%${query}%`)
  const propertiesResult = await propertiesQuery

  const assignments = assignmentsResult.data ?? []
  const assignmentPropertyIds = Array.from(new Set(assignments.map((item) => item.property_id)))
  const assignedPropertiesResult = assignmentPropertyIds.length
    ? await supabase.from('market_properties').select('id,normalized_address,property_type').in('id', assignmentPropertyIds)
    : { data: [], error: null }

  const profiles = profilesResult.data ?? []
  const properties = propertiesResult.data ?? []
  const profileById = new Map(profiles.map((item) => [item.id, item]))
  const propertyById = new Map((assignedPropertiesResult.data ?? []).map((item) => [item.id, item]))
  const error = profilesResult.error?.message || assignmentsResult.error?.message || propertiesResult.error?.message || assignedPropertiesResult.error?.message || null

  return <div className="mx-auto max-w-7xl space-y-8 pb-16">
    <header className="border-b border-[var(--n3-line)] pb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">Administración · cartera</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Asignación de propiedades</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Asigna propiedades canónicas a ejecutivas mediante una relación explícita. Cada creación y modificación queda registrada automáticamente en el historial de auditoría.</p>
    </header>

    {error ? <div className="border border-[#d7332b] bg-[#160d0c] p-5 text-sm text-[#ff766f]">No fue posible cargar toda la administración de cartera: {error}</div> : null}

    <section className="space-y-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Buscar</p><h2 className="mt-2 text-2xl font-semibold">Propiedades disponibles para asignación</h2></div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <input name="q" defaultValue={query} placeholder="Buscar por dirección normalizada" className="min-w-0 flex-1 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-sm outline-none focus:border-[var(--n3-teal)]" />
        <button className="border border-[var(--n3-line)] px-5 py-3 text-sm font-semibold hover:border-[var(--n3-teal)]">Buscar</button>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        {properties.map((property) => <article key={property.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-sm font-semibold">{property.normalized_address || 'Dirección no disponible'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property.property_type || 'Tipología n/d'} · {property.useful_area_m2 ?? 'n/d'} m² · {property.bedrooms ?? 'n/d'} dorm. · {property.bathrooms ?? 'n/d'} baños</p></div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--n3-text-muted)]">{property.identity_status || 'sin estado'}</span>
          </div>
          <p className="mt-3 text-[10px] text-[var(--n3-text-muted)]">Última evidencia: {formatDate(property.last_seen_at)}</p>
          <form action={createAssignment} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="property_id" value={property.id} />
            <label className="text-xs text-[var(--n3-text-muted)]">Ejecutiva<select name="assigned_to" required className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]"><option value="">Seleccionar</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} · {profile.team || 'sin sucursal'}</option>)}</select></label>
            <label className="text-xs text-[var(--n3-text-muted)]">Rol<select name="assignment_role" defaultValue="owner" className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]"><option value="owner">Responsable principal</option><option value="co_broker">Corretaje compartido</option><option value="support">Apoyo comercial</option></select></label>
            <label className="text-xs text-[var(--n3-text-muted)] sm:col-span-2">Nota auditada<input name="notes" maxLength={500} className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]" placeholder="Motivo o alcance de la asignación" /></label>
            <button className="bg-[#d7332b] px-4 py-2.5 text-xs font-semibold text-white sm:col-span-2">Asignar propiedad</button>
          </form>
        </article>)}
      </div>
      {!properties.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">No se encontraron propiedades para la búsqueda ingresada.</div> : null}
    </section>

    <section className="space-y-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Cartera vigente e histórica</p><h2 className="mt-2 text-2xl font-semibold">Asignaciones registradas</h2></div>
      <div className="grid gap-4">
        {assignments.map((assignment) => {
          const profile = profileById.get(assignment.assigned_to)
          const property = propertyById.get(assignment.property_id)
          return <article key={assignment.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_auto] lg:items-start">
              <div><p className="font-semibold">{property?.normalized_address || 'Propiedad sin dirección visible'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipología n/d'} · asignada {formatDate(assignment.assigned_at)}</p></div>
              <div><p className="text-sm">{profile?.full_name || 'Perfil no disponible'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{profile?.team || 'Sin sucursal asociada'}</p></div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--n3-text-muted)]">{assignment.status}</span>
            </div>
            <form action={updateAssignment} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
              <input type="hidden" name="assignment_id" value={assignment.id} />
              <label className="text-xs text-[var(--n3-text-muted)]">Rol<select name="assignment_role" defaultValue={assignment.assignment_role} className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]"><option value="owner">Responsable principal</option><option value="co_broker">Corretaje compartido</option><option value="support">Apoyo comercial</option></select></label>
              <label className="text-xs text-[var(--n3-text-muted)]">Estado<select name="status" defaultValue={assignment.status} className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]"><option value="active">Activa</option><option value="paused">Pausada</option><option value="closed">Cerrada</option></select></label>
              <label className="text-xs text-[var(--n3-text-muted)]">Nota<input name="notes" defaultValue={assignment.notes ?? ''} maxLength={500} className="mt-1 w-full border border-[var(--n3-line)] bg-black px-3 py-2.5 text-sm text-[var(--n3-text-light)]" /></label>
              <button className="border border-[var(--n3-line)] px-4 py-2.5 text-xs font-semibold hover:border-[var(--n3-teal)]">Guardar</button>
            </form>
          </article>
        })}
      </div>
      {!assignments.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">No existen asignaciones registradas. La cartera permanecerá vacía hasta que dirección cree una relación explícita.</div> : null}
    </section>
  </div>
}
