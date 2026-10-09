import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { createServiceClient } from '@/lib/supabase/service'
import { loadPedroMarketOverview } from '@/lib/market-pedro-overview'
import { MarketPrintButton } from '@/components/market/market-print-button'

export const dynamic = 'force-dynamic'

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimals = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function displayNumber(value: number | string | null | undefined) {
  if (value == null) return 'No disponible'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? number.format(parsed) : 'No disponible'
}
function displayUf(value: number | string | null | undefined) {
  return value == null ? 'No disponible' : 'UF ' + displayNumber(value)
}
function dateTime(value: string | null | undefined) {
  return value ? formatPropertyPartnersDateTime(value) : 'No disponible'
}
type RecentListing = {
  id: string
  source_listing_id: string | null
  title: string | null
  raw_address: string | null
  price_uf: number | string | null
  price_uf_m2: number | string | null
  observed_at: string | null
  url: string | null
}
type ListingGroup = { label: string; rows: RecentListing[] }

async function recentPortalListings(): Promise<{ categories: ListingGroup[]; error: boolean }> {
  const client = createServiceClient()
  const codes = [
    { code: 'portal-inmobiliario-vitacura-portal-houses', label: 'Casas' },
    { code: 'portal-inmobiliario-vitacura-portal-apartments', label: 'Departamentos' },
  ] as const
  const sources = await client.from('market_sources').select('id,code').in('code', codes.map((row) => row.code)).limit(2)
  if (sources.error) return { categories: [], error: true }
  const idByCode = new Map((sources.data ?? []).map((row) => [row.code, row.id]))
  const categories = await Promise.all(codes.map(async ({ code, label }): Promise<ListingGroup> => {
    const id = idByCode.get(code)
    if (!id) throw new Error('APPROVED_PORTAL_SOURCE_NOT_FOUND')
    const response = await client.from('market_current_listings')
      .select('id,source_listing_id,title,raw_address,price_uf,price_uf_m2,observed_at,url')
      .eq('source_id', id)
      .eq('status', 'active')
      .is('removed_at', null)
      .gt('price_uf', 0)
      .order('observed_at', { ascending: false })
      .limit(25)
    if (response.error) throw response.error
    return { label, rows: (response.data ?? []) as RecentListing[] }
  })).catch(() => null)
  return categories ? { categories, error: false } : { categories: [], error: true }
}

function safePortalUrl(raw: string | null) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && ['www.portalinmobiliario.com', 'portalinmobiliario.com'].includes(url.hostname.toLowerCase())
      ? url.toString() : null
  } catch {
    return null
  }
}

