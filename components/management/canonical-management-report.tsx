'use client'

import canonical from '@/data/management-canonical-pages.json'

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })

function StatusBadge({ value, type }: { value: number; type: 'goal' | 'yoy' }) {
  const status = type === 'goal'
    ? value < 90 ? 'Rojo' : value < 100 ? 'Amarillo' : 'Verde'
    : value < 0 ? 'Rojo' : value < 20 ? 'Amarillo' : 'Verde'
  return <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{status}</span>
}

export function CanonicalManagementReport() {
  const cover = canonical.pages.find((page) => page.page === 1)
  const sales = canonical.pages.find((page) => page.page === 4)
  const evolution = canonical.pages.find((page) => page.page === 5)

  if (!cover || !sales?.monthly || !sales.cumulative || !evolution?.months || !evolution.series) return null

  const monthly = sales.monthly
  const cumulative = sales.cumulative
  const months = evolution.months
  const series = evolution.series
  const reportMonth = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${monthly.period}-01T12:00:00Z`))

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-black px-6 py-10 text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-white/60">Fuente canónica · {reportMonth}</p>
        <h1 className="mt-3 text-3xl font-semibold">{cover.title}</h1>
        <p className="mt-2 text-white/80">{cover.subtitle}</p>
        <p className="mt-1 text-sm text-white/60">{cover.caption}</p>
      </header>

      <section className="rounded-2xl border bg-background p-6">
        <h2 className="text-2xl font-semibold">Modelo de Scoring — Definiciones</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Calidad de Gestión = 40% Calidad de Cartera + 30% Calidad de Seguimiento + 30% Calidad de Conversión.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            ['Calidad de Cartera', canonical.definitions.portfolioQuality],
            ['Calidad de Seguimiento', canonical.definitions.followUpQuality],
            ['Calidad de Conversión', canonical.definitions.conversionQuality],
          ].map(([title, items]) => (
            <article key={String(title)} className="rounded-xl border p-4">
              <h3 className="font-semibold">{String(title)}</h3>
              <div className="mt-3 space-y-4">
                {(items as typeof canonical.definitions.portfolioQuality).map((item) => (
                  <div key={item.key}>
                    <p className="text-sm font-medium">{item.label}</p>
                    <code className="mt-1 block overflow-x-auto rounded bg-muted px-2 py-1 text-xs">{item.formula}</code>
                    <p className="mt-1 text-xs text-muted-foreground">{item.meaning}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-muted-foreground">PL Real Estate SpA</p>
          <h2 className="text-2xl font-semibold">{sales.title}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Cierres del mes', monthly.closings.actual, monthly.closings.goal, monthly.closings.compliancePercent, monthly.closings.yoyPercent],
            ['UF del mes', monthly.salesUf.actual, monthly.salesUf.goal, monthly.salesUf.compliancePercent, monthly.salesUf.yoyPercent],
            ['Cierres acumulados', cumulative.closings.actual, cumulative.closings.goal, cumulative.closings.compliancePercent, cumulative.closings.yoyPercent],
            ['UF acumuladas', cumulative.salesUf.actual, cumulative.salesUf.goal, cumulative.salesUf.compliancePercent, cumulative.salesUf.yoyPercent],
          ].map(([label, actual, goal, compliance, yoy]) => (
            <article key={String(label)} className="rounded-xl border bg-background p-5">
              <p className="text-sm text-muted-foreground">{String(label)}</p>
              <p className="mt-2 text-3xl font-semibold">{number.format(Number(actual))}</p>
              <p className="mt-1 text-sm">Meta: {number.format(Number(goal))}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span>{Number(compliance)}% cumplimiento</span>
                <StatusBadge value={Number(compliance)} type="goal" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span>{yoy == null ? 'AA: —' : `${Number(yoy) > 0 ? '+' : ''}${Number(yoy)}% AA`}</span>
                {yoy == null ? null : <StatusBadge value={Number(yoy)} type="yoy" />}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-background p-6">
        <h2 className="text-2xl font-semibold">Evolución de venta</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4">Indicador</th>
                {months.map((month) => <th key={month} className="px-3 py-3 text-right">{month}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Cierres mes', series.monthlyClosings],
                ['UF mes', series.monthlySalesUf],
                ['Meta cierres mes', series.monthlyClosingGoals],
                ['Meta UF mes', series.monthlySalesUfGoals],
                ['Cierres acumulados', series.cumulativeClosings],
                ['UF acumuladas', series.cumulativeSalesUf],
                ['Cumplimiento cierres', series.cumulativeClosingCompliancePercent.map((v) => `${v}%`)],
                ['Cumplimiento UF', series.cumulativeSalesUfCompliancePercent.map((v) => `${v}%`)],
              ].map(([label, values]) => (
                <tr key={String(label)} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{String(label)}</td>
                  {(values as Array<number | string>).map((value, index) => (
                    <td key={`${label}-${index}`} className="px-3 py-3 text-right">{typeof value === 'number' ? number.format(value) : value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-background p-6">
        <h2 className="text-xl font-semibold">Definiciones pendientes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sólo permanecen abiertos los puntos que el reporte de agosto no define explícitamente. No se completan por inferencia.</p>
        <ol className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          {canonical.pendingDefinitions.map((item, index) => (
            <li key={item} className="rounded-lg bg-muted/50 p-3"><span className="font-medium">{index + 1}.</span> {item}</li>
          ))}
        </ol>
      </section>
    </main>
  )
}
