import Link from 'next/link'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'
import { createClient } from '@/lib/supabase/server'

function n(value: number) { return value.toLocaleString('es-CL') }
function formatDate(value: string | null) {
  if (!value) return 'Sin fecha registrada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-CL')
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

  const [{ count: activeListings, error: listingError }, { data: latestObservation, error: observationError }] = await Promise.all([
    supabase.from('market_current_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('market_current_listings').select('observed_at').order('observed_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const operationalError = listingError?.message || observationError?.message || null
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
      <div className="border border-dashed border-[var(--n3-line)] bg-[#0c1111] p-6 sm:p-8">
        <p className="text-lg font-semibold">Sin cartera individual materializada</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">La base actual no contiene una relación verificable entre propiedades y perfiles de ejecutiva. Por seguridad, esta vista no infiere asignaciones desde nombres, sucursales, publicaciones o actividad histórica.</p>
        {isSeller ? <p className="mt-4 text-xs text-[var(--n3-text-muted)]">Perfil activo: {profile?.full_name || 'Ejecutiva'} · la cartera aparecerá cuando exista una asignación explícita y auditada.</p> : null}
      </div>
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