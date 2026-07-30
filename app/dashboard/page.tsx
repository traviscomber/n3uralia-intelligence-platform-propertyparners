import Link from 'next/link'
import { getOperationalMarketSnapshot, type MarketFreshnessStatus } from '@/lib/market-operational'
import { getDashboardOperationalSnapshot } from '@/lib/dashboard-operational'

const modules = [
  {
    number: '01',
    title: 'Inteligencia de Mercado',
    description: 'Registros de oferta, fuentes, barrios, calidad de datos e indicadores disponibles. Las ventas y métricas derivadas permanecen pendientes hasta cargar transacciones confirmadas.',
    href: '/dashboard/market',
  },
  {
    number: '02',
    title: 'Valorización de Propiedades',
    description: 'Creación de casos en borrador, comparables documentados, ajustes, revisión, aprobación, expediente y registro de decisiones.',
    href: '/dashboard/valuation',
  },
  {
    number: '03',
    title: 'Control de Gestión Comercial',
    description: 'Métricas, metas, variaciones, rankings y alertas por rol. Los resultados aparecen únicamente cuando existen entidades y datos operativos cargados.',
    href: '/dashboard/control',
  },
]

const principles = [
  'Sólo se muestran indicadores respaldados por fuentes identificables.',
  'Cada módulo conserva trazabilidad de datos, período y metodología.',
  'Las funcionalidades adicionales permanecen separadas en Versión 2.',
  'Los accesos y la información visible dependen del perfil del usuario.',
]

function n(value: number | null) {
  return value === null ? 'Sin datos' : value.toLocaleString('es-CL')
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha observada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no válida' : date.toLocaleString('es-CL')
}

function freshnessLabel(status: MarketFreshnessStatus, ageDays: number | null) {
  if (status === 'recent') return ageDays === 0 ? 'observado hoy' : `observado hace ${ageDays} días`
  if (status === 'aging') return `observación envejeciendo · ${ageDays ?? '—'} días`
  if (status === 'stale') return `observación desactualizada · ${ageDays ?? '—'} días`
  return 'sin fecha observada'
}

export default async function DashboardHome() {
  const [market, operations] = await Promise.all([
    getOperationalMarketSnapshot(),
    getDashboardOperationalSnapshot(),
  ])

  const marketStatus = market.error
    ? 'Consulta operativa incompleta'
    : market.connected
      ? `${n(market.canonicalProperties)} registros candidatos · ${n(market.activeInventory)} publicaciones activas`
      : 'Base operativa no disponible'

  const valuationStatus = operations.error
    ? 'Consulta operativa incompleta'
    : `${n(operations.valuationCases)} casos · ${n(operations.valuationDrafts)} borradores`

  const managementStatus = operations.error
    ? 'Consulta operativa incompleta'
    : `${n(operations.managementMetrics)} valores · ${n(operations.managementDefinitions)} definiciones activas`

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">Property Partners Vitacura</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Plataforma integrada de inteligencia inmobiliaria y gestión comercial
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
          La versión actual se limita al alcance funcional contratado: inteligencia de mercado, valorización de propiedades y control de gestión comercial.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Alcance vigente</p>
            <h2 className="mt-2 text-2xl font-semibold">Tres módulos integrados</h2>
          </div>
          <Link href="/dashboard/version-2" className="text-xs font-semibold text-[var(--n3-text-muted)] hover:text-[#ff766f]">Revisar Versión 2 →</Link>
        </div>

        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.number} className="flex min-h-[300px] flex-col bg-[#0c1111] p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Módulo {module.number}</span>
                <span className="border border-[var(--n3-line)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Alcance contractual</span>
              </div>
              <h3 className="mt-8 text-2xl font-semibold">{module.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-[var(--n3-text-muted)]">{module.description}</p>
              <Link href={module.href} className="mt-8 border-t border-[var(--n3-line)] pt-4 text-sm font-semibold text-[#ff766f]">Abrir módulo →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Criterio de producto</p>
          <h2 className="mt-3 text-xl font-semibold">Información verificable, sin funcionalidades ajenas al contrato</h2>
          <div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
            {principles.map((principle) => (
              <div key={principle} className="bg-[#080d0d] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">{principle}</div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Estado operativo</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="border-b border-[var(--n3-line)] pb-3">
              <div className="flex items-start justify-between gap-4">
                <span>Mercado</span>
                <strong className={`text-right ${market.error || !market.connected ? 'text-[#ff766f]' : ''}`}>{marketStatus}</strong>
              </div>
              <p className="mt-2 text-right text-xs leading-5 text-[var(--n3-text-muted)]">
                {n(market.confirmedSales)} ventas confirmadas · {freshnessLabel(market.freshnessStatus, market.observationAgeDays)}
              </p>
              <p className="mt-1 text-right text-[10px] leading-4 text-[var(--n3-text-muted)]">Última observación: {formatDate(market.latestObservedAt)}</p>
            </div>

            <div className="border-b border-[var(--n3-line)] pb-3">
              <div className="flex items-start justify-between gap-4"><span>Valorización</span><strong className={`text-right ${operations.error ? 'text-[#ff766f]' : ''}`}>{valuationStatus}</strong></div>
              <p className="mt-2 text-right text-xs text-[var(--n3-text-muted)]">{n(operations.valuationApproved)} casos aprobados o emitidos</p>
            </div>

            <div className="border-b border-[var(--n3-line)] pb-3">
              <div className="flex items-start justify-between gap-4"><span>Control de gestión</span><strong className={`text-right ${operations.error ? 'text-[#ff766f]' : ''}`}>{managementStatus}</strong></div>
              <p className="mt-2 text-right text-xs text-[var(--n3-text-muted)]">{n(operations.managementAlerts)} alertas abiertas o reconocidas</p>
            </div>

            <div className="flex justify-between gap-4"><span>Reportes</span><strong className="text-right">Estructura disponible · ejecuciones no consolidadas en este resumen</strong></div>
          </div>
          {market.error ? <p className="mt-4 border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[#ff766f]">No fue posible consultar todo el estado operativo de Mercado: {market.error}</p> : null}
          {operations.error ? <p className="mt-4 border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[#ff766f]">No fue posible consultar todo el estado operativo de Valorización y Control: {operations.error}</p> : null}
        </div>
      </section>
    </div>
  )
}
