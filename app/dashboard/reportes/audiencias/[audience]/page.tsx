import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAudienceData } from '@/lib/report-audiences'

function n(value: number | null | undefined, digits = 0) { return value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: digits }) }

function Scores({ item }: { item: { scores: { management: number; portfolio: number; followUp: number; conversion: number; classification: string; source: { deck: string; slide: number } } } }) {
  return <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">Calidad gestión</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.scores.classification}</p></div><strong className="text-4xl text-[var(--n3-teal)]">{n(item.scores.management, 1)}</strong></div><div className="mt-4 grid grid-cols-3 gap-px bg-[var(--n3-line)] text-center"><div className="bg-black p-3"><small>Cartera · 40%</small><p>{n(item.scores.portfolio, 1)}</p></div><div className="bg-black p-3"><small>Seguim. · 30%</small><p>{n(item.scores.followUp, 1)}</p></div><div className="bg-black p-3"><small>Conversión · 30%</small><p>{n(item.scores.conversion, 1)}</p></div></div><p className="mt-3 text-[10px] text-[var(--n3-text-muted)]">{item.scores.source.deck} · lámina {item.scores.source.slide}</p></div>
}

function Card({ item }: { item: any }) {
  return <article className="border border-[var(--n3-line)] bg-[var(--n3-card)] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{item.branch}</p><h2 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">{item.name}</h2></div><div className="text-right"><p className="text-2xl font-semibold text-[var(--n3-text-light)]">{n(item.salesSummary.currentSalesCount)}</p><p className="text-[10px] text-[var(--n3-text-muted)]">cierres junio</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="border border-[var(--n3-line)] p-3"><small className="text-[var(--n3-text-muted)]">UF junio</small><p className="mt-1 font-semibold">{n(item.salesSummary.currentSalesUf)} UF</p></div><div className="border border-[var(--n3-line)] p-3"><small className="text-[var(--n3-text-muted)]">UF acumulada</small><p className="mt-1 font-semibold">{n(item.salesSummary.cumulativeSalesUf)} UF</p></div></div><Scores item={item} /></article>
}

export default async function AudiencePage({ params, searchParams }: { params: Promise<{ audience: string }>; searchParams: Promise<{ branch?: string }> }) {
  const { audience } = await params
  const { branch } = await searchParams
  const data = getAudienceData(audience)
  if (!data) notFound()
  const title = data.kind === 'ceo' ? 'Reporte CEO' : data.kind === 'director-cuenta' ? 'Reportes Director de Cuenta' : 'Reportes Ejecutivo / Partner'
  const items = data.kind === 'ceo' ? data.branches : data.kind === 'director-cuenta' ? data.branches : data.partners.filter((item) => !branch || item.branch === branch)
  return <div className="mx-auto max-w-7xl space-y-6 pb-16"><header className="border-b border-[var(--n3-line)] pb-6"><Link href="/dashboard/reportes/autonomos" className="text-xs font-semibold text-[var(--n3-teal)]">← Todos los reportes</Link><h1 className="mt-4 text-4xl font-semibold text-[var(--n3-text-light)]">{title}</h1><p className="mt-3 text-sm text-[var(--n3-text-muted)]">Snapshot auditado enero–junio 2026 · venta · Vitacura</p></header>
    {data.kind === 'ceo' ? <section className="grid gap-px bg-[var(--n3-line)] md:grid-cols-4">{[['Cierres junio', data.company.salesSummary.currentSalesCount], ['UF junio', data.company.salesSummary.currentSalesUf], ['Cierres acumulados', data.company.salesSummary.cumulativeSalesCount], ['UF acumulada', data.company.salesSummary.cumulativeSalesUf]].map(([label,value]) => <div key={label as string} className="bg-[var(--n3-card)] p-5"><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{label as string}</p><p className="mt-2 text-3xl font-semibold">{n(value as number)}</p></div>)}</section> : null}
    {data.kind === 'ejecutivo' ? <nav className="flex flex-wrap gap-2">{Array.from(new Set(data.partners.map((item) => item.branch))).map((name) => <Link key={name} href={`/dashboard/reportes/audiencias/ejecutivo?branch=${encodeURIComponent(name)}`} className="border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-text-muted)] hover:border-[var(--n3-teal)]">{name}</Link>)}</nav> : null}
    <section className="grid gap-4 xl:grid-cols-3">{items.map((item) => <Card key={`${item.branch}-${item.name}`} item={item} />)}</section>
    <footer className="border-l-2 border-[var(--n3-teal)] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Valores y clasificaciones reproducidos desde las presentaciones auditadas. Los ceros fuente permanecen como cero; los ausentes se muestran como n/d.</footer>
  </div>
}

