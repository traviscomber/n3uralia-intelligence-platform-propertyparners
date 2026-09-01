import Link from 'next/link'
import { FileText, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getPortalReferenceSnapshot } from '@/lib/portal-reference-intelligence'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'

function number(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-CL')
}

function decimal(value: number | null, digits = 1) {
  return value === null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(parsed)
}

function shortDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
}

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

export default async function MarketPage() {
  const [market, scope, territory, portalReference] = await Promise.all([
    getOperationalMarketSnapshot(),
    requireUserScope(),
    getVitacuraNeighborhoodSnapshot(),
    getPortalReferenceSnapshot(),
  ])

  const canManage = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
  const confirmedCoverage = market.canonicalProperties && market.confirmedProperties !== null
    ? market.confirmedProperties / market.canonicalProperties
    : null
  const territorialCoverage = market.canonicalProperties && market.missingNeighborhoods !== null
    ? (market.canonicalProperties - market.missingNeighborhoods) / market.canonicalProperties
    : null
  const kmlCoverage = market.canonicalProperties ? territory.assignedProperties / market.canonicalProperties : null
  const liveTerritorialCoverage = market.liveHouseCount && market.exactKmlLiveHouses !== null
    ? market.exactKmlLiveHouses / market.liveHouseCount
    : null
  const territoryExceptions = (market.ambiguousTerritorySuggestions ?? 0) + (market.unmatchedTerritoryHouses ?? 0)
  const dataStatus = market.error || market.freshnessStatus === 'stale'
    ? 'blocked'
    : confirmedCoverage !== null && confirmedCoverage >= 0.8
      ? 'ready'
      : 'partial'

  const actions = [
    market.freshnessStatus === 'stale' ? { label: 'Actualizar mercado', value: freshness(market.freshnessStatus, market.observationAgeDays), href: '/dashboard/market/import', critical: true } : null,
    market.confirmedSales === null && market.latestCbrsHouseSaleDate ? { label: 'Actualizar ventas registrales de casas', value: `CBRS ${shortDate(market.latestCbrsHouseSaleDate)}`, href: '/dashboard/market/import', critical: true } : null,
    market.pendingUniqueTerritorySuggestions !== null && market.pendingUniqueTerritorySuggestions > 0 ? { label: 'Validar barrios sugeridos', value: number(market.pendingUniqueTerritorySuggestions), href: '/dashboard/market/revisar-barrios', critical: false } : null,
    territoryExceptions > 0 ? { label: 'Resolver territorio sin evidencia suficiente', value: number(territoryExceptions), href: '/dashboard/market/revisar-barrios', critical: false } : null,
    market.pendingMatches !== null && market.pendingMatches > 0 ? { label: 'Revisar identidad canónica', value: number(market.pendingMatches), href: '/dashboard/market/reconciliacion', critical: false } : null,
    market.missingNeighborhoods !== null && market.missingNeighborhoods > 0 ? { label: 'Completar barrios canónicos', value: number(market.missingNeighborhoods), href: '/dashboard/market/reconciliacion', critical: false } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  const houseReference = portalReference.datasets.find((item) => item.datasetKind === 'portal_houses')
  const houseLive = portalReference.liveDatasets.find((item) => item.datasetKind === 'portal_houses')

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Vitacura · Casas"
        meta={`Corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Oferta vs ventas', href: '/dashboard/market/inteligencia', primary: true, icon: <TrendingUp size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." /></div> : null}

      <MetricStrip items={[
        { label: 'Oferta activa', value: number(market.activeInventory) },
        { label: 'Ventas confirmadas', value: number(market.confirmedSales), tone: market.confirmedSales === null || market.confirmedSales === 0 ? 'warning' : 'default' },
        { label: 'Días en mercado', value: market.medianDaysOnMarket === null ? '—' : number(market.medianDaysOnMarket) },
        { label: 'Absorción', value: percent(market.absorptionRate) },
      ]} />

      <section className="mt-8 max-w-5xl">
        <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Qué requiere atención</h2>
          <span className="text-xs text-[var(--n3-text-muted)]">{actions.length}</span>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {actions.length ? actions.map((item) => (
            <Link key={item.label} href={item.href} className="grid min-h-16 gap-2 py-3 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <span className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</span>
              <span className={`text-sm font-semibold ${item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{item.value}</span>
            </Link>
          )) : <div className="py-7 text-sm text-[var(--n3-text-muted)]">Sin acciones pendientes con la evidencia disponible.</div>}
        </div>
      </section>

      <details className="mt-10 border-t border-[var(--n3-line)] pt-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          Ver datos y metodología
        </summary>

        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Calidad de evidencia</h2>
            <div className="mt-2 grid border-y border-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Territorio canónico', percent(territorialCoverage), `${number((market.canonicalProperties ?? 0) - (market.missingNeighborhoods ?? 0))} de ${number(market.canonicalProperties)}`],
                ['Territorio live validado', percent(liveTerritorialCoverage), `${number(market.exactKmlLiveHouses)} de ${number(market.liveHouseCount)}`],
                ['Barrios sugeridos', number(market.pendingUniqueTerritorySuggestions), 'Pendientes de validación humana'],
                ['Identidad confirmada', percent(confirmedCoverage), `${number(market.confirmedProperties)} de ${number(market.canonicalProperties)}`],
              ].map(([label, value, detail], index) => (
                <div key={label} className={`py-4 ${index > 0 ? 'sm:border-l sm:border-[var(--n3-line)] sm:px-4' : 'pr-4'}`}>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-[11px] text-[var(--n3-text-muted)]">{detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-4xl text-xs leading-5 text-[var(--n3-text-muted)]">
              Las sugerencias territoriales no se publican como barrio canónico hasta una decisión auditada. Los casos ambiguos o sin match permanecen bloqueados en vez de recibir una ubicación inferida.
            </p>
          </section>

          {houseReference ? (
            <section>
              <div className="border-b border-[var(--n3-line)] pb-2">
                <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Portal Inmobiliario · casas</h2>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Referencia histórica canónica frente al corte live de V1.</p>
              </div>
              <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Listings</p><p className="mt-1 text-lg font-semibold">{number(houseLive?.listingCount ?? null)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {number(houseReference.listingCount)}</span></p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Mediana UF</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianPriceUf ?? null, 0)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(houseReference.medianPriceUf, 0)}</span></p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">UF/m²</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianUfM2 ?? null, 1)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(houseReference.medianUfM2, 1)}</span></p></div>
                <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Superficie</p><p className="mt-1 text-lg font-semibold">{decimal(houseLive?.medianAreaM2 ?? null, 0)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(houseReference.medianAreaM2, 0)} m²</span></p></div>
              </div>
            </section>
          ) : null}

          <section>
            <div className="border-b border-[var(--n3-line)] pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">CBRS · casas</h2>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Base registral histórica confirmada. No se usa para fingir actividad reciente fuera de su corte.</p>
            </div>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Transacciones históricas</p><p className="mt-1 text-lg font-semibold">{number(market.cbrsHouseTransactions)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Última venta de casa disponible</p><p className="mt-1 text-lg font-semibold">{shortDate(market.latestCbrsHouseSaleDate)}</p></div>
            </div>
            {market.confirmedSales === null ? <p className="text-xs leading-5 text-[#f0c96a]">Ventas, días en mercado y absorción permanecen sin publicación actual hasta incorporar una fuente de ventas de casas posterior a este corte.</p> : null}
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Barrios Property Partners</h2>
              <span className="text-xs text-[var(--n3-text-muted)]">{territory.polygons} zonas</span>
            </div>
            <div className="divide-y divide-[var(--n3-line)]">
              {territory.neighborhoods.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>{row.name}</span>
                  <span className="tabular-nums text-[var(--n3-text-muted)]">{number(row.properties)}</span>
                </div>
              ))}
            </div>
          </section>

          <DataStatusBar
            cutoff={date(market.latestObservedAt)}
            coverage={`${number(market.confirmedProperties)} de ${number(market.canonicalProperties)} con identidad confirmada · ${number((market.canonicalProperties ?? 0) - (market.missingNeighborhoods ?? 0))} con barrio canónico`}
            issues={(market.error ? 1 : 0) + (market.freshnessStatus === 'stale' ? 1 : 0) + (territory.error ? 1 : 0) + (portalReference.error ? 1 : 0) + territoryExceptions}
            status={dataStatus}
          />

          <div className="flex flex-wrap gap-2 text-xs">
            <a href="/api/market/export?dataset=listings&format=xlsx" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Exportar XLSX</a>
            {canManage ? <Link href="/dashboard/market/fuentes" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Administrar fuentes</Link> : null}
            {canManage ? <Link href="/dashboard/market/reconciliacion" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Reconciliación</Link> : null}
            {canManage ? <Link href="/dashboard/market/revisar-barrios" className="inline-flex min-h-11 items-center px-2 text-[var(--n3-teal-soft)]">Revisar barrios</Link> : null}
          </div>
        </div>
      </details>
    </WorkspaceShell>
  )
}
