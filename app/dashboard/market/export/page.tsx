import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { getMarketHouseIntelligence } from '@/lib/market-house-intelligence'
import { MarketPrintButton } from '@/components/market/market-print-button'

export const dynamic = 'force-dynamic'

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function number(value: number | null | undefined, digits = 0) {
  if (value == null) return 'No disponible'
  return digits ? decimal.format(value) : integer.format(value)
}

function date(input: string | null | undefined) {
  if (!input) return 'No disponible'
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime())
    ? 'No disponible'
    : new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export default async function MarketExportPage() {
  await requirePageCapability('market.read')
  const intelligence = await getMarketHouseIntelligence()
  const summary = intelligence.summary
  const generatedAt = new Date().toISOString()
  const missingCurrentNeighborhoods = summary.portalCurrentHouses !== null && summary.portalExactKmlHouses !== null
    ? Math.max(summary.portalCurrentHouses - summary.portalExactKmlHouses, 0)
    : null

  return <main className="mx-auto max-w-7xl bg-white p-4 text-neutral-900 sm:p-8 print:max-w-none print:p-0">
    <nav aria-label="Acciones del informe" className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/dashboard/market" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm"><ArrowLeft size={16} />Volver</Link>
      <div className="flex flex-wrap gap-2">
        <Link href="/api/market/export?dataset=summary&format=xlsx" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold"><Download size={16} />Resumen XLSX</Link>
        <Link href="/api/market/export?dataset=neighborhoods&format=xlsx" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold"><Download size={16} />Barrios XLSX</Link>
        <MarketPrintButton />
      </div>
    </nav>

    <header className="border-b-2 border-neutral-900 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Property Partners · Inteligencia de Mercado</p>
      <h1 className="mt-3 text-3xl font-semibold">Casas en Vitacura</h1>
      <p className="mt-2 text-sm text-neutral-600">Oferta Portal y ventas históricas CBRS. Los cortes se presentan por separado.</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="font-semibold">Generado</dt><dd>{date(generatedAt)}</dd></div>
        <div><dt className="font-semibold">Portal</dt><dd>{date(summary.portalAsOf)}</dd></div>
        <div><dt className="font-semibold">CBRS</dt><dd>{date(summary.cbrsAsOf)}</dd></div>
      </dl>
    </header>

    {intelligence.error ? <div role="alert" className="mt-5 border border-red-700 bg-red-50 p-4 text-sm text-red-900">Información no disponible.</div> : null}

    <section className="mt-7 break-inside-avoid">
      <h2 className="text-xl font-semibold">Resumen</h2>
      <dl className="mt-4 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Oferta activa', number(summary.portalActiveHouses)],
        ['Mediana oferta', `${number(summary.portalMedianPriceUf)} UF`],
        ['Oferta UF/m²', number(summary.portalMedianUfM2, 1)],
        ['Ventas registradas', number(summary.cbrsHouseTransactions)],
        ['Barrios KML', number(summary.kmlNeighborhoods)],
        ['Casas con KML', number(summary.exactKmlHouses)],
        ['Casas por revisar', number(summary.reviewHouses)],
        ['Ventas con barrio', number(summary.cbrsHouseWithNeighborhood)],
      ].map(([label, metric]) => <div key={label} className="bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-2 text-lg font-semibold">{metric}</dd></div>)}</dl>
    </section>

    <section className="mt-7 break-inside-avoid border border-amber-700 bg-amber-50 p-5">
      <h2 className="text-lg font-semibold">Cobertura de oferta</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{number(summary.portalExactKmlHouses)} de {number(summary.portalCurrentHouses)} avisos tienen barrio KML. Faltan {number(missingCurrentNeighborhoods)}. No se compara oferta por barrio.</p>
    </section>

    <section className="mt-7">
      <h2 className="text-xl font-semibold">Ventas registradas por barrio</h2>
      <p className="mt-2 text-sm text-neutral-600">Casas · CBRS · corte {date(summary.cbrsAsOf)}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead><tr className="border-y-2 border-neutral-900"><th className="p-2">Barrio</th><th className="p-2">Ventas</th><th className="p-2">Mediana UF</th><th className="p-2">UF/m² construido</th></tr></thead><tbody>{intelligence.neighborhoods.map((row) => <tr key={row.neighborhoodName} className="break-inside-avoid border-b border-neutral-300"><td className="p-2 font-medium">{row.neighborhoodName}</td><td className="p-2">{number(row.cbrsTransactions)}</td><td className="p-2">{number(row.cbrsMedianPriceUf)}</td><td className="p-2">{number(row.cbrsMedianUfM2, 1)}</td></tr>)}</tbody></table></div>
    </section>

    <section className="mt-7 break-inside-avoid border-t border-neutral-400 pt-5">
      <h2 className="text-xl font-semibold">Metodología</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
        <li>Alcance: casas en venta en Vitacura.</li>
        <li>Fuentes: Portal Inmobiliario, CBRS y KML Property Partners.</li>
        <li>Las ausencias no se completan con estimaciones.</li>
        <li>Las medianas históricas no reemplazan una valorización.</li>
      </ul>
    </section>

    <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">Generado {date(generatedAt)} · Property Partners</footer>
  </main>
}
