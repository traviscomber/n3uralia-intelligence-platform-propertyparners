import Link from 'next/link'
import { Download, FileText, MapPinned, Settings2, TrendingUp } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { VitacuraNeighborhoodMap } from '@/components/market/vitacura-neighborhood-map'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import {
  getMarketHouseIntelligence,
  hasComparablePortalTerritory,
  missingExactPortalNeighborhoods,
} from '@/lib/market-house-intelligence'
import { getVitacuraNeighborhoodSnapshot } from '@/lib/vitacura-neighborhoods'

function number(value: number | null, digits = 0) {
  return value === null
    ? '—'
    : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export default async function MarketPage() {
  const [scope, territory, intelligence] = await Promise.all([
    requireUserScope(),
    getVitacuraNeighborhoodSnapshot(),
    getMarketHouseIntelligence(),
  ])
  const summary = intelligence.summary
  const canManage = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')
  const missingPortalNeighborhoods = missingExactPortalNeighborhoods(summary)
  const portalTerritoryReady = hasComparablePortalTerritory(summary)
  const kmlCoverage = summary.canonicalHouses && summary.exactKmlHouses !== null
    ? summary.exactKmlHouses / summary.canonicalHouses
    : null
  const dataStatus = intelligence.error || territory.error
    ? 'blocked'
    : portalTerritoryReady && summary.reviewHouses === 0
      ? 'ready'
      : 'partial'

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado"
        title="Casas en Vitacura"
        meta={`Portal ${date(summary.portalAsOf)} · CBRS ${date(summary.cbrsAsOf)}`}
        actions={[
          { label: 'Inteligencia', href: '/dashboard/market/inteligencia', primary: true, icon: <TrendingUp size={15} /> },
          { label: 'Informe', href: '/dashboard/market/export', icon: <FileText size={15} /> },
          { label: 'Exportar', href: '/api/market/export?dataset=summary&format=xlsx', icon: <Download size={15} /> },
          ...(canManage ? [{ label: '', href: '/dashboard/market/fuentes', ariaLabel: 'Administrar fuentes', icon: <Settings2 size={15} /> }] : []),
        ]}
      />

      {intelligence.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la inteligencia de casas." /></div> : null}
      {territory.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar los barrios." /></div> : null}

      <MetricStrip items={[
        { label: 'Oferta activa', value: number(summary.portalActiveHouses), detail: 'Casas · Portal' },
        { label: 'Mediana oferta', value: `${number(summary.portalMedianPriceUf)} UF` },
        { label: 'Oferta UF/m²', value: number(summary.portalMedianUfM2, 1) },
        { label: 'Ventas registradas', value: number(summary.cbrsHouseTransactions), detail: 'Casas · CBRS' },
      ]} />

      <section className="mt-7 grid gap-4 border border-[var(--n3-line)] bg-[#0c1111] p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Lectura N3uralia</p>
          <h2 className="mt-2 text-xl font-semibold">{portalTerritoryReady ? 'Oferta territorial lista' : 'Completar barrios de oferta'}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
            {portalTerritoryReady
              ? 'La cobertura permite comparar oferta actual y ventas por barrio.'
              : `${number(summary.portalExactKmlHouses)} de ${number(summary.portalCurrentHouses)} avisos tienen barrio KML. No se compara oferta por barrio hasta completar la clasificación.`}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Opinión separada · no modifica datos</p>
        </div>
        {!portalTerritoryReady && missingPortalNeighborhoods !== null ? (
          <Link href="/dashboard/market/reconciliacion" className="inline-flex min-h-10 items-center justify-center bg-[var(--primary)] px-4 text-xs font-semibold text-white">
            Revisar {number(missingPortalNeighborhoods)} avisos
          </Link>
        ) : null}
      </section>

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Base entregada</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Portal · casas · {date(summary.referenceAsOf)}</p>
        </div>
        <div className="grid border-b border-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Publicaciones', number(summary.referenceHouses)],
            ['Con ubicación', number(summary.referenceGeocodedHouses)],
            ['Mediana UF', number(summary.referenceMedianPriceUf)],
            ['UF/m²', number(summary.referenceMedianUfM2, 1)],
          ].map(([label, value], index) => (
            <div key={label} className={`py-4 ${index > 0 ? 'sm:border-l sm:border-[var(--n3-line)] sm:px-4' : 'pr-4'}`}>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cobertura</h2>
        <div className="mt-2 grid border-y border-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Barrios KML', number(summary.kmlNeighborhoods)],
            ['Casas con KML', number(summary.exactKmlHouses)],
            ['Casas por revisar', number(summary.reviewHouses)],
            ['Ventas con barrio', number(summary.cbrsHouseWithNeighborhood)],
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
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Polígonos del KML aceptado.</p>
          </div>
          <span className="text-xs tabular-nums text-[var(--n3-text-muted)]">{number(summary.kmlNeighborhoods)} barrios · {percent(kmlCoverage)} de casas exactas</span>
        </div>
        <VitacuraNeighborhoodMap neighborhoods={territory.neighborhoods} />
      </section>

      <DataStatusBar
        cutoff={date(summary.portalAsOf)}
        coverage={`${number(summary.exactKmlHouses)} de ${number(summary.canonicalHouses)} casas con KML`}
        issues={summary.reviewHouses ?? 0}
        issueLabel="casas por revisar"
        status={dataStatus}
      />

      <p className="mt-4 text-xs text-[var(--n3-text-muted)]">Fuentes: Portal Inmobiliario · CBRS · KML Property Partners.</p>
    </WorkspaceShell>
  )
}
