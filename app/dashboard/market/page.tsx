import Link from 'next/link'
import { AlertTriangle, Download, FileText, MapPinned, RefreshCw, Settings2, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { VitacuraNeighborhoodMap } from '@/components/market/vitacura-neighborhood-map'
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
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(parsed)
}

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

const portalLabels = {
  portal_apartments: 'Departamentos',
  portal_houses: 'Casas',
  portal_projects: 'Proyectos',
} as const

export default async function MarketPage() {
  const [market, scope, territory, portalReference] = await Promise.all([
    getOperationalMarketSnapshot(),
    requireUserScope(),
    getVitacuraNeighborhoodSnapshot(),
    getPortalReferenceSnapshot(),
  ])
  const canManage = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
  const canonicalUnassigned = Math.max((market.canonicalProperties ?? 0) - territory.assignedProperties, 0)
  const kmlCoverage = market.canonicalProperties
    ? territory.assignedProperties / market.canonicalProperties
    : null
  const confirmedCoverage = market.canonicalProperties && market.confirmedProperties !== null
    ? market.confirmedProperties / market.canonicalProperties
    : null
  const dataStatus = market.error || market.freshnessStatus === 'stale'
    ? 'blocked'
    : confirmedCoverage !== null && confirmedCoverage >= 0.8
      ? 'ready'
      : 'partial'

  const actions = [
    market.freshnessStatus === 'stale' ? { label: 'Actualizar observación', value: freshness(market.freshnessStatus, market.observationAgeDays), href: '/dashboard/market/import', critical: true } : null,
    market.pendingMatches !== null && market.pendingMatches > 0 ? { label: 'Revisar coincidencias', value: number(market.pendingMatches), href: '/dashboard/market/reconciliacion', critical: false } : null,
    canonicalUnassigned > 0 ? { label: 'Revisar barrios', value: number(canonicalUnassigned), href: '/dashboard/market/reconciliacion', critical: false } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Vitacura"
        meta={`Corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Oferta vs ventas', href: '/dashboard/market/inteligencia', primary: true, icon: <TrendingUp size={15} /> },
          { label: '', href: '/dashboard/market', ariaLabel: 'Actualizar mercado', icon: <RefreshCw size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
          { label: 'Exportar', href: '/api/market/export?dataset=listings&format=xlsx', icon: <Download size={15} /> },
          ...(canManage ? [{ label: '', href: '/dashboard/market/fuentes', ariaLabel: 'Administrar fuentes', icon: <Settings2 size={15} /> }] : []),
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." /></div> : null}
      {territory.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la capa territorial de barrios." /></div> : null}
      {portalReference.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la referencia canónica de Portal Inmobiliario." /></div> : null}
      {portalReference.liveError ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la oferta actual." /></div> : null}

      <MetricStrip items={[
        { label: 'Oferta', value: number(market.activeInventory) },
        { label: 'Propiedades', value: number(market.canonicalProperties) },
        { label: 'Confirmadas', value: number(market.confirmedProperties), tone: confirmedCoverage !== null && confirmedCoverage < 0.5 ? 'danger' : 'default' },
        { label: 'Ventas', value: number(market.confirmedSales), tone: market.confirmedSales === 0 ? 'warning' : 'default' },
      ]} />

      {portalReference.datasets.length ? (
        <section className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--n3-line)] pb-2">
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Portal Inmobiliario · referencia canónica</h2>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Snapshot entregado por Property Partners · marzo 2026. Referencia histórica, no inventario vivo.</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/market/inteligencia" className="text-xs font-medium text-[var(--n3-accent)]">Cruzar con ventas CBRS</Link>
              <Link href="/dashboard/market/import-portal" className="text-xs font-medium text-[var(--n3-accent)]">Administrar referencia</Link>
            </div>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {portalReference.datasets.map((reference) => {
              const live = portalReference.liveDatasets.find((row) => row.datasetKind === reference.datasetKind)
              const coverage = reference.listingCount > 0 && live ? live.listingCount / reference.listingCount : null
              return (
                <div key={reference.datasetKind} className="grid gap-4 py-4 lg:grid-cols-[minmax(150px,0.8fr)_repeat(4,minmax(110px,1fr))] lg:items-end">
                  <div>
                    <p className="text-sm font-semibold text-[var(--n3-text-light)]">{portalLabels[reference.datasetKind]}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Cobertura actual {percent(coverage)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Listings</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{number(live?.listingCount ?? null)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {number(reference.listingCount)}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{decimal(live?.medianPriceUf ?? null, 0)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(reference.medianPriceUf, 0)}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF/m²</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{decimal(live?.medianUfM2 ?? null, 1)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(reference.medianUfM2, 1)}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Superficie mediana</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{decimal(live?.medianAreaM2 ?? null, 0)} <span className="text-xs font-normal text-[var(--n3-text-muted)]">/ {decimal(reference.medianAreaM2, 0)} m²</span></p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[10px] text-[var(--n3-text-muted)]">Formato: actual / histórico.</p>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Acciones</h2>
          <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{actions.length}</span>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {actions.length ? actions.map((item) => (
            <Link key={item.label} href={item.href} className="group grid min-h-14 grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 hover:bg-white/[0.025]">
              <span className={`h-2 w-2 rounded-full ${item.critical ? 'bg-[var(--n3-accent)]' : 'bg-[#f0c96a]'}`} />
              <span className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</span>
              <span className={item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}>{item.value}</span>
            </Link>
          )) : <div className="py-5 text-sm text-[var(--n3-text-muted)]">Sin acciones pendientes</div>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Calidad</h2>
        <div className="mt-2 grid border-y border-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Asignación KML', percent(kmlCoverage)],
            ['Por revisar', number(canonicalUnassigned)],
            ['Identidad confirmada', percent(confirmedCoverage)],
            ['Velocidad', market.medianDaysOnMarket === null ? '—' : `${number(market.medianDaysOnMarket)} días`],
            ['Absorción', percent(market.absorptionRate)],
          ].map(([label, value], index) => (
            <div key={label} className={`py-4 ${index > 0 ? 'sm:border-l sm:border-[var(--n3-line)] sm:px-4' : 'pr-4'}`}>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--n3-line)] pb-2">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned size={15} className="text-[var(--n3-accent)]" />
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Barrios Property Partners</h2>
            </div>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Clasificación geográfica exacta desde {territory.sourceFile ?? 'KML'}.</p>
          </div>
          <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{territory.polygons} barrios · {number(territory.assignedProperties)} exactas · {number(canonicalUnassigned)} por revisar</span>
        </div>

        <VitacuraNeighborhoodMap neighborhoods={territory.neighborhoods} />
      </section>

      <DataStatusBar
        cutoff={date(market.latestObservedAt)}
        coverage={`${number(market.confirmedProperties)} de ${number(market.canonicalProperties)} propiedades confirmadas`}
        issues={(market.error ? 1 : 0) + (market.freshnessStatus === 'stale' ? 1 : 0) + (territory.error ? 1 : 0) + (portalReference.error ? 1 : 0) + (portalReference.liveError ? 1 : 0)}
        status={dataStatus}
      />

      <section className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-[var(--n3-text-muted)]">
        <span>Ingestión {date(market.latestIngestionAt)}</span>
        <span>{market.latestIngestionAccepted ?? 0} aceptadas</span>
        <span>{market.latestIngestionRejected ?? 0} rechazadas</span>
        <span>Barrios KML {date(territory.importedAt)}</span>
        {market.freshnessStatus === 'stale' ? <span className="ml-auto inline-flex items-center gap-2 text-[#ff8d87]"><AlertTriangle size={14} /> Corte desactualizado</span> : null}
      </section>
    </WorkspaceShell>
  )
}
