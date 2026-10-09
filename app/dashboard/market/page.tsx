import Link from 'next/link'
import { ArrowRight, ExternalLink, FileText, MapPinned } from 'lucide-react'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { loadPedroMarketOverview, type PedroMarketCategory } from '@/lib/market-pedro-overview'
import { verifiableChange, type AnnualCbrsMeasure, type CbrsPropertyType } from '@/lib/market-pedro-history'

const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const smallDecimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
function count(value: number | null | undefined) {
  return value == null ? '—' : whole.format(value)
}
function uf(value: number | null | undefined) {
  return value == null ? '—' : 'UF ' + whole.format(value)
}
function signedPercent(value: number | null) {
  if (value === null) return '—'
  return (value > 0 ? '+' : '') + smallDecimal.format(value * 100) + '%'
}
function stamp(value: string | null | undefined) {
  return value ? formatPropertyPartnersDateTime(value) : '—'
}
function yearMeasure(rows: AnnualCbrsMeasure[], type: CbrsPropertyType, year: number) {
  return rows.find((row) => row.propertyType === type && row.year === year)
}

function PortalTypeCard({
  category, allowInventory,
}: {
  category: PedroMarketCategory
  allowInventory: boolean
}) {
  const typeLabel = category.type
  const offer = category.group
  return <article className="flex min-w-0 flex-col border-t border-[var(--n3-line)] pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-xl font-semibold tracking-tight text-[var(--n3-text-light)]">{category.name}</h3>
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Portal Inmobiliario · Venta</span>
    </div>
    <p className="mt-6 text-[clamp(2.4rem,5vw,3.65rem)] font-semibold leading-none tabular-nums tracking-tight">
      {count(offer?.inventoryCount)}
    </p>
    <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Avisos del último inventario completo verificado</p>
    <div className="mt-4 space-y-1 text-xs text-[var(--n3-text-muted)]">
      <p className={category.daily.current ? 'text-[var(--n3-text-light)]' : 'text-[#f0c96a]'}>
        {category.daily.updatedAt
          ? 'Actualizado ' + stamp(category.daily.updatedAt)
          : 'Actualización diaria pendiente'}
      </p>
      <p>{offer?.inventoryAt ? 'Inventario verificado ' + stamp(offer.inventoryAt) : 'Inventario completo no disponible'}</p>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--n3-line)] pt-4">
      <a href="#nuevos-hoy" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--n3-text-light)] hover:text-[var(--n3-teal-soft)]">
        <strong className="text-xl font-semibold tabular-nums">{count(offer?.addedTodayCount)}</strong>
        <span className="text-xs">nuevos hoy</span>
      </a>
      {allowInventory ? <Link href={'/dashboard/market/oferta?tipo=' + typeLabel + '#inventario'} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)] hover:underline">
        Ver {category.name.toLowerCase()} <ArrowRight size={15} aria-hidden="true" />
      </Link> : null}
    </div>
  </article>
}

