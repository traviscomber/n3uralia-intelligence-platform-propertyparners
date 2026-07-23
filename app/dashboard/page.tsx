import Link from 'next/link'
import { redirect } from 'next/navigation'
import crm from '@/data/crm-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'
import { buildBoardReport } from '@/lib/board-report'
import { createClient } from '@/lib/supabase/server'

function n(value: number | null, digits = 0) {
  return value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: digits })
}

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'ceo') redirect('/dashboard/ceo')
  }

  const report = buildBoardReport('2026-06')
  const month = crm.months.find((item) => item.period === report.period)!
  const previousMonth = crm.months[Math.max(0, crm.months.findIndex((item) => item.period === report.period) - 1)]
  const salesDelta = previousMonth?.salesCount ? ((month.salesCount - previousMonth.salesCount) / previousMonth.salesCount) * 100 : null
  const stockReduction = Math.abs(crm.ytd.stockChange)
  const sourceCount = crm.sourceInventory.workbookCount

  const findings = [
    {
      eyebrow: 'Actividad comercial',
      title: `${n(month.salesCount)} cierres registrados en junio`,
      detail: `${n(month.salesUf)} UF de volumen mensual${salesDelta == null ? '' : ` · ${salesDelta >= 0 ? '+' : ''}${n(salesDelta, 1)}% frente al mes anterior`}`,
      href: '/dashboard/control',
    },
    {
      eyebrow: 'Inventario',
      title: `${n(month.stockCount)} propiedades en stock`,
      detail: `${n(stockReduction)} unidades menos que en enero, según el universo CRM auditado.`,
      href: '/dashboard/properties',
    },
    {
      eyebrow: 'Calidad de información',
      title: `${n(crm.quality.sourceCoverage, 1)}% de cobertura CRM`,
      detail: `${sourceCount} libros auditados y ${crm.quality.issues.length} alertas conservadas para revisión.`,
      href: '/dashboard/datos-crm',
    },
  ]

  const actions = [
    { label: 'Revisar mercado de Vitacura', detail: 'Tendencias, fuentes y señales del mercado.', href: '/dashboard/market' },
    { label: 'Valorizar una propiedad', detail: 'Comparables, rango recomendado y nivel de confianza.', href: '/dashboard/valorizador' },
    { label: 'Preparar reporte ejecutivo', detail: 'Síntesis programada para dirección y partners.', href: '/dashboard/reportes/autonomos' },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">Property Partners Vitacura · uso interno</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Resumen de gestión</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
              Lectura ejecutiva de actividad comercial, inventario y calidad de información. Cada indicador conserva la definición y procedencia de su fuente original.
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-px border border-[var(--n3-line)] bg-[var(--n3-line)]">
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Periodo</p>
              <p className="mt-2 text-sm font-semibold">Junio 2026</p>
            </div>
            <div className="bg-[#0c1111] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuentes</p>
              <p className="mt-2 text-sm font-semibold">{sourceCount} auditadas</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="business-state-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">Estado del negocio</p>
            <h2 id="business-state-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Indicadores principales</h2>
          </div>
          <Link href="/dashboard/ceo" className="text-xs font-semibold text-[var(--n3-text-muted)] transition hover:text-white">Abrir resumen ejecutivo →</Link>
        </div>
        <div className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Ventas junio', n(month.salesCount), `${n(month.salesUf)} UF`],
            ['Ventas enero–junio', n(crm.ytd.salesCount), `${n(crm.ytd.salesUf)} UF`],
            ['Stock junio', n(month.stockCount), `${n(stockReduction)} menos que enero`],
            ['Cobertura CRM', `${n(crm.quality.sourceCoverage, 1)}%`, `${sourceCount} libros auditados`],
          ].map(([label, value, detail]) => (
            <article key={label} className="bg-[#0c1111] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">Hallazgos clave</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Qué requiere atención</h2>
          <div className="mt-4 border-t border-[var(--n3-line)]">
            {findings.map((finding, index) => (
              <Link key={finding.title} href={finding.href} className="group grid gap-4 border-b border-[var(--n3-line)] py-5 sm:grid-cols-[42px_1fr_auto] sm:items-start">
                <span className="text-sm font-semibold text-[#ff766f]">0{index + 1}</span>
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{finding.eyebrow}</span>
                  <strong className="mt-2 block text-lg font-semibold">{finding.title}</strong>
                  <span className="mt-2 block max-w-2xl text-sm leading-6 text-[var(--n3-text-muted)]">{finding.detail}</span>
                </span>
                <span className="text-sm text-[var(--n3-text-muted)] transition group-hover:translate-x-1 group-hover:text-white">→</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">Próximas acciones</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Continuar análisis</h2>
          <div className="mt-5 space-y-3">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="group block border border-[var(--n3-line)] p-4 transition hover:border-[#d7332b] hover:bg-[#160d0c]">
                <span className="flex items-center justify-between gap-4">
                  <strong className="text-sm font-semibold">{action.label}</strong>
                  <span className="text-[var(--n3-text-muted)] transition group-hover:translate-x-1 group-hover:text-white">→</span>
                </span>
                <span className="mt-2 block text-xs leading-5 text-[var(--n3-text-muted)]">{action.detail}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="border border-[var(--n3-line)] bg-[#0c1111]">
          <div className="border-b border-[var(--n3-line)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Evolución 2026</p>
            <h2 className="mt-2 text-xl font-semibold">Cierres y volumen por mes</h2>
          </div>
          <div>
            {crm.months.map((item) => (
              <div key={item.period} className="grid grid-cols-[90px_1fr_auto] gap-4 border-b border-[var(--n3-line)] px-5 py-4 last:border-0">
                <strong className="text-sm text-[#ff766f]">{item.period}</strong>
                <span className="text-sm">{n(item.salesCount)} cierres</span>
                <span className="text-sm text-[var(--n3-text-muted)]">{n(item.salesUf)} UF</span>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Cobertura de información</p>
          <h2 className="mt-2 text-xl font-semibold">Universos auditados</h2>
          <div className="mt-5 space-y-4">
            {[
              ['Publicaciones sin señal de arriendo', valuation.sourceReconciliation.currentPortalSaleEligibleListings],
              ['Excluidas por señal de arriendo', valuation.sourceReconciliation.portalListingsQuarantinedByRentIndicator],
              ['Eventos registrales CBRS', market.cross.cbrs.candidateKeyCardinality.event_comuna_tomo_foja_numero_fecha.unique],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-end justify-between gap-4 border-b border-[var(--n3-line)] pb-3">
                <span className="text-sm text-[var(--n3-text-muted)]">{label as string}</span>
                <strong className="text-2xl">{n(value as number)}</strong>
              </div>
            ))}
          </div>
          <p className="mt-5 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">
            Portal, CBRS y CRM no se suman ni se sustituyen entre sí; cada universo conserva su definición.
          </p>
        </article>
      </section>

      <section className="flex flex-col justify-between gap-4 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)] sm:flex-row sm:items-center">
        <span>Property Partners Vitacura · Información de uso interno</span>
        <span>Motor de inteligencia N3uralia</span>
      </section>
    </div>
  )
}
