import Link from 'next/link'
import { reportAudiences } from '@/lib/report-audiences'

export default function AutonomousReportsPage() {
  return <div className="mx-auto max-w-7xl space-y-8 pb-16">
    <header className="border-b border-[var(--n3-line)] pb-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--n3-teal)]">Generación programada · fuentes auditadas</p>
      <h1 className="mt-3 text-4xl font-semibold text-[var(--n3-text-light)]">Reportes por audiencia</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Cada reporte usa el alcance definido para su rol. No se generan recomendaciones, proyecciones ni datos ausentes.</p>
    </header>
    <section className="grid gap-4 lg:grid-cols-2">
      {reportAudiences.map((item, index) => <Link key={item.id} href={item.href} className="group border border-[var(--n3-line)] bg-[var(--n3-card)] p-6 transition hover:border-[var(--n3-teal)]">
        <div className="flex items-start justify-between gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">0{index + 1} · {item.units} {item.units === 1 ? 'reporte' : 'reportes'}</p><h2 className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{item.label}</h2></div><span className="text-2xl text-[var(--n3-teal)] transition group-hover:translate-x-1">→</span></div>
        <p className="mt-5 text-sm leading-6 text-[var(--n3-text-muted)]">{item.purpose}</p>
        <p className="mt-5 border-l-2 border-[var(--n3-teal)] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">{item.sourceScope}</p>
      </Link>)}
    </section>
    <section className="border border-[var(--n3-line)] bg-black p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7332b]">Regla editorial</p><p className="mt-3 max-w-4xl text-sm leading-6 text-[#aaa]">“Ejecutivo” se muestra también como “Partner” porque esa es la denominación presente en las fuentes. “Director de Cuenta” organiza la información real por sucursal; no altera scores, metas ni atribuciones.</p></section>
  </div>
}
