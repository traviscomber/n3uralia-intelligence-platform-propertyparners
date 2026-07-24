import Link from 'next/link'
import { getLiveDashboardData } from '@/lib/dashboard-live-adapter'

function format(value: number) {
  return value.toLocaleString('es-CL')
}

export default async function DashboardHome() {
  const data = await getLiveDashboardData()

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-16">
      <header className="border-b border-[var(--n3-line)] pb-8 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff766f]">
          N3uralia Executive Intelligence
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.03em]">
          Resumen de gestión en vivo
        </h1>
        <p className="mt-4 text-sm text-[var(--n3-text-muted)]">
          Datos conectados desde la capa de inteligencia productiva.
        </p>
      </header>

      <section className="grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-4">
        {[
          ['Portfolio', data.portfolio],
          ['Evidence', data.evidenceCount],
          ['Decisions', data.decisionCount],
          ['Market Signals', data.marketSignalCount],
        ].map(([label, value]) => (
          <article key={label as string} className="bg-[#0c1111] p-6">
            <p className="text-xs uppercase tracking-wider text-[var(--n3-text-muted)]">{label}</p>
            <p className="mt-4 text-3xl font-semibold">
              {typeof value === 'number' ? format(value) : 'LIVE'}
            </p>
          </article>
        ))}
      </section>

      <section className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
        <p className="text-xs uppercase tracking-wider text-[#ff766f]">Intelligence Pipeline</p>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          {['Data', 'Evidence', 'Reasoning', 'Decision', 'Action'].map((item) => (
            <div key={item} className="border border-[var(--n3-line)] p-4 text-sm">
              {item}
            </div>
          ))}
        </div>
      </section>

      <Link href="/dashboard/ceo" className="text-sm text-[#ff766f]">
        Abrir vista ejecutiva →
      </Link>
    </div>
  )
}
