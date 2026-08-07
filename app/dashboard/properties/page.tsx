import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

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
  const confirmedIdentity = assignments.filter((assignment) => assignment.market_properties[0]?.identity_status === 'confirmed').length
  const pendingIdentity = assignments.length - confirmedIdentity
  const staleAssignments = assignments.filter((assignment) => {
    const property = assignment.market_properties[0]
    if (!property?.last_seen_at) return true
    const age = Date.now() - new Date(property.last_seen_at).getTime()
    return age > 7 * 24 * 60 * 60 * 1000
  }).length
  const role = String(profile?.role || '').toLowerCase()
  const canAssign = ['ceo', 'admin', 'director', 'subdirector'].includes(role)
  const coverage = assignments.length ? confirmedIdentity / assignments.length : null
  const dataStatus = assignmentResult.error ? 'blocked' : assignments.length && confirmedIdentity === assignments.length ? 'ready' : 'partial'

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Propiedades"
      title="Cartera y publicaciones"
      meta={`Corte ${formatDate(latestObservation)}`}
      actions={[
        { label: 'Mercado', href: '/dashboard/market' },
        ...(canAssign ? [{ label: 'Asignar', href: '/dashboard/properties/admin', primary: true }] : []),
      ]}
    />

    <MetricStrip items={[
      { label: 'Asignadas', value: n(assignments.length) },
      { label: 'Publicaciones', value: activeListings == null ? '—' : n(activeListings) },
      { label: 'Identidad pendiente', value: n(pendingIdentity), tone: pendingIdentity > 0 ? 'danger' : 'success' },
      { label: 'Sin vigencia reciente', value: n(staleAssignments), tone: staleAssignments > 0 ? 'warning' : 'success' },
    ]} />

    {(pendingIdentity > 0 || staleAssignments > 0) ? <section className="mt-5">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Acciones</h2>
        <span className="text-xs text-[var(--n3-text-muted)]">{Number(pendingIdentity > 0) + Number(staleAssignments > 0)}</span>
      </div>
      <div className="divide-y divide-[var(--n3-line)]">
        {pendingIdentity > 0 ? <Link href="/dashboard/properties/admin" className="flex min-h-14 items-center justify-between py-3 text-sm hover:bg-white/[0.03]"><span>Confirmar identidad</span><strong className="text-[#ff8d87]">{pendingIdentity}</strong></Link> : null}
        {staleAssignments > 0 ? <Link href="/dashboard/market" className="flex min-h-14 items-center justify-between py-3 text-sm hover:bg-white/[0.03]"><span>Verificar vigencia</span><strong className="text-[#f0c96a]">{staleAssignments}</strong></Link> : null}
      </div>
    </section> : null}

    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Cartera asignada</h2><span className="text-xs text-[var(--n3-text-muted)]">{profile?.full_name || 'Usuario'}</span></div>
      {assignmentResult.error ? <OperationalState kind="error" title="No fue posible consultar la cartera" description="Reintente más tarde." /> : assignments.length ? <div className="overflow-x-auto border-y border-[var(--n3-line)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="p-3 text-left">Propiedad</th><th className="p-3 text-left">Rol</th><th className="p-3 text-right">m²</th><th className="p-3 text-right">Dorm.</th><th className="p-3 text-left">Identidad</th><th className="p-3 text-left">Última evidencia</th></tr></thead>
          <tbody>{assignments.map((assignment) => {
            const property = assignment.market_properties[0] ?? null
            return <tr key={assignment.id} className="border-t border-[var(--n3-line)]">
              <td className="p-3">{property ? <Link href={`/dashboard/properties/${property.id}`} className="group block"><p className="font-medium group-hover:text-[var(--n3-teal-soft)]">{property.normalized_address || 'Sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property.property_type || 'Sin tipo'} · Abrir inteligencia →</p></Link> : <><p className="font-medium">Sin dirección</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Sin identidad vinculada</p></>}</td>
              <td className="p-3">{assignmentRole(assignment.assignment_role)}</td>
              <td className="p-3 text-right">{property?.useful_area_m2 ?? property?.built_area_m2 ?? '—'}</td>
              <td className="p-3 text-right">{property?.bedrooms ?? '—'}</td>
              <td className="p-3">{property?.identity_status === 'confirmed' ? 'Confirmada' : 'Pendiente'}</td>
              <td className="p-3 text-[var(--n3-text-muted)]">{formatDate(property?.last_seen_at ?? null)}</td>
            </tr>
          })}</tbody>
        </table>
      </div> : <OperationalState kind="empty" title="Sin propiedades asignadas" description="No existen asignaciones activas para este perfil." action={canAssign ? { label: 'Asignar propiedades', href: '/dashboard/properties/admin' } : undefined} />}
    </section>

    <DataStatusBar
      cutoff={formatDate(latestObservation)}
      coverage={assignments.length ? `${confirmedIdentity} de ${assignments.length} asignaciones con identidad confirmada (${Math.round((coverage ?? 0) * 100)}%)` : 'Sin asignaciones activas'}
      issues={(assignmentResult.error ? 1 : 0) + pendingIdentity + staleAssignments}
      status={dataStatus}
    />
  </WorkspaceShell>
}