function YearlyTrend({
  type, name, rows, lastYear,
}: {
  type: CbrsPropertyType
  name: string
  rows: AnnualCbrsMeasure[]
  lastYear: number
}) {
  const years = rows.filter((row) => row.propertyType === type)
  const confirmed = years.map((row) => row.transactions).filter((value): value is number => value !== null)
  const largest = Math.max(0, ...confirmed)
  const latest = yearMeasure(rows, type, lastYear)
  const earlier = yearMeasure(rows, type, lastYear - 1)
  const salesChange = verifiableChange(latest?.transactions ?? null, earlier?.transactions ?? null)
  const priceChange = verifiableChange(latest?.medianPriceUf ?? null, earlier?.medianPriceUf ?? null)

  return <article className="min-w-0 border-t border-[var(--n3-line)] pt-5">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-xs text-[var(--n3-text-muted)]">Variación anual <strong className="ml-1 font-semibold text-[var(--n3-text-light)]">{signedPercent(salesChange)}</strong></p>
    </div>
    <div className="mt-5" role="img" aria-label={'Evolución anual de compraventas CBRS, ' + name.toLowerCase() + ': ' + years.map((row) => row.year + ' ' + (row.transactions === null ? 'sin datos' : row.transactions)).join(', ')}>
      <svg viewBox="0 0 480 138" className="h-auto w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <line x1="30" y1="118" x2="452" y2="118" stroke="var(--n3-line)" strokeWidth="1" />
        <line x1="30" y1="72" x2="452" y2="72" stroke="var(--n3-line)" strokeWidth="1" strokeDasharray="4 7" />
        {years.map((row, index) => {
          const previous = index > 0 ? years[index - 1] : null
          const x = 42 + index * 130
          const previousX = x - 130
          const y = row.transactions !== null && largest > 0
            ? 118 - (row.transactions / largest) * 94
            : null
          const previousY = previous?.transactions !== null && previous?.transactions !== undefined && largest > 0
            ? 118 - (previous.transactions / largest) * 94
            : null
          const color = type === 'Casa' ? 'var(--n3-text-light)' : 'var(--n3-teal-soft)'
          return <g key={row.year}>
            {previous && y !== null && previousY !== null ? <line x1={previousX} y1={previousY} x2={x} y2={y} stroke={color} strokeWidth="2.4" strokeLinecap="round" /> : null}
            {y !== null ? <circle cx={x} cy={y} r="5" stroke="var(--n3-black)" strokeWidth="2" fill={color} /> : null}
          </g>
        })}
      </svg>
      <div className="grid grid-cols-4 gap-2">
        {years.map((row) => <div key={row.year} className="min-w-0">
          <p className="text-[11px] tabular-nums text-[var(--n3-text-muted)]">{row.year}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{count(row.transactions)}</p>
        </div>)}
      </div>
    </div>
    <div className="mt-6 border-t border-[var(--n3-line)] pt-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Mediana de precio de cierre · {lastYear}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{uf(latest?.medianPriceUf)}</p>
      <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Variación frente al año anterior: {signedPercent(priceChange)}</p>
    </div>
  </article>
}

