import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import {
  buildMarketHouseSignals,
  getMarketHouseIntelligence,
  hasComparablePortalTerritory,
  missingExactPortalNeighborhoods,
} from '@/lib/market-house-intelligence'

function number(value: number | null, digits = 0) {
  return value === null
    ? '—'
    : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function date(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export default async function MarketIntelligencePage() {
  const intelligence = await getMarketHouseIntelligence()
  const summary = intelligence.summary
  const missingPortalNeighborhoods = missingExactPortalNeighborhoods(summary)
  const portalTerritoryReady = hasComparablePortalTerritory(summary)
  const signals = buildMarketHouseSignals(intelligence.neighborhoods)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Inteligencia de casas"
        meta={`Oferta Portal · ${date(summary.portalAsOf)} · Ventas CBRS · ${date(summary.cbrsAsOf)}`}
        actions={[{ label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> }]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la inteligencia de casas." /></div> : null}

      <MetricStrip items={[
        { label: 'Oferta actual', value: number(summary.portalCurrentHouses), detail: 'Casas · Portal' },
        { label: 'Mediana oferta', value: `${number(summary.portalMedianPriceUf)} UF` },
        { label: 'Oferta UF/m²', value: number(summary.portalMedianUfM2, 1) },
        { label: 'Ventas registradas', value: number(summary.cbrsHouseTransactions), detail: 'Casas · CBRS' },
      ]} />

      <section className="mt-7 border border-[var(--n3-line)] bg-[#0c1111] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Lectura N3uralia</p>
        <h2 className="mt-2 text-xl font-semibold">{portalTerritoryReady ? 'Comparar oferta por barrio' : 'Primero, completar barrios'}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
          {portalTerritoryReady
            ? 'La oferta actual tiene cobertura territorial suficiente.'
            : `${number(summary.portalExactKmlHouses)} de ${number(summary.portalCurrentHouses)} avisos tienen barrio KML. Faltan ${number(missingPortalNeighborhoods)}.`}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Opinión separada · no modifica datos</p>
      </section>

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Señales CBRS</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Sólo barrios con {number(signals.minimumSample)} o más ventas.</p>
        </div>
        <div className="grid border-b border-[var(--n3-line)] sm:grid-cols-2">
          <div className="py-4 pr-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Más ventas</p>
            <p className="mt-1 text-xl font-semibold">{signals.mostSales?.neighborhoodName ?? '—'}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{signals.mostSales ? `${number(signals.mostSales.cbrsTransactions)} ventas` : 'Sin muestra suficiente'}</p>
          </div>
          <div className="border-t border-[var(--n3-line)] py-4 sm:border-l sm:border-t-0 sm:pl-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mayor UF/m²</p>
            <p className="mt-1 text-xl font-semibold">{signals.highestUfM2?.neighborhoodName ?? '—'}</p>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{signals.highestUfM2 ? `${number(signals.highestUfM2.cbrsMedianUfM2, 1)} UF/m² · ${number(signals.highestUfM2.cbrsTransactions)} ventas` : 'Sin muestra suficiente'}</p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Ventas registradas por barrio</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Casas · CBRS · corte {date(summary.cbrsAsOf)}</p>
        </div>

        <div className="divide-y divide-[var(--n3-line)]">
          {intelligence.neighborhoods.map((row) => (
            <div key={row.neighborhoodName} className="grid gap-3 py-4 sm:grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(110px,1fr))] sm:items-center">
              <p className="text-sm font-semibold text-[var(--n3-text-light)]">{row.neighborhoodName}</p>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Ventas</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsTransactions)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianPriceUf)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF/m² construido</p>
                <p className="mt-1 text-base font-semibold tabular-nums">{number(row.cbrsMedianUfM2, 1)}</p>
              </div>
            </div>
          ))}
          {!intelligence.error && intelligence.neighborhoods.length === 0 ? <div className="py-5 text-sm text-[var(--n3-text-muted)]">Sin ventas con barrio</div> : null}
        </div>
      </section>

      <section className="mt-6 border-t border-[var(--n3-line)] pt-4 text-xs text-[var(--n3-text-muted)]">
        <p>Medianas históricas. No reemplazan una valorización.</p>
        <p className="mt-2"><Link href="/dashboard/market/cbrs" className="text-[var(--n3-accent)]">Ver ventas CBRS</Link></p>
      </section>
    </WorkspaceShell>
  )
}
