import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
import { loadPortalOffer, type OfferListing, type OfferType } from '@/lib/portal-offer-service'

const formatNumber = (value: number | null) => value == null ? '—' : value.toLocaleString('es-CL')
const formatPrice = (value: number | null) => value == null
  ? 'Precio pendiente'
  : 'UF ' + value.toLocaleString('es-CL',{maximumFractionDigits:0})

function OfferLink({ row }: { row: OfferListing }) {
  return row.url
    ? <a href={row.url} target="_blank" rel="noopener noreferrer"
        aria-label={'Abrir publicación ' + row.id + ' en Portal Inmobiliario'}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--n3-teal-soft)] hover:bg-[var(--n3-deep)] focus-visible:outline focus-visible:outline-2">
        <ExternalLink size={16} aria-hidden="true" /></a>
    : null
}

export default async function MarketOfferPage({
  searchParams,
}: { searchParams: Promise<{ tipo?: string; pagina?: string }> }) {
  await requireAnyPageCapability(['market.manage_sources','management.global.read','management.office.read'])
  const params = await searchParams
  const selected: OfferType = params.tipo === 'departamentos' ? 'departamentos' : 'casas'
  const pageNumber = Number(params.pagina)
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1
  const data = await loadPortalOffer({selected,page})
  const active = data.groups.find((item) => item.type === data.selected) ?? data.groups[0]
  const totalNew = data.groups.every((item) => item.addedTodayCount != null)
    ? data.groups.reduce((sum,item) => sum + (item.addedTodayCount ?? 0),0)
    : null
  const dateLabel = new Intl.DateTimeFormat('es-CL',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.date+'T12:00:00Z'))

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Mercado · Portal Inmobiliario"
      title="Casas y departamentos"
      meta="Vitacura · Avisos en venta · Inventarios separados"
      actions={[{label:'Volver a Mercado',href:'/dashboard/market'}]}
    />

    <section aria-label="Inventario por tipo" className="mt-6 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2">
      {data.groups.map((item) => <article key={item.type} className="flex min-w-0 flex-col bg-[var(--n3-black)] p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{item.label}</h2>
        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="text-4xl font-semibold tabular-nums">{formatNumber(item.inventoryCount)}</p>
          <p className="pb-1 text-xs text-[var(--n3-text-muted)]">avisos en la última revisión completa</p>
        </div>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">
          {item.inventoryAt
            ? 'Verificado '+formatPropertyPartnersDateTime(item.inventoryAt)
            : item.inventoryUnavailable ? 'Inventario no disponible' : 'Sin inventario completo verificado'}
        </p>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--n3-line)] pt-4">
          <p className="text-xs text-[var(--n3-text-muted)]">Nuevos hoy: <strong className="font-semibold text-[var(--n3-text-light)]">{formatNumber(item.addedTodayCount)}</strong></p>
          <Link href={'/dashboard/market/oferta?tipo='+item.type+'#inventario'}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--n3-teal-soft)] hover:underline">
            Ver {item.label.toLowerCase()} <span className="ml-1" aria-hidden="true">→</span>
          </Link>
        </div>
      </article>)}
    </section>

    <section id="nuevos-hoy" aria-labelledby="today-title" className="mt-9 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">Novedades verificadas</p>
          <h2 id="today-title" className="mt-1 text-2xl font-semibold">Nuevos de hoy</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
            {dateLabel} · Primera incorporación al sistema, no fecha de publicación. Las actualizaciones no cuentan como nuevas.
          </p>
        </div>
        <p className="text-3xl font-semibold tabular-nums" aria-label="Total de nuevas incorporaciones">{formatNumber(totalNew)}</p>
      </div>
      <div className="grid gap-8 py-5 lg:grid-cols-2">
        {data.groups.map((item) => <div key={item.type} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold">{item.label}</h3>
            <span className="text-sm font-semibold tabular-nums">{formatNumber(item.addedTodayCount)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">nuevos</span></span>
          </div>
          {item.additionsUnavailable
            ? <p className="mt-3 border-t border-[var(--n3-line)] py-4 text-sm text-[var(--n3-text-muted)]" role="status">Datos del día no verificables. No se muestra un cero estimado.</p>
            : item.addedToday.length === 0
              ? <p className="mt-3 border-t border-[var(--n3-line)] py-4 text-sm text-[var(--n3-text-muted)]">Sin incorporaciones nuevas registradas hoy.</p>
              : <ul className="mt-3 divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
                  {item.addedToday.map((row) => <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.address || 'Dirección por confirmar'} · {row.addedAt ? formatPropertyPartnersDateTime(row.addedAt) : 'Hoy'}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(row.priceUf)}</p>
                    </div>
                    <OfferLink row={row} />
                  </li>)}
                </ul>}
          {item.addedTodayCount != null && item.addedTodayCount > item.addedToday.length
            ? <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Mostrando las últimas {item.addedToday.length} de {item.addedTodayCount} incorporaciones.</p> : null}
        </div>)}
      </div>
    </section>

    <section id="inventario" aria-labelledby="inventory-title" className="mt-7 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-4">
        <div>
          <h2 id="inventory-title" className="text-2xl font-semibold">Explorar inventario</h2>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Publicaciones del último inventario completo verificado.</p>
        </div>
        <nav aria-label="Elegir tipo de propiedad" className="flex flex-wrap gap-2">
          {data.groups.map((item) => <Link key={item.type}
            aria-current={item.type === active.type ? 'page' : undefined}
            href={'/dashboard/market/oferta?tipo='+item.type+'#inventario'}
            className={'inline-flex min-h-11 items-center border px-4 text-xs focus-visible:outline focus-visible:outline-2 '+
              (item.type === active.type
                ? 'border-[var(--n3-teal-soft)] font-semibold text-[var(--n3-text-light)]'
                : 'border-[var(--n3-line)] text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]')}>
            {item.label}
          </Link>)}
        </nav>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--n3-text-muted)]">
        <span>{active.label} · {formatNumber(active.inventoryCount)} avisos</span>
        <span>{active.inventoryAt ? 'Verificado '+formatPropertyPartnersDateTime(active.inventoryAt) : 'Inventario sin confirmar'}</span>
      </div>

      {active.inventoryUnavailable || data.inventoryUnavailable
        ? <p role="status" className="mt-5 border border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">No se pudo consultar el inventario completo. No se reemplaza con datos parciales.</p>
        : !active.inventoryRunId
          ? <p role="status" className="mt-5 border border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">No existe aún una revisión completa verificada para {active.label.toLowerCase()}.</p>
          : data.inventory.length === 0
            ? <p role="status" className="mt-5 border border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">Sin publicaciones en esta página.</p>
            : <>
                <div className="mt-4 hidden grid-cols-[minmax(0,1.65fr)_minmax(0,1.3fr)_110px_110px_44px] border-b border-[var(--n3-line)] pb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] xl:grid">
                  <span>Publicación</span><span>Dirección</span><span>Precio</span><span>Detalle</span><span />
                </div>
                <div className="divide-y divide-[var(--n3-line)]">
                  {data.inventory.map((row) => <div key={row.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-x-4 gap-y-2 py-4 text-sm xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1.3fr)_110px_110px_44px] xl:items-center">
                    <div className="col-start-1 min-w-0 xl:col-auto"><p className="break-words font-medium">{row.title}</p><p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">ID {row.id}</p></div>
                    <p className="col-start-1 break-words text-xs text-[var(--n3-text-muted)] xl:col-auto">{row.address || 'Dirección pendiente'}</p>
                    <p className="col-start-1 tabular-nums xl:col-auto">{formatPrice(row.priceUf)}</p>
                    <p className="col-start-1 text-xs text-[var(--n3-text-muted)] xl:col-auto">{row.hasDetail ? 'Con detalle' : 'Presencia confirmada'}</p>
                    <div className="col-start-2 row-span-3 row-start-1 flex items-start justify-end xl:col-auto xl:row-span-1 xl:row-start-auto"><OfferLink row={row} /></div>
                  </div>)}
                </div>
                <nav aria-label="Páginas del inventario" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--n3-line)] pt-4">
                  <span className="text-xs text-[var(--n3-text-muted)]">Página {data.page} de {data.pages}</span>
                  <div className="flex gap-2">
                    {data.page > 1 ? <Link className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 text-xs"
                      href={'/dashboard/market/oferta?tipo='+active.type+'&pagina='+(data.page-1)+'#inventario'}>Anterior</Link> : null}
                    {data.page < data.pages ? <Link className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 text-xs"
                      href={'/dashboard/market/oferta?tipo='+active.type+'&pagina='+(data.page+1)+'#inventario'}>Siguiente</Link> : null}
                  </div>
                </nav>
              </>}
    </section>
    <p className="mt-7 border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[var(--n3-text-muted)]">
      Inventario completo y novedades del día son cortes distintos. Los ingresos recientes aparecerán en el inventario completo una vez reconciliados. Las publicaciones no representan ventas confirmadas.
    </p>
  </WorkspaceShell>
}