export default async function MarketPage() {
  const scope = await requireUserScope()
  const canExploreInventory = hasCapability(scope.role, 'market.manage_sources')
    || hasCapability(scope.role, 'management.global.read')
    || hasCapability(scope.role, 'management.office.read')
  const canMap = hasCapability(scope.role, 'market.manage_sources') || hasCapability(scope.role, 'management.global.read')
  const canCompare = hasCapability(scope.role, 'valuations.self.create')
    || hasCapability(scope.role, 'valuations.office.review')
    || hasCapability(scope.role, 'valuations.global.approve')
  const market = await loadPedroMarketOverview()
  const newTotal = market.categories.every((category) => category.group?.addedTodayCount != null)
    ? market.categories.reduce((sum, category) => sum + (category.group?.addedTodayCount ?? 0), 0)
    : null
  const updatedBoth = market.categories.every((category) => category.daily.current)
  const dateLabel = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(market.day + 'T12:00:00Z'))
  const yearRange = (market.lastCompleteYear - 3) + '–' + market.lastCompleteYear
  const latestYear = market.lastCompleteYear

  return <WorkspaceShell contentClassName="max-w-[1250px]">
    <WorkspaceHeader
      eyebrow="Inteligencia inmobiliaria"
      title="Mercado de Vitacura"
      meta="Casas y departamentos · Propiedades en venta"
      actions={[
        ...(canExploreInventory ? [{ label: 'Explorar oferta', href: '/dashboard/market/oferta', primary: true }] : []),
        { label: 'Informe de mercado', href: '/dashboard/market/export', icon: <FileText size={15} aria-hidden="true" /> },
      ]}
    />

    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[var(--n3-line)] pb-4 text-xs">
      <p className={updatedBoth ? 'font-medium text-[var(--n3-text-light)]' : 'text-[#f0c96a]'}>
        {updatedBoth ? 'Portal actualizado hoy' : 'Revisa la última actualización de cada categoría'}
      </p>
      <nav aria-label="Secciones de Mercado" className="flex flex-wrap gap-x-5 gap-y-2 text-[var(--n3-text-muted)]">
        <a href="#oferta" className="hover:text-[var(--n3-teal-soft)]">Oferta</a>
        <a href="#nuevos-hoy" className="hover:text-[var(--n3-teal-soft)]">Nuevos de hoy</a>
        <a href="#ventas" className="hover:text-[var(--n3-teal-soft)]">Compraventas</a>
        <a href="#evolucion" className="hover:text-[var(--n3-teal-soft)]">Evolución</a>
        <a href="#barrios" className="hover:text-[var(--n3-teal-soft)]">Barrios</a>
      </nav>
    </div>

    <section id="oferta" aria-labelledby="oferta-title" className="mt-8 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">01 · Portal Inmobiliario</p>
          <h2 id="oferta-title" className="mt-2 text-2xl font-semibold tracking-tight">Oferta publicada</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[var(--n3-text-muted)]">Dos inventarios independientes. La actualización diaria y la revisión completa se muestran por separado.</p>
      </div>
      <div className="mt-4 grid gap-x-9 gap-y-8 md:grid-cols-2">
        {market.categories.map((category) => <PortalTypeCard key={category.type} category={category} allowInventory={canExploreInventory} />)}
      </div>
    </section>

    <section id="nuevos-hoy" aria-labelledby="new-title" className="mt-12 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">02 · Incorporaciones</p>
          <h2 id="new-title" className="mt-2 text-2xl font-semibold tracking-tight">Nuevos de hoy</h2>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{dateLabel} · Primera vez que el aviso aparece en nuestros registros.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-semibold tabular-nums">{count(newTotal)}</p>
          <p className="text-xs text-[var(--n3-text-muted)]">Incorporaciones confirmadas</p>
        </div>
      </div>
      <div className="grid gap-x-9 gap-y-8 pt-4 md:grid-cols-2">
        {market.categories.map((category) => <section key={category.type} aria-label={'Nuevas ' + category.name.toLowerCase()} className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold">{category.name}</h3>
            <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{count(category.group?.addedTodayCount)} nuevas</span>
          </div>
          {!category.group || category.group.additionsUnavailable
            ? <p role="status" className="mt-4 border-t border-[var(--n3-line)] py-4 text-sm text-[var(--n3-text-muted)]">No fue posible verificar las incorporaciones de hoy.</p>
            : category.group.addedToday.length === 0
              ? <p className="mt-4 border-t border-[var(--n3-line)] py-4 text-sm text-[var(--n3-text-muted)]">Sin nuevos avisos registrados hoy.</p>
              : <div className="mt-3 divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
                  {category.group.addedToday.slice(0, 3).map((item) => <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-[var(--n3-text-light)]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.address || 'Ubicación por confirmar'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold tabular-nums">{uf(item.priceUf)}</span>
                        <span className="text-[11px] text-[var(--n3-text-muted)]">{stamp(item.addedAt)}</span>
                      </div>
                    </div>
                    {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={'Abrir publicación ' + item.id + ' en Portal Inmobiliario'} className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--n3-teal-soft)] hover:bg-white/[0.03] focus-visible:outline-2">
                      <ExternalLink size={16} aria-hidden="true" />
                    </a> : null}
                  </div>)}
                </div>}
          {canExploreInventory && category.group && category.group.addedTodayCount !== null && category.group.addedTodayCount > 3
            ? <Link href="/dashboard/market/oferta#nuevos-hoy" className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-teal-soft)]">Ver todas las incorporaciones <ArrowRight size={14} /></Link>
            : null}
        </section>)}
      </div>
    </section>

    <section id="ventas" aria-labelledby="sales-title" className="mt-12 scroll-mt-6">
      <div className="border-b border-[var(--n3-line)] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">03 · Oferta y compraventas</p>
        <h2 id="sales-title" className="mt-2 text-2xl font-semibold tracking-tight">Lo publicado no es lo vendido</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Portal registra precios pedidos y publicaciones; CBRS registra inscripciones de compraventa. Los períodos son distintos y no se calcula absorción con estas cifras.</p>
      </div>
      <div className="mt-4 hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-[var(--n3-line)] pb-3 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] sm:grid">
        <span>Tipo</span><span>Oferta Portal</span><span>Compraventas CBRS · {latestYear}</span>
      </div>
      {market.categories.map((category) => {
        const type: CbrsPropertyType = category.type === 'casas' ? 'Casa' : 'Departamento'
        const registered = yearMeasure(market.cbrsHistory, type, latestYear)
        return <div key={category.type} className="grid gap-3 border-b border-[var(--n3-line)] py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
          <p className="text-base font-semibold">{category.name}</p>
          <div>
            <p className="text-[10px] uppercase text-[var(--n3-text-muted)] sm:hidden">Avisos publicados</p>
            <p className="text-2xl font-semibold tabular-nums">{count(category.group?.inventoryCount)}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{category.group?.inventoryAt ? 'Actualizado inventario ' + stamp(category.group.inventoryAt) : 'Inventario no disponible'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-[var(--n3-text-muted)] sm:hidden">Compraventas CBRS {latestYear}</p>
            <p className="text-2xl font-semibold tabular-nums">{count(registered?.transactions)}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Año completo {latestYear}</p>
          </div>
        </div>
      })}
    </section>

    <section id="evolucion" aria-labelledby="history-title" className="mt-12 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">04 · CBRS Vitacura</p>
          <h2 id="history-title" className="mt-2 text-2xl font-semibold tracking-tight">Evolución del mercado · {yearRange}</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Compraventas residenciales registradas, agrupadas por inmueble principal. Estacionamientos y bodegas no se cuentan como ventas adicionales.</p>
        </div>
      </div>
      {market.historyUnavailable ? <p role="status" className="mt-5 border-y border-[var(--n3-line)] py-4 text-sm text-[var(--n3-text-muted)]">No se pudieron verificar las series registrales. No se generan estadísticas estimadas.</p> : (
        <div className="mt-5 grid gap-x-9 gap-y-8 md:grid-cols-2">
          <YearlyTrend type="Casa" name="Casas" rows={market.cbrsHistory} lastYear={latestYear} />
          <YearlyTrend type="Departamento" name="Departamentos" rows={market.cbrsHistory} lastYear={latestYear} />
        </div>
      )}
      <p className="mt-4 text-[11px] leading-5 text-[var(--n3-text-muted)]">Las líneas muestran la evolución anual de cada tipo de inmueble con escala propia. No se comparan sus alturas entre categorías.</p>
    </section>

    <section id="barrios" aria-labelledby="barrios-title" className="mt-12 scroll-mt-6 border-y border-[var(--n3-line)] py-6">
      <div className="grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">05 · Territorio</p>
          <p className="mt-3 text-5xl font-semibold tabular-nums">{count(market.kmlNeighborhoods)}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">barrios oficiales</p>
        </div>
        <div className="min-w-0">
          <h2 id="barrios-title" className="text-xl font-semibold">Vitacura, barrio por barrio</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">Los polígonos del KML entregado por Property Partners delimitan las zonas comerciales. El mapa permite explorarlas sin asignar barrios a propiedades cuando falta evidencia geográfica.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {canMap ? <Link href="/dashboard/market/mapa" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]"><MapPinned size={15} aria-hidden="true" /> Explorar mapa <ArrowRight size={14} /></Link> : null}
            {canCompare ? <Link href="/dashboard/market/comparables" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--n3-text-light)]">Conectar comparables <ArrowRight size={14} aria-hidden="true" /></Link> : null}
          </div>
        </div>
      </div>
    </section>

    <details className="mt-7 border-b border-[var(--n3-line)] pb-4 text-xs">
      <summary className="flex min-h-11 cursor-pointer items-center text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Fuentes y alcance de los datos</summary>
      <div className="mt-3 grid gap-5 pb-3 leading-6 text-[var(--n3-text-muted)] sm:grid-cols-3">
        <div><p className="font-semibold text-[var(--n3-text-light)]">Portal Inmobiliario</p><p>Oferta de casas y departamentos en venta en Vitacura. Las novedades son avisos incorporados hoy, no todos los anuncios modificados. Las revisiones completas y diarias se informan por separado.</p></div>
        <div><p className="font-semibold text-[var(--n3-text-light)]">CBRS Vitacura</p><p>Compraventas residenciales efectivamente inscritas. Último año completo visualizado: {latestYear}. {market.cbrsSourceEnd ? 'Fuente entregada hasta ' + market.cbrsSourceEnd.slice(0, 10) + '.' : 'Última fecha documental no disponible.'}</p></div>
        <div><p className="font-semibold text-[var(--n3-text-light)]">Barrios Property Partners</p><p>Delimitación conforme al KML canónico de Vitacura. Sin equivalencias geográficas ni asignaciones inferidas.</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--n3-line)] pt-3">
        <a href="/api/market/export?dataset=listings&format=xlsx" className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--n3-teal-soft)] hover:underline">Descargar inventario XLSX</a>
        <Link href="/dashboard/market/export" className="inline-flex min-h-11 items-center text-xs text-[var(--n3-text-light)] hover:underline">Abrir informe para imprimir</Link>
      </div>
    </details>
  </WorkspaceShell>
}
