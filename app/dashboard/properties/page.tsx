import Link from 'next/link'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'

function n(value: number) { return value.toLocaleString('es-CL') }

export default function PropertiesPage() {
  const source = valuation.sourceReconciliation
  const portalRows = market.cross.portal.reduce((sum, file) => sum + file.rows, 0)
  const missingCoordinates = market.cross.portal.reduce((sum, file) => sum + (file.coordinateQuality.both_missing || 0), 0)
  return <div className="mx-auto max-w-6xl space-y-6 pb-16">
    <header className="border border-[var(--n3-line)] bg-[#0c1111] p-8"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff766f]">Publicaciones · snapshot auditado</p><h1 className="mt-4 text-4xl font-semibold">Oferta Portal Vitacura</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Los IDs representan avisos, no propiedades físicas canónicas ni inventario activo. Un inmueble puede estar publicado por más de un corredor o mediante varios avisos.</p></header>
    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">{[
      ['Publicaciones con ID único', source.currentPortalValidListings], ['Sin señal explícita de arriendo', source.currentPortalSaleEligibleListings], ['Excluidas por señal de arriendo', source.portalListingsQuarantinedByRentIndicator],
    ].map(([label,value]) => <article key={label as string} className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label as string}</p><p className="mt-3 text-4xl font-semibold">{n(value as number)}</p></article>)}</section>
    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2"><article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cobertura geográfica</p><p className="mt-3 text-3xl font-semibold">{((missingCoordinates / portalRows) * 100).toFixed(1)}% sin coordenadas</p></article><article className="bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Vigencia</p><p className="mt-3 text-3xl font-semibold">Fecha efectiva n/d</p></article></section>
    <section className="border border-[#d7332b] bg-[#160d0c] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Control de procedencia</p><h2 className="mt-2 text-xl font-semibold">Detalle vivo separado</h2><p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">Las capturas vivas no alteran estos indicadores. Los faltantes permanecen `n/d` y cada muestra requiere validación antes de cualquier uso analítico.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/dashboard/market" className="bg-[#d7332b] px-4 py-2 text-xs font-semibold text-white">Ver inteligencia auditada</Link><Link href="/dashboard/sources" className="border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold">Capturas vivas</Link></div></section>
    <footer className="border-l-2 border-[#d7332b] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Base: {market.sourceInventory.files.filter((file) => file.role === 'published_offer').length} Excel de oferta publicada · IDs únicos entre archivos: {n(market.cross.portalCrossFileListingIds.uniqueAcrossFiles)}.</footer>
  </div>
}
