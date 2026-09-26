import Link from 'next/link'
import { FileText, Map, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getPortalReferenceSnapshot } from '@/lib/portal-reference-intelligence'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'
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
  return formatPropertyPartnersDateTime(value)
}

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

export default async function MarketPage() {
  const [market, territory, portalReference] = await Promise.all([
    getOperationalMarketSnapshot(),
    getVitacuraNeighborhoodSnapshot(),
    getPortalReferenceSnapshot(),
  ])

  const houseLive = portalReference.liveDatasets.find((item) => item.datasetKind === 'portal_houses')
  const territoryExceptions = (market.ambiguousTerritorySuggestions ?? 0) + (market.unmatchedTerritoryHouses ?? 0)
  const dataStatus = market.error || market.freshnessStatus === 'stale'
    ? 'blocked'
    : market.latestIngestionFullSnapshot && market.latestInventoryCoverageRatio !== null && market.latestInventoryCoverageRatio >= 0.8
      ? 'ready'
      : 'partial'

  const neighborhoodRows = territory.neighborhoods.slice(0, 12)

  return (
    <WorkspaceShell contentClassName="max-w-[1480px]">
      <WorkspaceHeader
        eyebrow="Pilar 02 · Mercado"
        title="Vitacura · Casas"
        meta={`Corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Oferta', href: '/dashboard/market/oferta', primary: true, icon: <TrendingUp size={15} /> },
          { label: 'Mapa', href: '/dashboard/market/mapa', icon: <Map size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." /></div> : null}

      <MetricStrip items={[
        { label: 'Oferta vigente', value: market.latestIngestionFullSnapshot ? number(market.activeInventory) : '—', detail: market.latestIngestionFullSnapshot ? 'Casas usadas en venta' : 'Snapshot parcial' },
        { label: 'Nuevas', value: number(market.latestIngestionNew) },
        { label: 'Retiradas', value: number(market.latestIngestionRemoved) },
        { label: 'Mediana publicada', value: houseLive?.medianPriceUf == null ? '—' : `UF ${decimal(houseLive.medianPriceUf, 0)}` },
        { label: 'Mediana UF/m²', value: decimal(houseLive?.medianUfM2 ?? null, 1) },
      ]} />

      <section className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <div>
          <div className="border-b border-[var(--n3-line)] pb-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Lectura del mercado</p>
          </div>
          <div className="grid gap-px border-b border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Cobertura captura', percent(market.latestInventoryCoverageRatio), `Portal reporta ${number(market.latestPortalReportedCount)} · N3uralia captura ${number(market.latestDiscoveryUniqueListings)}`],
              ['Días en mercado', number(market.medianDaysOnMarket), 'Mediana cuando existe evidencia suficiente'],
              ['Absorción', percent(market.absorptionRate), 'Sólo cuando existe base transaccional válida'],
              ['Oferta / ventas', market.offerToSalesRatio == null ? '—' : decimal(market.offerToSalesRatio, 1), 'Relación observada con evidencia confirmada'],
            ].map(([label, value, detail]) => (
              <div key={label} className="bg-[var(--n3-bg)] px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <div className="border-b border-[var(--n3-line)] pb-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Calidad de señal</p>
          </div>
          <div className="space-y-3 py-4 text-sm">
            <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Snapshot completo</span><strong>{market.latestIngestionFullSnapshot ? 'Sí' : 'No'}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Casas live con KML</span><strong>{number(market.exactKmlLiveHouses)}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Excepciones territoriales</span><strong>{number(territoryExceptions)}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Colisiones identidad</span><strong>{number(market.identityCollisions)}</strong></div>
          </div>
        </aside>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">03 · Barrios</p>
            <h2 className="mt-1 text-lg font-medium">Dónde está concentrada la cartera territorial</h2>
          </div>
          <Link href="/dashboard/market/mapa" className="text-xs font-semibold text-[var(--n3-teal-soft)]">Abrir mapa</Link>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {neighborhoodRows.map((row) => (
            <div key={row.name} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_140px_minmax(180px,1fr)] sm:items-center">
              <span className="text-sm font-medium">{row.name}</span>
              <span className="text-sm tabular-nums">{number(row.properties)} propiedades</span>
              <span className="text-xs text-[var(--n3-text-muted)]">{row.partners.length ? row.partners.join(' · ') : 'Sin responsable territorial publicado'}</span>
            </div>
          ))}
          {!neighborhoodRows.length ? <div className="py-6 text-sm text-[var(--n3-text-muted)]">Sin barrios canónicos disponibles.</div> : null}
        </div>
      </section>

      <section className="mt-9 grid gap-5 lg:grid-cols-3">
        <Link href="/dashboard/market/oferta" className="border-t border-[var(--n3-line)] pt-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Oferta</p>
          <h3 className="mt-2 text-base font-semibold">Inventario navegable</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Propiedades vigentes, filtros, precios y acceso a ficha.</p>
        </Link>
        <Link href="/dashboard/market/comparables" className="border-t border-[var(--n3-line)] pt-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Comparables</p>
          <h3 className="mt-2 text-base font-semibold">Evidencia para valorizar</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Conectar evidencia de mercado sin convertir Mercado en el valorizador.</p>
        </Link>
        <Link href="/dashboard/market/fuentes" className="border-t border-[var(--n3-line)] pt-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Fuentes</p>
          <h3 className="mt-2 text-base font-semibold">Trazabilidad y metodología</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Origen, corte y cobertura de cada señal publicada.</p>
        </Link>
      </section>

      <DataStatusBar
        cutoff={date(market.latestObservedAt)}
        coverage={market.latestInventoryCoverageRatio == null ? 'Sin cobertura calculable' : `${percent(market.latestInventoryCoverageRatio)} de cobertura contra Portal`}
        issues={(market.identityCollisions ?? 0) + territoryExceptions}
        status={dataStatus}
      />
    </WorkspaceShell>
  )
}
