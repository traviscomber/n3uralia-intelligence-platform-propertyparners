import Link from 'next/link'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'
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
  if (!value) return 'N/D'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'N/D' : date.toLocaleDateString('es-CL')
}
function assignmentRole(value: string) {
  if (value === 'owner') return 'Responsable principal'
  if (value === 'co_broker') return 'Corretaje compartido'
  if (value === 'support') return 'Apoyo comercial'
  return value
}

export default async function PropertiesPage() {
  const source = valuation.sourceReconciliation
  const portalRows = market.cross.portal.reduce((sum, file) => sum + file.rows, 0)
  const missingCoordinates = market.cross.portal.reduce((sum, file) => sum + (file.coordinateQuality.both_missing || 0), 0)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle()
    : { data: null }

  const role = String(profile?.role || '').toLowerCase()
  const hasGlobalView = role === 'ceo' || role === 'admin'
  const isSeller = role === 'seller'

  let assignmentQuery = supabase
    .from('property_assignments')
    .select('id,assignment_role,status,assigned_at,notes,market_properties(id,normalized_address,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces,identity_status,last_seen_at)')
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })

  if (!hasGlobalView && user) assignmentQuery = assignmentQuery.eq('assigned_to', user.id)

  const [listingResult, observationResult, assignmentResult] = await Promise.all([
    supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('market_current_listings').select('observed_at').order('observed_at', { ascending: false }).limit(1).maybeSingle(),
    user ? assignmentQuery : Promise.resolve({ data: [], error: null }),
  ])

  const assignments = (assignmentResult.data || []) as AssignedProperty[]
  const activeListings = listingResult.count
  const latestObservation = observationResult.data
  const operationalUnavailable = Boolean(listingResult.error || observationResult.error)
  const assignmentsUnavailable = Boolean(assignmentResult.error)
  const identityPending = assignments.filter((item) => {
    const status = item.market_properties[0]?.identity_status
    return !status || !['confirmed', 'verified'].includes(status)
  }).length
  const staleAssignments = assignments.filter((item) => {
    const lastSeen = item.market_properties[0]?.last_seen_at
    if (!lastSeen) return true
    return Date.now() - new Date(lastSeen).getTime() > 30 * 24 * 60 * 60 * 1000
  }).length
  const missingGeoPct = portalRows > 0 ? (missingCoordinates / portalRows) * 100 : null

  return <div className="mx-auto max-w-6xl space-y-8 pb-16">
    <header className="border-b border-[var(--n3-line)] pb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff766f]">Propiedades y cartera</p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Estado de la cartera</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Datos para decidir: cartera activa, vigencia, problemas de identidad y acciones pendientes. La metodología y trazabilidad quedan disponibles al final.</p>
    </header>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Lo que debe saber hoy</p><h2 className="mt-2 text-2xl font-semibold">Resumen ejecutivo</h2></div>
      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Propiedades asignadas</p><p className="mt-3 text-4xl font-semibold">{assignmentsUnavailable ? 'N/D' : n(assignments.length)}</p><p className="mt-3 text-xs text-[var(--n3-text-muted)]">{hasGlobalView ? 'Vista global de asignaciones activas.' : 'Asignaciones activas de este perfil.'}</p></article>
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Identidad pendiente</p><p className="mt-3 text-4xl font-semibold text-[#ff766f]">{assignmentsUnavailable ? 'N/D' : n(identityPending)}</p><p className="mt-3 text-xs text-[var(--n3-text-muted)]">Requieren validación antes de usarse como cartera confirmada.</p></article>
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Sin evidencia reciente</p><p className="mt-3 text-4xl font-semibold text-[#f6c453]">{assignmentsUnavailable ? 'N/D' : n(staleAssignments)}</p><p className="mt-3 text-xs text-[var(--n3-text-muted)]">Sin observación confirmada durante los últimos 30 días.</p></article>
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Publicaciones activas</p><p className="mt-3 text-4xl font-semibold">{operationalUnavailable ? 'N/D' : n(activeListings ?? 0)}</p><p className="mt-3 text-xs text-[var(--n3-text-muted)]">Última observación: {formatDate(latestObservation?.observed_at ?? null)}.</p></article>
      </div>
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Decisiones pendientes</p><h2 className="mt-2 text-2xl font-semibold">Qué requiere acción</h2></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-[#d7332b] bg-[#0c1111] p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ff766f]">Validar identidad</p><p className="mt-3 text-2xl font-semibold">{identityPending} propiedades</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">No deben presentarse como cartera confirmada hasta cerrar su identidad.</p><Link href="/dashboard/properties/admin" className="mt-4 inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold hover:border-[#ff766f]">Revisar asignaciones</Link></article>
        <article className="border border-[#a77a22] bg-[#0c1111] p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f6c453]">Actualizar vigencia</p><p className="mt-3 text-2xl font-semibold">{staleAssignments} propiedades</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Necesitan una observación reciente antes de contacto, comparación o decisión comercial.</p><Link href="/dashboard/market" className="mt-4 inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold hover:border-[#f6c453]">Abrir mercado</Link></article>
        <article className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mejorar cobertura</p><p className="mt-3 text-2xl font-semibold">{missingGeoPct === null ? 'N/D' : `${missingGeoPct.toFixed(1)}%`}</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Publicaciones del snapshot sin coordenadas para análisis geográfico.</p><Link href="/dashboard/sources" className="mt-4 inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold hover:border-[var(--n3-teal)]">Revisar fuentes</Link></article>
      </div>
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">03 · Cartera visible</p><h2 className="mt-2 text-2xl font-semibold">Propiedades asignadas</h2></div>
      {assignmentsUnavailable ? <OperationalState kind="error" title="No fue posible consultar la cartera" description="La plataforma no muestra información parcial como si estuviera completa." /> : assignments.length ? <div className="grid gap-4 lg:grid-cols-2">
        {assignments.map((assignment) => {
          const property = assignment.market_properties[0] ?? null
          const verified = property?.identity_status && ['confirmed', 'verified'].includes(property.identity_status)
          return <article key={assignment.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{assignmentRole(assignment.assignment_role)}</p><h3 className="mt-2 text-lg font-semibold">{property?.normalized_address || 'Dirección pendiente'}</h3><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipo N/D'} · asignada {formatDate(assignment.assigned_at)}</p></div><span className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${verified ? 'border-[#2f8f4e] text-[#65c780]' : 'border-[#d7332b] text-[#ff766f]'}`}>{verified ? 'Verificada' : 'Pendiente'}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-px bg-[var(--n3-line)] text-sm sm:grid-cols-4"><div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Superficie</p><p className="mt-1 font-semibold">{property?.useful_area_m2 ?? property?.built_area_m2 ?? 'N/D'} m²</p></div><div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Dormitorios</p><p className="mt-1 font-semibold">{property?.bedrooms ?? 'N/D'}</p></div><div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Baños</p><p className="mt-1 font-semibold">{property?.bathrooms ?? 'N/D'}</p></div><div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Última evidencia</p><p className="mt-1 font-semibold">{formatDate(property?.last_seen_at ?? null)}</p></div></div>
            {assignment.notes ? <p className="mt-4 border-l-2 border-[var(--n3-teal)] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">{assignment.notes}</p> : null}
          </article>
        })}
      </div> : <OperationalState kind="empty" title="Sin propiedades asignadas" description="No existen asignaciones activas para este alcance." action={isSeller ? undefined : { label: 'Administrar asignaciones', href: '/dashboard/properties/admin' }} />}
    </section>

    <details className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><summary className="cursor-pointer text-sm font-semibold">Ver metodología y trazabilidad</summary><div className="mt-4 space-y-2 text-xs leading-5 text-[var(--n3-text-muted)]"><p>Publicaciones con ID único: {n(source.currentPortalValidListings)}.</p><p>Sin señal explícita de arriendo: {n(source.currentPortalSaleEligibleListings)}.</p><p>Excluidas por señal de arriendo: {n(source.portalListingsQuarantinedByRentIndicator)}.</p><p>Los IDs representan publicaciones observadas; no prueban por sí solos la existencia de inmuebles físicos distintos.</p></div></details>
  </div>
}
