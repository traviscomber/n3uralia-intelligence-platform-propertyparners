import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'
import { getOperationalMarketSnapshot } from '@/lib/market-operational'
import { MarketPrintButton } from '@/components/market/market-print-button'

export const dynamic = 'force-dynamic'

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function value(input: number | null | undefined, suffix = '') {
  return input == null ? 'No disponible' : `${decimal.format(input)}${suffix}`
}

function dateTime(input: string | null | undefined) {
  if (!input) return 'No disponible'
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? 'No disponible' : parsed.toLocaleString('es-CL')
}

export default async function MarketExportPage() {
  await requirePageCapability('market.read')
  const supabase = await createClient()
  const [snapshot, listingsResult, transactionsResult] = await Promise.all([
    getOperationalMarketSnapshot(),
    supabase
      .from('market_current_listings')
      .select('source_listing_id,status,title,normalized_address,price_uf,price_uf_m2,observed_at,url')
      .order('observed_at', { ascending: false })
      .limit(100),
    supabase
      .from('market_transactions')
      .select('event_key,rol,transaction_date,price_uf,price_uf_m2,description')
      .order('transaction_date', { ascending: false })
      .limit(100),
  ])

  const errors = [snapshot.error, listingsResult.error?.message, transactionsResult.error?.message].filter(Boolean)
  const listings = listingsResult.data ?? []
  const transactions = transactionsResult.data ?? []
  const generatedAt = new Date().toISOString()

  return <main className="mx-auto max-w-7xl bg-white p-4 text-neutral-900 sm:p-8 print:max-w-none print:p-0">
    <nav aria-label="Acciones del reporte" className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/dashboard/market" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={16} />Volver a mercado</Link>
      <div className="flex flex-wrap gap-2">
        <Link href="/api/market/export?dataset=listings&format=csv" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold"><Download size={16} />Listings CSV</Link>
        <Link href="/api/market/export?dataset=transactions&format=xlsx" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold"><Download size={16} />Transacciones XLSX</Link>
        <MarketPrintButton />
      </div>
    </nav>

    <header className="border-b-2 border-neutral-900 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Property Partners · Inteligencia de Mercado</p>
      <h1 className="mt-3 text-3xl font-semibold">Reporte operacional de mercado</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">Corte reproducido desde registros operativos visibles por RLS. Las publicaciones representan observaciones almacenadas y no confirman disponibilidad en tiempo real. Una publicación retirada no se interpreta automáticamente como venta.</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="font-semibold">Generado</dt><dd>{dateTime(generatedAt)}</dd></div>
        <div><dt className="font-semibold">Observado hasta</dt><dd>{dateTime(snapshot.latestObservedAt)}</dd></div>
        <div><dt className="font-semibold">Frescura</dt><dd>{snapshot.freshnessStatus} · {snapshot.observationAgeDays ?? 'n/d'} días</dd></div>
      </dl>
    </header>

    {errors.length ? <div role="alert" className="mt-5 border border-red-700 bg-red-50 p-4 text-sm text-red-900">Información incompleta: {errors.join(' · ')}</div> : null}

    <section className="mt-7 break-inside-avoid"><h2 className="text-xl font-semibold">1. Resumen del corte</h2><dl className="mt-4 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4">{[
      ['Propiedades candidatas', snapshot.canonicalProperties == null ? 'No disponible' : integer.format(snapshot.canonicalProperties)],
      ['Identidades confirmadas', snapshot.confirmedProperties == null ? 'No disponible' : integer.format(snapshot.confirmedProperties)],
      ['Publicaciones activas', snapshot.activeInventory == null ? 'No disponible' : integer.format(snapshot.activeInventory)],
      ['Ventas confirmadas', snapshot.confirmedSales == null ? 'No disponible' : integer.format(snapshot.confirmedSales)],
      ['Pendientes de revisión', snapshot.pendingMatches == null ? 'No disponible' : integer.format(snapshot.pendingMatches)],
      ['Registros sin barrio', snapshot.missingNeighborhoods == null ? 'No disponible' : integer.format(snapshot.missingNeighborhoods)],
      ['Velocidad de venta', value(snapshot.medianDaysOnMarket, ' días')],
      ['Absorción', snapshot.absorptionRate == null ? 'No disponible' : `${decimal.format(snapshot.absorptionRate * 100)}%`],
    ].map(([label, metric]) => <div key={label} className="bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-2 text-lg font-semibold">{metric}</dd></div>)}</dl></section>

    <section className="mt-7"><h2 className="text-xl font-semibold">2. Publicaciones observadas recientes</h2><p className="mt-2 text-sm text-neutral-600">Se muestran hasta 100 registros recientes. La exportación CSV/XLSX puede incluir hasta 25.000 filas y declara si el resultado fue truncado.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left text-xs"><thead><tr className="border-y-2 border-neutral-900"><th className="p-2">ID fuente</th><th className="p-2">Estado</th><th className="p-2">Propiedad</th><th className="p-2">Precio</th><th className="p-2">Observado</th><th className="p-2">Fuente</th></tr></thead><tbody>{listings.map((row) => <tr key={`${row.source_listing_id}-${row.observed_at}`} className="break-inside-avoid border-b border-neutral-300 align-top"><td className="p-2">{row.source_listing_id || 'No disponible'}</td><td className="p-2">{row.status || 'No disponible'}</td><td className="p-2"><p>{row.title || 'Sin título'}</p><p className="text-neutral-600">{row.normalized_address || 'Dirección no disponible'}</p></td><td className="p-2"><p>{row.price_uf == null ? 'UF no disponible' : `UF ${integer.format(row.price_uf)}`}</p><p>{row.price_uf_m2 == null ? 'UF/m² no disponible' : `${decimal.format(row.price_uf_m2)} UF/m²`}</p></td><td className="p-2">{dateTime(row.observed_at)}</td><td className="p-2">{row.url ? <a href={row.url} className="break-all underline">Abrir publicación</a> : 'No disponible'}</td></tr>)}</tbody></table></div>{!listings.length ? <div className="mt-4 border border-dashed border-neutral-400 p-5 text-sm text-neutral-600">No existen publicaciones visibles para este corte.</div> : null}</section>

    <section className="mt-7"><h2 className="text-xl font-semibold">3. Transacciones registradas recientes</h2><p className="mt-2 text-sm text-neutral-600">Sólo registros persistidos como transacciones. El reporte no deriva ventas desde retiros de publicaciones.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] border-collapse text-left text-xs"><thead><tr className="border-y-2 border-neutral-900"><th className="p-2">Evento</th><th className="p-2">ROL</th><th className="p-2">Fecha</th><th className="p-2">Precio</th><th className="p-2">Descripción</th></tr></thead><tbody>{transactions.map((row) => <tr key={row.event_key} className="break-inside-avoid border-b border-neutral-300 align-top"><td className="p-2">{row.event_key || 'No disponible'}</td><td className="p-2">{row.rol || 'No disponible'}</td><td className="p-2">{row.transaction_date || 'No disponible'}</td><td className="p-2"><p>{row.price_uf == null ? 'UF no disponible' : `UF ${integer.format(row.price_uf)}`}</p><p>{row.price_uf_m2 == null ? 'UF/m² no disponible' : `${decimal.format(row.price_uf_m2)} UF/m²`}</p></td><td className="p-2">{row.description || 'No disponible'}</td></tr>)}</tbody></table></div>{!transactions.length ? <div className="mt-4 border border-dashed border-neutral-400 p-5 text-sm text-neutral-600">No existen transacciones visibles para este corte.</div> : null}</section>

    <section className="mt-7 break-inside-avoid border-t border-neutral-400 pt-5"><h2 className="text-xl font-semibold">4. Metodología y limitaciones</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700"><li>Fuente: registros Supabase visibles para el usuario autenticado mediante RLS.</li><li>Período: último corte observado y snapshots materializados disponibles.</li><li>Ausencias: se mantienen como “No disponible”; no se completan con datos demostrativos.</li><li>Identidad: las propiedades candidatas no se consideran confirmadas hasta su conciliación.</li><li>Exportaciones: CSV y XLSX contienen fecha de generación, fecha observada, dataset y metodología.</li></ul></section>

    <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">Generado {dateTime(generatedAt)} · registros visibles según alcance del usuario</footer>
  </main>
}
