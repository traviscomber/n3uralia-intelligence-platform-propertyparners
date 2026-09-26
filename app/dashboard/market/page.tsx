import Link from 'next/link'
import { ArrowRight, BarChart3, Database, Home, Map } from 'lucide-react'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getPortalReferenceSnapshot } from '@/lib/portal-reference-intelligence'
import { getCanonicalMarketAuthority } from '@/lib/market-canonical-authority'
import { formatPropertyPartnersDateTime } from '@/lib/property-partners-time'

function number(value: number | null) {
  return value == null ? '—' : value.toLocaleString('es-CL')
}

function decimal(value: number | null, digits = 1) {
  return value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function percent(value: number | null) {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`
}

function date(value: string | null) {
  return value ? formatPropertyPartnersDateTime(value) : '—'
}

function shortDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
}

function freshness(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'Hoy' : `${ageDays} días`
  if (status === 'aging' || status === 'stale') return `${ageDays ?? '—'} días`
  return 'Sin corte'
}

export default async function MarketPage() {
  const scope = await requireUserScope()
  const canManageData = hasCapability(scope.role, 'management.global.read') || hasCapability(scope.role, 'management.office.read')

  const [market, portalReference, authorityResult] = await Promise.all([
    getOperationalMarketSnapshot(),
    getPortalReferenceSnapshot(),
    getCanonicalMarketAuthority()
      .then((authority) => ({ authority, error: false }))
      .catch(() => ({ authority: null, error: true })),
  ])

  const authority = authorityResult.authority
  const houseLive = portalReference.liveDatasets.find((item) => item.datasetKind === 'portal_houses') ?? null
  const apartmentReference = portalReference.datasets.find((item) => item.datasetKind === 'portal_apartments') ?? null
  const territoryExceptions = (market.ambiguousTerritorySuggestions ?? 0) + (market.unmatchedTerritoryHouses ?? 0)

  const marketViews = [
    {
      label: 'Oferta actual',
      detail: 'Qué casas están publicadas hoy y cuál es el universo completo del último snapshot válido.',
      href: '/dashboard/market/oferta',
      icon: Home,
    },
    {
      label: 'Oferta vs ventas',
      detail: 'Portal frente a CBRS por barrio, separando casas y departamentos y sin mezclar asking con cierre.',
      href: '/dashboard/market/inteligencia',
      icon: BarChart3,
    },
    {
      label: 'Evolución 4 años',
      detail: 'Compraventas, precio y UF/m² de casas y departamentos con serie anual CBRS.',
      href: '/dashboard/market/evolucion',
      icon: BarChart3,
    },
    {
      label: 'Mapa KML',
      detail: 'Los 19 barrios entregados por Property Partners son la autoridad territorial de Vitacura.',
      href: '/dashboard/market/mapa',
      icon: Map,
    },
  ] as const

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Pedro Pablo"
        title="Vitacura"
        meta={`Sólo mercado · corte ${date(market.latestObservedAt)} · ${freshness(market.freshnessStatus, market.observationAgeDays)}`}
        actions={[
          { label: 'Oferta vs ventas', href: '/dashboard/market/inteligencia', primary: true },
          { label: 'Mapa KML', href: '/dashboard/market/mapa' },
        ]}
      />

      {market.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la información operativa de mercado." /></div> : null}
      {portalReference.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar toda la referencia de Portal." /></div> : null}

      <section className="mt-6 border-y border-[var(--n3-line)] py-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Mercado hoy</p>
        <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          <article className="bg-[var(--n3-black)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Casas en oferta</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{market.latestIngestionFullSnapshot ? number(market.activeInventory) : '—'}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">
              {market.latestIngestionFullSnapshot ? 'Snapshot completo Portal · Vitacura.' : 'No se publica un total desde una captura parcial.'}
            </p>
          </article>
          <article className="bg-[var(--n3-black)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Casa · mediana publicada</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{houseLive?.medianPriceUf == null ? '—' : `UF ${decimal(houseLive.medianPriceUf, 0)}`}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Oferta live enriquecida; no equivale a precio de cierre.</p>
          </article>
          <article className="bg-[var(--n3-black)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Casa · mediana UF/m²</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{decimal(houseLive?.medianUfM2 ?? null, 1)}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Sólo publicaciones con superficie válida.</p>
          </article>
          <article className="bg-[var(--n3-black)] p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Último cierre CBRS · casa</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{shortDate(market.latestCbrsHouseSaleDate)}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Venta registrada; se mantiene separada de Portal.</p>
          </article>
        </div>
      </section>

      <section className="mt-8">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Preguntas de mercado</p>
          <h2 className="mt-1 text-xl font-medium text-[var(--n3-text-light)]">Una vista por decisión.</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">
            Mercado responde oferta, ventas, evolución y territorio. Gestión, funnel, metas, alertas de equipo y Property 360 permanecen en sus módulos propios.
          </p>
        </div>

        <div className="mt-5 grid border-l border-t border-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-4">
          {marketViews.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="group min-h-48 border-b border-r border-[var(--n3-line)] p-5 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tabular-nums text-[var(--n3-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={16} className="text-[var(--n3-teal-soft)]" aria-hidden="true" />
                </div>
                <h3 className="mt-7 text-base font-medium text-[var(--n3-text-light)]">{item.label}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{item.detail}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-[var(--n3-teal-soft)]">
                  Abrir <ArrowRight size={13} aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">03 · Casas</p>
              <h2 className="mt-1 text-lg font-medium">Oferta actual + ventas registradas</h2>
            </div>
            <Link href="/dashboard/market/inteligencia" className="text-xs text-[var(--n3-teal-soft)]">Ver por barrio</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-y border-[var(--n3-line)] py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">DOM</p>
              <p className="mt-1 text-xl font-semibold">{market.medianDaysOnMarket == null ? 'No disponible' : `${decimal(market.medianDaysOnMarket, 0)} días`}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Absorción</p>
              <p className="mt-1 text-xl font-semibold">{market.absorptionRate == null ? 'No disponible' : percent(market.absorptionRate)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">
            DOM y absorción sólo se publican cuando existe evidencia temporal suficiente. No se infieren desde la edad de un snapshot.
          </p>
        </article>

        <article className="border-t border-[var(--n3-line)] pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">04 · Departamentos</p>
              <h2 className="mt-1 text-lg font-medium">Referencia PP separada</h2>
            </div>
            <Link href="/dashboard/market/inteligencia" className="text-xs text-[var(--n3-teal-soft)]">Oferta vs ventas</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-y border-[var(--n3-line)] py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Avisos referencia</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{number(apartmentReference?.listingCount ?? null)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{apartmentReference?.medianPriceUf == null ? '—' : `UF ${decimal(apartmentReference.medianPriceUf, 0)}`}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF/m²</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{decimal(apartmentReference?.medianUfM2 ?? null, 1)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">
            Referencia canónica entregada por Property Partners. No se presenta como inventario live completo.
          </p>
        </article>
      </section>

      <section className="mt-8 border-t border-[var(--n3-line)] pt-5">
        <div className="flex items-start gap-3">
          <Database size={16} className="mt-0.5 shrink-0 text-[var(--n3-teal-soft)]" aria-hidden="true" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">05 · Fuentes canónicas</p>
            <h2 className="mt-1 text-lg font-medium">Tres universos. No se mezclan.</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-px bg-[var(--n3-line)] md:grid-cols-3">
          <div className="bg-[var(--n3-black)] p-4">
            <p className="text-xs font-medium">Portal Inmobiliario</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Oferta publicada. El total live sólo se muestra cuando el snapshot demuestra cobertura completa.</p>
          </div>
          <div className="bg-[var(--n3-black)] p-4">
            <p className="text-xs font-medium">CBRS</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{authority?.cbrs.residentialEvents == null ? 'Ventas registradas canónicas.' : `${number(authority.cbrs.residentialEvents)} eventos residenciales canónicos; casas y departamentos se separan después de agregar el evento registral.`}</p>
          </div>
          <div className="bg-[var(--n3-black)] p-4">
            <p className="text-xs font-medium">KML Property Partners</p>
            <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{authority?.territory.neighborhoods == null ? 'Geometría territorial canónica de Vitacura.' : `${number(authority.territory.neighborhoods)} barrios oficiales. El mapa representa esta geometría; no inventa zonas paralelas.`}</p>
          </div>
        </div>
      </section>

      {canManageData ? (
        <details className="mt-8 border-y border-[var(--n3-line)] py-3">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
            <span>Operación de datos · sólo para gestión</span>
            <span className="text-[10px] uppercase tracking-[0.12em]">Abrir</span>
          </summary>
          <div className="grid gap-4 pt-4 md:grid-cols-3">
            <Link href="/dashboard/market/identidades" className="border-l border-[var(--n3-line)] pl-4 text-sm">
              <strong className="block text-[var(--n3-text-light)]">{number(market.identityCollisions)}</strong>
              <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">colisiones de identidad · revisar</span>
            </Link>
            <Link href="/dashboard/market/revisar-barrios" className="border-l border-[var(--n3-line)] pl-4 text-sm">
              <strong className="block text-[var(--n3-text-light)]">{number(territoryExceptions)}</strong>
              <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">excepciones territoriales · revisar</span>
            </Link>
            <Link href="/dashboard/market/fuentes" className="border-l border-[var(--n3-line)] pl-4 text-sm">
              <strong className="block text-[var(--n3-text-light)]">{percent(market.latestInventoryCoverageRatio)}</strong>
              <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">cobertura del último corte · fuentes</span>
            </Link>
          </div>
        </details>
      ) : null}
    </WorkspaceShell>
  )
}
