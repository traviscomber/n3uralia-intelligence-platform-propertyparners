import Link from 'next/link'
import { AlertTriangle, Download, FileText, RefreshCw, Settings2 } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'

function number(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-CL')
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
  if (status === 'aging') return `${ageDays ?? '—'} días`
  if (status === 'stale') return `${ageDays ?? '—'} días`
  return '—'
}

function freshnessTone(status: MarketFreshnessStatus) {
  if (status === 'recent') return 'text-[#78d59a]'
  if (status === 'aging') return 'text-[#f0c96a]'
  return 'text-[#ff766f]'
}

export default async function MarketPage() {
  const [market, scope] = await Promise.all([
    getOperationalMarketSnapshot(),
    requireUserScope(),
  ])

  const canManage =
    hasCapability(scope.role, 'management.global.read') ||
    hasCapability(scope.role, 'management.office.read')

  const territorialCoverage =
    market.canonicalProperties && market.missingNeighborhoods !== null
      ? (market.canonicalProperties - market.missingNeighborhoods) / market.canonicalProperties
      : null

  const actions = [
    market.freshnessStatus === 'stale'
      ? {
          label: 'Actualizar observación',
          value: freshness(market.freshnessStatus, market.observationAgeDays),
          href: '/dashboard/market/import',
          critical: true,
        }
      : null,
    market.pendingMatches !== null && market.pendingMatches > 0
      ? {
          label: 'Revisar coincidencias',
          value: number(market.pendingMatches),
          href: '/dashboard/market/reconciliacion',
          critical: false,
        }
      : null,
    market.missingNeighborhoods !== null && market.missingNeighborhoods > 0
      ? {
          label: 'Completar barrios',
          value: number(market.missingNeighborhoods),
          href: '/dashboard/market/reconciliacion',
          critical: false,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <main className="min-h-screen bg-[#050707] px-4 py-5 text-white sm:px-6 md:px-8">
      <div className="mx-auto max-w-[1040px]">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Mercado</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Vitacura</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
              <span>Corte {date(market.latestObservedAt)}</span>
              <span className={freshnessTone(market.freshnessStatus)}>
                {freshness(market.freshnessStatus, market.observationAgeDays)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/market"
              aria-label="Actualizar mercado"
              className="inline-flex min-h-10 items-center justify-center border border-white/10 px-3 text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <RefreshCw size={15} />
            </Link>
            <Link
              href="/dashboard/market/export"
              className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#d7332b] px-4 text-xs font-semibold transition hover:bg-[#bd2e28]"
            >
              <FileText size={15} /> Informe
            </Link>
            <Link
              href="/api/market/export?dataset=listings&format=xlsx"
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/65 transition hover:border-white/25 hover:text-white"
            >
              <Download size={15} /> Exportar
            </Link>
            {canManage ? (
              <Link
                href="/dashboard/market/fuentes"
                aria-label="Administrar fuentes"
                className="inline-flex min-h-10 items-center justify-center border border-white/10 px-3 text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <Settings2 size={15} />
              </Link>
            ) : null}
          </div>
        </header>

        {market.error ? (
          <div className="mt-4">
            <PublicErrorNotice compact message="No fue posible consultar toda la información de mercado." />
          </div>
        ) : null}

        <section aria-label="Indicadores de mercado" className="grid border-b border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Oferta', number(market.activeInventory)],
            ['Propiedades', number(market.canonicalProperties)],
            ['Confirmadas', number(market.confirmedProperties)],
            ['Ventas', number(market.confirmedSales)],
          ].map(([label, value], index) => (
            <article key={label} className={`py-5 ${index > 0 ? 'sm:border-l sm:border-white/8 sm:px-5' : 'pr-5'}`}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Acciones</h2>
            <span className="text-xs tabular-nums text-white/35">{actions.length}</span>
          </div>

          <div className="divide-y divide-white/8">
            {actions.length > 0 ? actions.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group grid min-h-14 grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition hover:bg-white/[0.025]"
              >
                <span className={`h-2 w-2 rounded-full ${item.critical ? 'bg-[#d7332b]' : 'bg-[#f0c96a]'}`} />
                <span className="text-sm font-medium text-white/85">{item.label}</span>
                <span className={item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}>{item.value}</span>
              </Link>
            )) : (
              <div className="py-5 text-sm text-white/45">Sin acciones pendientes</div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Calidad</h2>
          <div className="mt-2 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Cobertura territorial', percent(territorialCoverage)],
              ['Sin barrio', number(market.missingNeighborhoods)],
              ['Velocidad', market.medianDaysOnMarket === null ? '—' : `${number(market.medianDaysOnMarket)} días`],
              ['Absorción', percent(market.absorptionRate)],
            ].map(([label, value], index) => (
              <div key={label} className={`py-4 ${index > 0 ? 'sm:border-l sm:border-white/8 sm:px-4' : 'pr-4'}`}>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-white/10 py-4 text-xs">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Ingestión</span>
          <span className="text-white/65">{date(market.latestIngestionAt)}</span>
          <span className="text-white/45">{market.latestIngestionAccepted ?? 0} aceptadas</span>
          <span className="text-white/45">{market.latestIngestionRejected ?? 0} rechazadas</span>
          {market.freshnessStatus === 'stale' ? (
            <span className="ml-auto inline-flex items-center gap-2 text-[#ff8d87]">
              <AlertTriangle size={14} /> Corte desactualizado
            </span>
          ) : null}
        </section>
      </div>
    </main>
  )
}
