import Link from 'next/link'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role,full_name,team').eq('id', user.id).maybeSingle()
    : { data: null }
  const role = String(profile?.role || '').toLowerCase()
  const isSeller = role === 'seller'

  const [market, operations, entityResult, assignmentResult, valuationResult] = await Promise.all([
    getOperationalMarketSnapshot(),
    getDashboardOperationalSnapshot(),
    user
      ? supabase.from('management_entities').select('id,name,metadata,parent_id').eq('profile_id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    user
      ? supabase.from('property_assignments').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'active')
      : Promise.resolve({ count: 0, error: null }),
    user
      ? supabase.from('valuation_cases').select('id,status', { count: 'exact' }).eq('requested_by', user.id)
      : Promise.resolve({ data: [], count: 0, error: null }),
  ])

  if (isSeller) {
    const valuationRows = valuationResult.data || []
    const drafts = valuationRows.filter((item) => item.status === 'draft').length
    const inReview = valuationRows.filter((item) => item.status === 'review').length
    const entityName = entityResult.data?.name || profile?.full_name || 'Ejecutiva'
    const metadata = (entityResult.data?.metadata || {}) as Record<string, unknown>
    const branch = String(metadata.branch || profile?.team || 'Sucursal no informada')
    const personalDataUnavailable = Boolean(entityResult.error || assignmentResult.error || valuationResult.error)

    return (
      <div className="mx-auto max-w-[1400px] space-y-7 pb-16">
        <header className="border-b border-[var(--n3-line)] pb-6 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">Espacio personal · {branch}</p>
          <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{entityName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">Resumen operativo de desempeño, valorizaciones y cartera asignada. Los datos ausentes se mantienen como no disponibles y no se reemplazan con estimaciones.</p>
            </div>
            <p className="text-xs leading-5 text-[var(--n3-text-muted)]">Mercado: {freshnessLabel(market.freshnessStatus, market.observationAgeDays)}<br />Corte: {formatDate(market.latestObservedAt)}</p>
          </div>
        </header>

        {personalDataUnavailable ? (
          <PublicErrorNotice
            code="DATA_UNAVAILABLE"
            title="Resumen personal incompleto"
            compact
          />
        ) : null}

        <section className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/partner" className="bg-[#0c1111] p-5 transition-colors hover:bg-[#101717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Desempeño</p>
            <p className="mt-3 text-2xl font-semibold">Ver métricas personales</p>
            <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Resultados, metas, conversión y evolución desde la fuente canónica.</p>
          </Link>
          <Link href="/dashboard/valuations" className="bg-[#0c1111] p-5 transition-colors hover:bg-[#101717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Valorizaciones</p>
            <p className="mt-3 text-4xl font-semibold">{valuationResult.count ?? 0}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{drafts} borradores · {inReview} en revisión</p>
          </Link>
          <Link href="/dashboard/properties" className="bg-[#0c1111] p-5 transition-colors hover:bg-[#101717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cartera asignada</p>
            <p className="mt-3 text-4xl font-semibold">{assignmentResult.count ?? 0}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Propiedades activas vinculadas explícitamente a tu perfil.</p>
          </Link>
          <Link href="/dashboard/reportes/audiencias/ejecutivo" className="bg-[#0c1111] p-5 transition-colors hover:bg-[#101717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Reporte personal</p>
            <p className="mt-3 text-2xl font-semibold">Abrir reporte</p>
            <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">Vista aislada por perfil con período y procedencia.</p>
          </Link>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Prioridad operativa</p>
            <h2 className="mt-3 text-xl font-semibold">Siguiente acción verificable</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">
              {drafts > 0
                ? `Tienes ${drafts} valorización${drafts === 1 ? '' : 'es'} en borrador. Revisa comparables y completa el expediente antes de enviarlo a dirección.`
                : (assignmentResult.count ?? 0) > 0
                  ? 'Revisa tu cartera asignada y confirma la vigencia de la evidencia disponible antes de contactar o reportar disponibilidad.'
                  : 'No hay tareas operativas inferidas. Revisa tu desempeño o crea una valorización cuando exista una solicitud real.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={drafts > 0 ? '/dashboard/valuations' : '/dashboard/partner'} className="bg-[#d7332b] px-4 py-2 text-xs font-semibold text-white">{drafts > 0 ? 'Revisar borradores' : 'Abrir mi desempeño'}</Link>
              <Link href="/dashboard/valuation/new" className="border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold hover:border-[var(--n3-teal)]">Nueva valorización</Link>
            </div>
          </div>

          <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Confianza de datos</p>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--n3-line)] pb-3"><span>Vínculo personal</span><strong>{entityResult.data ? 'Canónico' : 'No disponible'}</strong></div>
              <div className="flex justify-between gap-4 border-b border-[var(--n3-line)] pb-3"><span>Mercado observado</span><strong className={market.freshnessStatus === 'stale' ? 'text-[#ff766f]' : ''}>{freshnessLabel(market.freshnessStatus, market.observationAgeDays)}</strong></div>
              <div className="flex justify-between gap-4"><span>Ventas confirmadas</span><strong>{n(market.confirmedSales)}</strong></div>
            </div>
          </div>
        </section>
      </div>
    )
  }

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
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Plataforma integrada de inteligencia inmobiliaria y gestión comercial</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">La versión actual se limita al alcance funcional contratado: inteligencia de mercado, valorización de propiedades y control de gestión comercial.</p>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Alcance vigente</p><h2 className="mt-2 text-2xl font-semibold">Tres módulos integrados</h2></div><Link href="/dashboard/version-2" className="text-xs font-semibold text-[var(--n3-text-muted)] hover:text-[#ff766f]">Revisar Versión 2 →</Link></div>
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] lg:grid-cols-3">{modules.map((module) => <article key={module.number} className="flex min-h-[300px] flex-col bg-[#0c1111] p-6"><div className="flex items-center justify-between gap-4"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Módulo {module.number}</span><span className="border border-[var(--n3-line)] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Alcance contractual</span></div><h3 className="mt-8 text-2xl font-semibold">{module.title}</h3><p className="mt-4 flex-1 text-sm leading-6 text-[var(--n3-text-muted)]">{module.description}</p><Link href={module.href} className="mt-8 border-t border-[var(--n3-line)] pt-4 text-sm font-semibold text-[#ff766f]">Abrir módulo →</Link></article>)}</div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Criterio de producto</p><h2 className="mt-3 text-xl font-semibold">Información verificable, sin funcionalidades ajenas al contrato</h2><div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">{principles.map((principle) => <div key={principle} className="bg-[#080d0d] p-4 text-xs leading-5 text-[var(--n3-text-muted)]">{principle}</div>)}</div></div>
        <div className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Estado operativo</p><div className="mt-5 space-y-3 text-sm"><div className="border-b border-[var(--n3-line)] pb-3"><div className="flex items-start justify-between gap-4"><span>Mercado</span><strong className={`text-right ${market.error || !market.connected ? 'text-[#ff766f]' : ''}`}>{marketStatus}</strong></div><p className="mt-2 text-right text-xs leading-5 text-[var(--n3-text-muted)]">{n(market.confirmedSales)} ventas confirmadas · {freshnessLabel(market.freshnessStatus, market.observationAgeDays)}</p><p className="mt-1 text-right text-[10px] leading-4 text-[var(--n3-text-muted)]">Última observación: {formatDate(market.latestObservedAt)}</p></div><div className="border-b border-[var(--n3-line)] pb-3"><div className="flex items-start justify-between gap-4"><span>Valorización</span><strong className={`text-right ${operations.error ? 'text-[#ff766f]' : ''}`}>{valuationStatus}</strong></div><p className="mt-2 text-right text-xs text-[var(--n3-text-muted)]">{n(operations.valuationApproved)} casos aprobados o emitidos</p></div><div className="border-b border-[var(--n3-line)] pb-3"><div className="flex items-start justify-between gap-4"><span>Control de gestión</span><strong className={`text-right ${operations.error ? 'text-[#ff766f]' : ''}`}>{managementStatus}</strong></div><p className="mt-2 text-right text-xs text-[var(--n3-text-muted)]">{n(operations.managementAlerts)} alertas abiertas o reconocidas</p></div><div className="flex justify-between gap-4"><span>Reportes</span><strong className="text-right">Estructura disponible · ejecuciones no consolidadas en este resumen</strong></div></div>{market.error || operations.error ? <div className="mt-4 border-t border-[var(--n3-line)] pt-4"><PublicErrorNotice code="DATA_UNAVAILABLE" title="Estado operativo incompleto" compact /></div> : null}</div>
      </section>
    </div>
  )
}
