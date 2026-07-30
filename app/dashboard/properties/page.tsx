import Link from 'next/link'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'
import { createClient } from '@/lib/supabase/server'

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
  if (!value) return 'Sin fecha registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-CL')
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

  const activeListings = listingResult.count
  const latestObservation = observationResult.data
  const operationalError = listingResult.error?.message || observationResult.error?.message || null
  const assignmentError = assignmentResult.error?.message || null
  const assignments = (assignmentResult.data || []) as AssignedProperty[]
  const role = String(profile?.role || '').toLowerCase()
  const isSeller = role === 'seller'

  return <div className="mx-auto max-w-6xl space-y-8 pb-16">
    <header className="border-b border-[var(--n3-line)] pb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff766f]">Propiedades · evidencia diferenciada</p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Propiedades y publicaciones</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Esta sección separa la cartera asignada a una ejecutiva, las publicaciones observadas en la base operativa y el snapshot documental auditado. Ninguna publicación se presenta automáticamente como propiedad propia.</p>
    </header>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Cartera individual</p><h2 className="mt-2 text-2xl font-semibold">Mis propiedades asignadas</h2></div>
      {assignmentError ? <div className="border border-[#d7332b] bg-[#160d0c] p-5 text-sm text-[#ff766f]">No fue posible consultar la cartera asignada: {assignmentError}</div> : assignments.length ? <div className="grid gap-4 lg:grid-cols-2">
        {assignments.map((assignment) => {
          const property = assignment.market_properties[0] ?? null
          return <article key={assignment.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{assignmentRole(assignment.assignment_role)}</p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{property?.normalized_address || 'Dirección no normalizada'}</h3>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type || 'Tipo no informado'} · asignada {formatDate(assignment.assigned_at)}</p>
              </div>
              <span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--n3-teal)]">Activa</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-px bg-[var(--n3-line)] text-sm sm:grid-cols-4">
              <div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Superficie</p><p className="mt-1 font-semibold">{property?.useful_area_m2 ?? property?.built_area_m2 ?? 'n/d'} m²</p></div>
              <div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Dormitorios</p><p className="mt-1 font-semibold">{property?.bedrooms ?? 'n/d'}</p></div>
              <div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Baños</p><p className="mt-1 font-semibold">{property?.bathrooms ?? 'n/d'}</p></div>
              <div className="bg-black/30 p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Estacionamientos</p><p className="mt-1 font-semibold">{property?.parking_spaces ?? 'n/d'}</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">Identidad: {property?.identity_status || 'sin clasificar'} · última evidencia: {formatDate(property?.last_seen_at ?? null)}</p>
            {assignment.notes ? <p className="mt-3 border-l-2 border-[var(--n3-teal)] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">{assignment.notes}</p> : null}
          </article>
        })}
      </div> : <div className="border border-dashed border-[var(--n3-line)] bg-[#0c1111] p-6 sm:p-8">
        <p className="text-lg font-semibold">Sin propiedades asignadas</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">El modelo de cartera ya está habilitado y auditado, pero este perfil no tiene asignaciones activas. La plataforma no infiere cartera desde nombres, sucursales, publicaciones o actividad histórica.</p>
        {isSeller ? <p className="mt-4 text-xs text-[var(--n3-text-muted)]">Perfil activo: {profile?.full_name || 'Ejecutiva'}.</p> : null}
      </div>}
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Operación observada</p><h2 className="mt-2 text-2xl font-semibold">Publicaciones en Supabase</h2></div>
      {operationalError ? <div className="border border-[#d7332b] bg-[#160d0c] p-5 text-sm text-[#ff766f]">No fue posible consultar toda la base operativa: {operationalError}</div> : <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Publicaciones marcadas activas</p><p className="mt-3 text-4xl font-semibold">{n(activeListings ?? 0)}</p><p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Estado del último corte persistido; no equivale a disponibilidad confirmada hoy.</p></article>
        <article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Última observación</p><p className="mt-3 text-xl font-semibold sm:text-2xl">{formatDate(latestObservation?.observed_at ?? null)}</p><p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">La fecha de observación determina la vigencia; una ingestión posterior no actualiza por sí sola la publicación.</p></article>
      </div>}
      <div className="mt-4"><Link href="/dashboard/market" className="inline-flex border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold text-[var(--n3-text-light)] hover:border-[var(--n3-teal)]">Abrir inteligencia de mercado</Link></div>
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">03 · Snapshot documental</p><h2 className="mt-2 text-2xl font-semibold">Oferta Portal auditada</h2></div>
      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">{[
        ['Publicaciones con ID único', source.currentPortalValidListings],
        ['Sin señal explícita de arriendo', source.currentPortalSaleEligibleListings],
        ['Excluidas por señal de arriendo', source.portalListingsQuarantinedByRentIndicator],
      ].map(([label,value]) => <article key={label as string} className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label as string}</p><p className="mt-3 text-3xl font-semibold sm:text-4xl">{n(value as number)}</p></article>)}</div>
      <div className="mt-px grid gap-px bg-[var(--n3-line)] sm:grid-cols-2"><article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cobertura geográfica</p><p className="mt-3 text-2xl font-semibold sm:text-3xl">{portalRows > 0 ? ((missingCoordinates / portalRows) * 100).toFixed(1) : 'n/d'}% sin coordenadas</p></article><article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Vigencia documental</p><p className="mt-3 text-2xl font-semibold sm:text-3xl">Fecha efectiva n/d</p></article></div>
    </section>

    <footer className="border-l-2 border-[#d7332b] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Snapshot: {market.sourceInventory.files.filter((file) => file.role === 'published_offer').length} Excel de oferta publicada · IDs únicos entre archivos: {n(market.cross.portalCrossFileListingIds.uniqueAcrossFiles)}. Los IDs representan avisos, no inmuebles físicos confirmados.</footer>
  </div>
}
