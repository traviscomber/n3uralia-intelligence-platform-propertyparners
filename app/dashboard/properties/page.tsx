import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OperationalState } from '@/components/ui/operational-state'

type AssignedProperty = {
  id: string
  assignment_role: string
  status: string
  assigned_at: string
  notes: string | null
  market_properties: Array<{
    id: string
    normalized_address: string | null
    property_type: string | null
    useful_area_m2: number | null
    built_area_m2: number | null
    bedrooms: number | null
    bathrooms: number | null
    parking_spaces: number | null
    identity_status: string | null
    last_seen_at: string | null
  }>
}

function n(value: number) { return value.toLocaleString('es-CL') }
function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-CL')
}
function assignmentRole(value: string) {
  if (value === 'owner') return 'Principal'
  if (value === 'co_broker') return 'Compartida'
  if (value === 'support') return 'Apoyo'
  return value
}

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle()
    : { data: null }

  const [listingResult, observationResult, assignmentResult] = await Promise.all([
    supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('market_current_listings').select('observed_at').order('observed_at', { ascending: false }).limit(1).maybeSingle(),
    user
      ? supabase
        .from('property_assignments')
        .select('id,assignment_role,status,assigned_at,notes,market_properties(id,normalized_address,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces,identity_status,last_seen_at)')
        .eq('assigned_to', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  const assignments = (assignmentResult.data || []) as AssignedProperty[]
  const activeListings = listingResult.count
  const latestObservation = observationResult.data?.observed_at ?? null
  const pendingIdentity = assignments.filter((assignment) => {
    const property = assignment.market_properties[0]
    return !property?.identity_status || property.identity_status !== 'confirmed'
  }).length
  const staleAssignments = assignments.filter((assignment) => {
    const property = assignment.market_properties[0]
    if (!property?.last_seen_at) return true
    const age = Date.now() - new Date(property.last_seen_at).getTime()
    return age > 7 * 24 * 60 * 60 * 1000
  }).length
  const role = String(profile?.role || '').toLowerCase()
  const canAssign = ['ceo', 'admin', 'director', 'subdirector'].includes(role)

  return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Propiedades</p>
        <h1 className="mt-2 text-3xl font-semibold">Cartera y publicaciones</h1>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Corte {formatDate(latestObservation)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/market" className="border border-[var(--n3-line)] px-4 py-2 text-sm">Mercado</Link>
        {canAssign ? <Link href="/dashboard/properties/admin" className="bg-[#d7332b] px-4 py-2 text-sm font-semibold text-white">Asignar</Link> : null}
      </div>
    </header>

    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-4">
      {[
        ['Asignadas', assignments.length],
        ['Publicaciones', activeListings ?? '—'],
        ['Identidad pendiente', pendingIdentity],
        ['Sin vigencia reciente', staleAssignments],
      ].map(([label, value]) => <div key={String(label)} className="bg-[#0c1111] p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{typeof value === 'number' ? n(value) : value}</p>
      </div>)}
    </section>

    {(pendingIdentity > 0 || staleAssignments > 0) ? <section className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="border-b border-[var(--n3-line)] px-4 py-3"><h2 className="text-sm font-semibold">Acciones</h2></div>
      <div className="divide-y divide-[var(--n3-line)]">
        {pendingIdentity > 0 ? <Link href="/dashboard/properties/admin" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.03]"><span>Confirmar identidad</span><strong>{pendingIdentity}</strong></Link> : null}
        {staleAssignments > 0 ? <Link href="/dashboard/market" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.03]"><span>Verificar vigencia</span><strong>{staleAssignments}</strong></Link> : null}
      </div>
    </section> : null}

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Cartera asignada</h2><span className="text-xs text-[var(--n3-text-muted)]">{profile?.full_name || 'Usuario'}</span></div>
      {assignmentResult.error ? <OperationalState kind="error" title="No fue posible consultar la cartera" description="Reintente más tarde." /> : assignments.length ? <div className="overflow-x-auto border border-[var(--n3-line)]">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-[#080d0d] text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="p-3 text-left">Propiedad</th><th className="p-3 text-left">Rol</th><th className="p-3 text-right">m²</th><th className="p-3 text-right">Dorm.</th><th className="p-3 text-left">Identidad</th><th className="p-3 text-left">Última evidencia</th></tr></thead>
          <tbody>{assignments.map((assignment) => {
            const property = assignment.market_properties[0] ?? null
            return <tr key={assignment.id} className="border-t border-[var(--n3-line)]">
              <td className="p-3"><p className="font-medium">{property?.normalized_address || 'Sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Sin tipo'}</p></td>
              <td className="p-3">{assignmentRole(assignment.assignment_role)}</td>
              <td className="p-3 text-right">{property?.useful_area_m2 ?? property?.built_area_m2 ?? '—'}</td>
              <td className="p-3 text-right">{property?.bedrooms ?? '—'}</td>
              <td className="p-3">{property?.identity_status || 'Pendiente'}</td>
              <td className="p-3 text-[var(--n3-text-muted)]">{formatDate(property?.last_seen_at ?? null)}</td>
            </tr>
          })}</tbody>
        </table>
      </div> : <OperationalState kind="empty" title="Sin propiedades asignadas" description="No existen asignaciones activas para este perfil." action={canAssign ? { label: 'Asignar propiedades', href: '/dashboard/properties/admin' } : undefined} />}
    </section>
  </div>
}
