import Link from 'next/link'
import crm from '@/data/crm-intelligence.json'
import valuation from '@/data/valuation-intelligence.json'
import market from '@/data/market-source-intelligence.json'
import { buildBoardReport } from '@/lib/board-report'

function n(value: number | null, digits = 0) { return value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: digits }) }

export default function DashboardHome() {
  const report = buildBoardReport('2026-06')
  const month = crm.months.find((item) => item.period === report.period)!
  return <div className="mx-auto max-w-[1600px] space-y-7 pb-16">
    <header className="border border-[var(--n3-line)] bg-[#0c1111] p-8 lg:p-10"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ff766f]">Property Partners Vitacura · corte auditado</p><h1 className="mt-4 text-4xl font-semibold">Ventas Vitacura</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Vista ejecutiva construida únicamente desde los 84 Excel CRM, Metas 2026 y conciliaciones de las presentaciones. No consulta inventario vivo ni scrapers.</p><div className="mt-6 flex flex-wrap gap-2"><Link href="/dashboard/inteligencia" className="bg-[#d7332b] px-4 py-2 text-xs font-semibold text-white">Abrir Observatorio</Link><Link href="/dashboard/reportes/autonomos" className="border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold">Reportes auditados</Link></div></header>

    <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">{[
      ['Ventas junio', n(month.salesCount), `${n(month.salesUf)} UF`],
      ['Ventas enero–junio', n(crm.ytd.salesCount), `${n(crm.ytd.salesUf)} UF`],
      ['Stock junio', n(month.stockCount), `${n(Math.abs(crm.ytd.stockChange))} menos que enero`],
      ['Cobertura CRM', `${n(crm.quality.sourceCoverage, 1)}%`, `${crm.sourceInventory.workbookCount} libros auditados`],
    ].map(([label, value, detail]) => <article key={label} className="bg-[#0c1111] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{detail}</p></article>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]"><article className="border border-[var(--n3-line)] bg-[#0c1111]"><div className="border-b border-[var(--n3-line)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Evolución 2026</p><h2 className="mt-2 text-xl font-semibold">Cierres y volumen por mes</h2></div><div>{crm.months.map((item) => <div key={item.period} className="grid grid-cols-[90px_1fr_auto] gap-4 border-b border-[var(--n3-line)] px-5 py-4 last:border-0"><strong className="text-sm text-[#ff766f]">{item.period}</strong><span className="text-sm">{n(item.salesCount)} cierres</span><span className="text-sm text-[var(--n3-text-muted)]">{n(item.salesUf)} UF</span></div>)}</div></article><article className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Mercado enviado</p><h2 className="mt-2 text-xl font-semibold">Universos auditados</h2><div className="mt-5 space-y-4">{[
      ['Publicaciones sin señal de arriendo', valuation.sourceReconciliation.currentPortalSaleEligibleListings], ['Excluidas por señal de arriendo', valuation.sourceReconciliation.portalListingsQuarantinedByRentIndicator], ['Eventos registrales CBRS', market.cross.cbrs.candidateKeyCardinality.event_comuna_tomo_foja_numero_fecha.unique],
    ].map(([label,value]) => <div key={label as string} className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><span className="text-sm text-[var(--n3-text-muted)]">{label as string}</span><strong className="text-2xl">{n(value as number)}</strong></div>)}</div><p className="mt-5 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">Portal, CBRS y CRM no se suman ni se sustituyen entre sí; cada uno conserva su definición.</p></article></section>

    <section className="border border-[#d7332b] bg-[#160d0c] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff766f]">Calidad visible</p><div className="mt-3 grid gap-4 md:grid-cols-3"><div><strong className="text-2xl">{crm.quality.issues.length}</strong><p className="text-xs text-[var(--n3-text-muted)]">alertas CRM conservadas</p></div><div><strong className="text-2xl">{report.quality.targetIssues}</strong><p className="text-xs text-[var(--n3-text-muted)]">observaciones de Metas</p></div><div><strong className="text-2xl">{report.quality.presentationDifferences}</strong><p className="text-xs text-[var(--n3-text-muted)]">diferencias PPT conciliadas</p></div></div></section>
  </div>
}
