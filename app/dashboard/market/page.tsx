import Link from 'next/link'
import market from '@/data/market-source-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'

function n(value: number) { return value.toLocaleString('es-CL') }

export default function MarketPage() {
  const portalFiles = market.cross.portal
  const cbrs = market.cross.cbrs
  const reconciliation = valuation.sourceReconciliation
  const portalAssignments = new Map<string, number>()
  for (const file of portalFiles) {
    for (const [barrio, count] of Object.entries(file.kmlPolygonAssignments)) {
      portalAssignments.set(barrio, (portalAssignments.get(barrio) || 0) + count)
    }
  }
  const topPortalBarrios = [...portalAssignments.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const cbrsBarrios = cbrs.categories.BARRIO.filter(([name]) => name !== '<NULL>').slice(0, 10)

  return <div className="mx-auto max-w-[1600px] space-y-7 pb-16">
    <header className="border border-[var(--n3-line)] bg-[#0c1111] p-8 lg:p-10">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ff766f]">Mercado · fuente auditada</p><h1 className="mt-4 text-4xl font-semibold text-[var(--n3-text-light)]">Inteligencia de Mercado Vitacura</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Oferta publicada, ventas registrales y territorio se mantienen como universos separados. No se muestran absorción, velocidad ni UF/m² porque esas métricas no están respaldadas por el paquete auditado vigente.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/dashboard/market/fuentes" className="border border-[#d7332b] bg-[#d7332b] px-4 py-2 text-xs font-semibold text-white">Fuentes y trazabilidad</Link><Link href="/dashboard/valorizador" className="border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold text-[var(--n3-text-light)]">Abrir valorizador</Link></div>
      </div>
    </header>

    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Publicaciones únicas', n(reconciliation.currentPortalValidListings), 'IDs únicos en los tres Excel Portal'],
        ['Elegibles para venta', n(reconciliation.currentPortalSaleEligibleListings), 'Universo usado por valorización'],
        ['En cuarentena', n(reconciliation.portalListingsQuarantinedByRentIndicator), 'Señal explícita de arriendo'],
        ['Inscripciones CBRS', n(reconciliation.currentCbrsRows), 'Registros de ventas registrales'],
      ].map(([label, value, detail]) => <article key={label} className="bg-[#0c1111] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-3 text-3xl font-semibold text-[var(--n3-text-light)]">{value}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{detail}</p></article>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <article className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Oferta publicada</p><h2 className="mt-2 text-xl font-semibold">Asignación territorial reproducible</h2><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Conteo de publicaciones con coordenadas asignadas a un único polígono KML. No representa inventario total por barrio.</p></div>
        <div>{topPortalBarrios.map(([name, count], index) => <div key={name} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[var(--n3-line)] px-5 py-3 last:border-0"><span className="text-xs text-[#ff766f]">{String(index + 1).padStart(2, '0')}</span><span className="text-sm">{name}</span><strong className="text-sm">{n(count)}</strong></div>)}</div>
      </article>
      <article className="border border-[var(--n3-line)] bg-[#0c1111]">
        <div className="border-b border-[var(--n3-line)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Registro CBRS</p><h2 className="mt-2 text-xl font-semibold">Inscripciones por barrio asignado</h2><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Conteo histórico del archivo registral. No equivale a oferta vigente ni a publicaciones Portal.</p></div>
        <div>{cbrsBarrios.map(([name, count], index) => <div key={name} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[var(--n3-line)] px-5 py-3 last:border-0"><span className="text-xs text-[#ff766f]">{String(index + 1).padStart(2, '0')}</span><span className="text-sm">{name}</span><strong className="text-sm">{n(Number(count))}</strong></div>)}</div>
      </article>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <article className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Territorio</p><h2 className="mt-2 text-xl font-semibold">{market.kml.geometryAudit.polygonCount} polígonos auditados</h2><p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">El KML contiene {market.kml.geometryAudit.areaOverlapCandidates.length} pares candidatos a superposición o contención y {market.kml.geometryAudit.boundaryContacts.length} contactos de borde. Estas condiciones permanecen visibles y no se resuelven artificialmente.</p><div className="mt-5 flex flex-wrap gap-2">{Object.keys(market.kml.geometryAudit.ringCounts).map((name) => <span key={name} className="border border-[var(--n3-line)] px-2.5 py-1 text-[11px] text-[var(--n3-text-muted)]">{name}</span>)}</div></article>
      <article className="border border-[#d7332b] bg-[#160d0c] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Métricas retiradas</p><h2 className="mt-2 text-xl font-semibold">La vista anterior no era publicable</h2><ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--n3-text-muted)]"><li>• 84 UF/m² promedio.</li><li>• 50 días de velocidad.</li><li>• 472 propiedades de inventario.</li><li>• Absorción promedio y ranking de oportunidad.</li><li>• Recomendaciones automáticas por barrio.</li></ul><p className="mt-4 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">Esos valores provenían de tablas operativas heredadas, no de los archivos auditados. Se retiraron sin reemplazarlos por estimaciones.</p></article>
    </section>

    <footer className="border-l-2 border-[#d7332b] bg-[#0c1111] p-5 text-xs leading-5 text-[var(--n3-text-muted)]">Fuente: {market.sourceInventory.fileCount} archivos de mercado · manifiesto de {n(market.sourceInventory.cellManifest.cellCount)} celdas · generado {new Date(market.generatedAt).toLocaleString('es-CL')}. Los Excel originales permanecen inmutables y fuera de Git.</footer>
  </div>
}
