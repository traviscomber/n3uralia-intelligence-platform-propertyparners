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

  const [observationResult, assignmentResult] = await Promise.all([
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
  const actionableIdentity = canAssign ? pendingIdentity : 0
  const attentionCount = actionableIdentity + staleAssignments

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Propiedades"
      title="Mi cartera"
      meta={`${attentionCount} requieren atención`}
      actions={canAssign ? [{ label: 'Asignar propiedades', href: '/dashboard/properties/admin', primary: true }] : []}
    />

    <MetricStrip items={[
      { label: 'Asignadas', value: n(assignments.length) },
      ...(canAssign ? [{ label: 'Identidad pendiente', value: n(pendingIdentity), tone: pendingIdentity > 0 ? 'warning' as const : 'success' as const }] : []),
      { label: 'Revisar vigencia', value: n(staleAssignments), tone: staleAssignments > 0 ? 'warning' : 'success' },
    ]} />

    {attentionCount > 0 ? <section className="mt-5 max-w-5xl">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Qué requiere atención</h2>
        <span className="text-xs text-[var(--n3-text-muted)]">{Number(actionableIdentity > 0) + Number(staleAssignments > 0)}</span>
      </div>
      <div className="divide-y divide-[var(--n3-line)]">
        {actionableIdentity > 0 ? <Link href="/dashboard/properties/admin/identity" className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm hover:bg-white/[0.03]"><span>Resolver identidades pendientes</span><strong className="text-[#f0c96a]">{actionableIdentity}</strong></Link> : null}
        {staleAssignments > 0 ? <Link href="/dashboard/market" className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm hover:bg-white/[0.03]"><span>Verificar vigencia de cartera</span><strong className="text-[#f0c96a]">{staleAssignments}</strong></Link> : null}
      </div>
    </section> : null}

    <section className="mt-7 max-w-6xl">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Propiedades</h2><span className="text-xs text-[var(--n3-text-muted)]">{assignments.length}</span></div>
      {assignmentResult.error ? <OperationalState kind="error" title="No fue posible consultar la cartera" description="Reintente más tarde." /> : assignments.length ? <>
        <div className="divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)] md:hidden">
          {assignments.map((assignment) => {
            const property = assignment.market_properties[0] ?? null
            const area = property?.useful_area_m2 ?? property?.built_area_m2 ?? null
            const content = <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{property?.normalized_address || 'Sin dirección'}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{property?.property_type || 'Sin tipo'}{property?.bedrooms != null ? ` · ${property.bedrooms} dorm.` : ''}{area != null ? ` · ${area} m²` : ''}</p>
                </div>
                {property ? <span className="shrink-0 text-xs font-semibold text-[var(--n3-teal-soft)]">Abrir propiedad</span> : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div><dt className="text-[var(--n3-text-muted)]">Asignación</dt><dd className="mt-1 text-[var(--n3-text-light)]">{assignmentRole(assignment.assignment_role)}</dd></div>
                <div><dt className="text-[var(--n3-text-muted)]">Identidad</dt><dd className="mt-1 text-[var(--n3-text-light)]">{property?.identity_status === 'confirmed' ? 'Confirmada' : 'Pendiente'}</dd></div>
                <div className="col-span-2"><dt className="text-[var(--n3-text-muted)]">Última evidencia</dt><dd className="mt-1 text-[var(--n3-text-light)]">{formatDate(property?.last_seen_at ?? null)}</dd></div>
              </dl>
            </>
            return property ? <Link key={assignment.id} href={`/dashboard/properties/${property.id}`} className="block min-h-11 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{content}</Link> : <article key={assignment.id} className="py-4">{content}</article>
          })}
        </div>

        <div className="hidden overflow-x-auto border-y border-[var(--n3-line)] md:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="p-3 text-left">Propiedad</th><th className="p-3 text-left">Asignación</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right"></th></tr></thead>
            <tbody>{assignments.map((assignment) => {
              const property = assignment.market_properties[0] ?? null
              const area = property?.useful_area_m2 ?? property?.built_area_m2 ?? null
              return <tr key={assignment.id} className="border-t border-[var(--n3-line)]">
                <td className="p-3"><p className="font-medium">{property?.normalized_address || 'Sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Sin tipo'}{property?.bedrooms != null ? ` · ${property.bedrooms} dorm.` : ''}{area != null ? ` · ${area} m²` : ''}</p></td>
                <td className="p-3 text-[var(--n3-text-muted)]">{assignmentRole(assignment.assignment_role)}</td>
                <td className="p-3"><p>{property?.identity_status === 'confirmed' ? 'Confirmada' : 'Pendiente'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Evidencia {formatDate(property?.last_seen_at ?? null)}</p></td>
                <td className="p-3 text-right">{property ? <Link href={`/dashboard/properties/${property.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--n3-teal-soft)]">Abrir propiedad</Link> : null}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </> : <OperationalState kind="empty" title="Sin propiedades asignadas" description="No existen asignaciones activas para este perfil." action={canAssign ? { label: 'Asignar propiedades', href: '/dashboard/properties/admin' } : undefined} />}
    </section>

    <details className="mt-8 max-w-6xl">
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Estado de datos</summary>
      <DataStatusBar
        cutoff={formatDate(latestObservation)}
        coverage={assignments.length ? `${confirmedIdentity} de ${assignments.length} asignaciones con identidad confirmada (${Math.round((coverage ?? 0) * 100)}%)` : 'Sin asignaciones activas'}
        issues={(assignmentResult.error ? 1 : 0) + pendingIdentity + staleAssignments}
        status={dataStatus}
      />
    </details>
  </WorkspaceShell>
}