export default async function MarketExportPage() {
  await requirePageCapability('market.read')
  const [market, published] = await Promise.all([
    loadPedroMarketOverview(),
    recentPortalListings(),
  ])
  const generatedAt = new Date().toISOString()
  const latest = market.lastCompleteYear

  return <main className="mx-auto max-w-6xl bg-white p-4 text-neutral-900 sm:p-8 print:max-w-none print:p-0">
    <nav aria-label="Acciones del informe" className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/dashboard/market" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm">
        <ArrowLeft size={16} aria-hidden="true" /> Volver a Mercado
      </Link>
      <div className="flex flex-wrap gap-2">
        <Link href="/api/market/export?dataset=listings&format=xlsx" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold">
          <Download size={16} aria-hidden="true" /> Avisos observados XLSX
        </Link>
        <Link href="/api/market/export?dataset=summary&format=xlsx" className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 py-2 text-sm font-semibold">
          <Download size={16} aria-hidden="true" /> Indicadores XLSX
        </Link>
        <MarketPrintButton />
      </div>
    </nav>

    <header className="border-b-2 border-neutral-900 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.15em]">Property Partners · Inteligencia inmobiliaria</p>
      <h1 className="mt-3 text-3xl font-semibold">Informe de mercado · Vitacura</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        Casas y departamentos en venta. Oferta publicada, novedades observadas y compraventas registradas son conjuntos diferentes; cada cifra mantiene su fecha y fuente.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-neutral-600">Generado</dt><dd className="font-medium">{dateTime(generatedAt)}</dd></div>
        <div><dt className="text-xs text-neutral-600">Última actualización diaria</dt><dd className="font-medium">{market.categories.every((category) => category.daily.current) ? 'Ambas categorías actualizadas hoy' : 'Consultar estado por categoría'}</dd></div>
        <div><dt className="text-xs text-neutral-600">Cobertura territorial</dt><dd className="font-medium">{displayNumber(market.kmlNeighborhoods)} barrios oficiales · KML PP</dd></div>
      </dl>
    </header>

    <section className="mt-7 break-inside-avoid">
      <h2 className="text-xl font-semibold">1. Oferta publicada y nuevas incorporaciones</h2>
      <p className="mt-2 text-sm text-neutral-600">El inventario corresponde al último recorrido completo verificado; las incorporaciones son la primera aparición de cada aviso durante el día en Chile.</p>
      <div className="mt-4 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2">
        {market.categories.map((category) => <article key={category.type} className="bg-white p-5">
          <h3 className="text-lg font-semibold">{category.name}</h3>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{displayNumber(category.group?.inventoryCount)}</p>
          <p className="text-xs text-neutral-600">Avisos del inventario completo</p>
          <p className="mt-3 text-sm font-medium">Nuevos hoy: {displayNumber(category.group?.addedTodayCount)}</p>
          <p className="mt-1 text-xs text-neutral-600">Delta diario: {dateTime(category.daily.updatedAt)}</p>
          <p className="mt-1 text-xs text-neutral-600">Inventario completo: {dateTime(category.group?.inventoryAt)}</p>
        </article>)}
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {market.categories.map((category) => <div key={category.type} className="min-w-0">
          <h3 className="border-b border-neutral-300 pb-2 text-sm font-semibold">{category.type === 'casas' ? 'Nuevas casas' : 'Nuevos departamentos'}</h3>
          {category.group?.additionsUnavailable || !category.group
            ? <p className="py-3 text-sm text-neutral-600">Sin verificación del día.</p>
            : category.group.addedToday.length === 0
              ? <p className="py-3 text-sm text-neutral-600">Sin incorporaciones nuevas registradas.</p>
              : <div className="divide-y divide-neutral-200">
                  {category.group.addedToday.map((row) => <div key={row.id} className="break-inside-avoid py-3 text-sm">
                    <p className="font-medium">{row.title}</p>
                    <p className="mt-1 text-xs text-neutral-600">{row.address || 'Dirección pendiente'}</p>
                    <p className="mt-1 font-semibold">{displayUf(row.priceUf)}</p>
                    <p className="text-xs text-neutral-600">Incorporado {dateTime(row.addedAt)}</p>
                  </div>)}
                </div>}
        </div>)}
      </div>
    </section>

    <section className="mt-8 break-inside-avoid">
      <h2 className="text-xl font-semibold">2. Compraventas registradas · CBRS</h2>
      <p className="mt-2 text-sm text-neutral-600">Últimos cuatro años completos ({latest - 3}–{latest}). Fuente CBRS Vitacura, con eventos residenciales deduplicados por inscripción. Estacionamientos y bodegas no se suman como ventas independientes.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b-2 border-neutral-900"><tr><th className="p-2">Tipo</th><th className="p-2">Año</th><th className="p-2 text-right">Compraventas</th><th className="p-2 text-right">Mediana cierre (UF)</th><th className="p-2 text-right">Mediana UF/m²</th></tr></thead>
          <tbody>
            {market.cbrsHistory.map((row) => <tr key={row.propertyType+'-'+row.year} className="border-b border-neutral-200">
              <td className="p-2">{row.propertyType === 'Casa' ? 'Casas' : 'Departamentos'}</td>
              <td className="p-2 tabular-nums">{row.year}</td>
              <td className="p-2 text-right tabular-nums">{displayNumber(row.transactions)}</td>
              <td className="p-2 text-right tabular-nums">{displayNumber(row.medianPriceUf)}</td>
              <td className="p-2 text-right tabular-nums">{row.medianUfM2 == null ? '—' : decimals.format(row.medianUfM2)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {market.historyUnavailable ? <p role="alert" className="mt-2 text-sm text-red-700">La serie CBRS no pudo verificarse completamente.</p> : null}
      <p className="mt-2 text-xs text-neutral-600">Última fecha de la fuente: {market.cbrsSourceEnd ?? 'No disponible'}. Una publicación retirada no demuestra una compraventa.</p>
    </section>

    <section className="mt-8">
      <h2 className="text-xl font-semibold">3. Publicaciones observadas recientemente</h2>
      <p className="mt-2 text-sm text-neutral-600">Hasta 25 publicaciones activas con precio por tipo de propiedad. El XLSX descarga registros activos observados, que pueden diferir del último inventario completo verificado. No se mezclan casas y departamentos.</p>
      {published.error ? <p role="alert" className="mt-4 text-sm text-red-700">No se pudo consultar el detalle. Los datos incompletos no se presentan como definitivos.</p> : null}
      {published.categories.map((category) => <div key={category.label} className="mt-5">
        <h3 className="text-base font-semibold">{category.label}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="border-b border-neutral-800"><tr>
              <th className="p-2">Publicación</th><th className="p-2">Dirección</th><th className="p-2 text-right">Precio UF</th><th className="p-2 text-right">UF/m²</th><th className="p-2">Observada</th><th className="p-2">Fuente</th>
            </tr></thead>
            <tbody>
              {category.rows.map((row) => <tr key={row.id} className="break-inside-avoid border-b border-neutral-200 align-top">
                <td className="p-2">{row.title || row.source_listing_id || 'Publicación'}</td>
                <td className="p-2">{row.raw_address || 'Dirección pendiente'}</td>
                <td className="p-2 text-right tabular-nums">{displayNumber(row.price_uf)}</td>
                <td className="p-2 text-right tabular-nums">{row.price_uf_m2 == null ? '—' : decimals.format(Number(row.price_uf_m2))}</td>
                <td className="p-2">{dateTime(row.observed_at)}</td>
                <td className="p-2">{safePortalUrl(row.url) ? <a className="underline" href={safePortalUrl(row.url)!} target="_blank" rel="noopener noreferrer">Abrir aviso</a> : '—'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>)}
    </section>

    <section className="mt-8 break-inside-avoid border-t border-neutral-400 pt-5">
      <h2 className="text-xl font-semibold">4. Fuentes y metodología</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Portal Inmobiliario: anuncios de venta de Vitacura, agrupados por su identificador de fuente. CBRS: compraventas residenciales canónicas; no se agregan filas físicas de estacionamiento o bodega como ventas principales. KML Property Partners: límites de los barrios. Las métricas proceden de fuentes verificadas y no se extrapolan capturas parciales.
      </p>
      <p className="mt-3 text-sm leading-6 text-neutral-700">Los precios de publicación son expectativas de oferta; los precios CBRS corresponden a cierres históricos y no representan el mercado de hoy. No se calcula absorción ni días en mercado sin evidencia suficiente.</p>
    </section>

    <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">Generado {dateTime(generatedAt)} · Informe de lectura · Vitacura</footer>
  </main>
}
