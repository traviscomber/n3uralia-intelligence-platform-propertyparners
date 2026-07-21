import Link from 'next/link'
import { getBranchTargetPerformance, getCompanySalesCompliance, getTargetSource } from '@/lib/targets-2026'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function format(value: number | null, unit?: string) {
  if (value === null) return 'n/d'
  const formatted = value.toLocaleString('es-CL', { maximumFractionDigits: unit === 'uf' ? 0 : 2 })
  return unit === 'uf' ? `UF ${formatted}` : formatted
}

export default async function TargetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams
  const monthNumber = Math.min(12, Math.max(1, Number(params.month) || 6))
  const period = `2026-${String(monthNumber).padStart(2, '0')}`
  const source = getTargetSource()
  const branches = getBranchTargetPerformance(period)
  const companySales = getCompanySalesCompliance(period)

  return (
    <div className="space-y-8 pb-14">
      <header className="rounded-2xl border border-[#dfe9e5] bg-[linear-gradient(135deg,#0d1714_0%,#172923_68%,#244137_100%)] p-7 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ed0bf]">Metas 2026 · revisión 202607</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Gestión por metas con trazabilidad total</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d9e7e1]">Tres libros reales, siete métricas y cada celda fuente preservada. Las diferencias de origen se muestran; no se corrigen, promedian ni omiten.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-right">
            <div className="text-xs text-[#b9ccc5]">Ventas Vitacura · {MONTHS[monthNumber - 1]} 2026</div>
            <div className="mt-1 text-2xl font-bold">{format(companySales.actual)} / {format(companySales.target)}</div>
            <div className="text-xs text-[#9ed0bf]">{companySales.compliance === null ? 'Cumplimiento n/d' : `${companySales.compliance}% de la meta fuente`}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Libros', source.cellCoverage.workbookCount],
          ['Celdas almacenadas', source.cellCoverage.storedCells],
          ['Celdas con contenido', source.cellCoverage.populatedCells],
          ['Fórmulas', source.cellCoverage.formulaCells],
          ['Errores de fórmula', source.cellCoverage.formulaErrorCells],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#e2e9e6] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#728079]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#102019]">{Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Mes de metas">
        {MONTHS.map((label, index) => (
          <Link key={label} href={`/dashboard/metas?month=${index + 1}`} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: index + 1 === monthNumber ? '#183f34' : '#dfe7e3', background: index + 1 === monthNumber ? '#183f34' : '#fff', color: index + 1 === monthNumber ? '#fff' : '#43534c' }}>{label}</Link>
        ))}
      </nav>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Incidencias conservadas</p>
            <p className="mt-1 text-sm text-amber-950">{source.quality.criticalCount} críticas y {source.quality.issueCount} observaciones de origen. El estado no invalida ni borra la data.</p>
          </div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">{source.status}</span>
        </div>
      </section>

      {branches.map((branch) => (
        <section key={branch.branch} className="space-y-4 rounded-2xl border border-[#dfe8e4] bg-[#f8faf9] p-5 lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#688078]">Sucursal</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#102019]">{branch.branch}</h2>
            </div>
            <p className="text-xs text-[#718078]">Fuente: {branch.file}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {branch.metrics.map((metric) => (
              <article key={metric.metric} className="rounded-xl border border-[#e1e9e5] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#718078]">{metric.label}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div><p className="text-xs text-[#718078]">Real CRM</p><p className="text-xl font-bold text-[#102019]">{format(metric.actual, metric.unit)}</p></div>
                  <div className="text-right"><p className="text-xs text-[#718078]">Meta fuente</p><p className="text-xl font-bold text-[#1b6451]">{format(metric.target, metric.unit)}</p></div>
                </div>
                <p className="mt-2 text-xs text-[#66756e]">{metric.compliance === null ? metric.compatibility === 'definition_pending' ? 'Cumplimiento pendiente de definición: agendada vs realizada.' : metric.compatibility === 'actual_unavailable' ? 'No existe actual compatible en CRM.' : 'Atribución CRM no disponible.' : `${metric.compliance}% de cumplimiento`}</p>
                {metric.reconciliation && !metric.reconciliation.exact && <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Fuente: total vs partners difiere en {format(metric.reconciliation.delta, metric.unit)}</p>}
              </article>
            ))}
          </div>

          <div className="space-y-4">
            {branch.metrics.map((metric) => (
              <details key={metric.metric} className="overflow-hidden rounded-xl border border-[#e1e9e5] bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#173b31]">Detalle completo · {metric.label} · {metric.partners.length} filas fuente</summary>
                <div className="overflow-x-auto border-t border-[#edf2f0]">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-[#f4f7f5] text-[#607169]"><tr><th className="px-4 py-2">Fila</th><th className="px-4 py-2">Partner fuente</th><th className="px-4 py-2">Marca fuente</th><th className="px-4 py-2">Meta {MONTHS[monthNumber - 1]}</th>{metric.annualValues.map((annual) => <th key={annual.cell} className="px-4 py-2">{annual.header} · col. {annual.column}</th>)}</tr></thead>
                    <tbody>
                      {metric.partners.map((partner) => (
                        <tr key={partner.sourceRow} className="border-t border-[#edf2f0]">
                          <td className="px-4 py-2 text-[#75827c]">{partner.sourceRow}</td>
                          <td className="px-4 py-2 font-medium text-[#1b2b25]">{partner.name ?? 'Sin nombre'} {partner.identityStatus === 'unresolved' && <span className="ml-2 text-red-700">Identidad no resuelta</span>}</td>
                          <td className="px-4 py-2">{partner.sourceColor ? <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: partner.sourceColor === 'green' ? '#92d050' : '#ff0000' }} />{partner.sourceColor}</span> : 'sin marca'}</td>
                          <td className="px-4 py-2 font-semibold">{format(partner.target, metric.unit)}</td>
                          {partner.annualValues.map((annual) => <td key={annual.cell} className="px-4 py-2">{format(annual.value, metric.unit)} <span className="text-[#87928d]">({annual.cell})</span></td>)}
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[#cbd8d2] bg-[#f7faf8] font-bold"><td className="px-4 py-2" colSpan={3}>Total sucursal fuente</td><td className="px-4 py-2">{format(metric.target, metric.unit)}</td>{metric.annualValues.map((annual) => <td key={annual.cell} className="px-4 py-2">{format(annual.value, metric.unit)} <span className="font-normal text-[#87928d]">({annual.cell})</span></td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>

          {branch.unmappedCells.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-800">Celdas fuera de bloque preservadas</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">{branch.unmappedCells.map((cell) => <div key={cell.address} className="rounded-lg bg-white px-3 py-2 text-xs text-red-950"><strong>{cell.address}</strong> · {String(cell.value)}{cell.formula ? ` · fórmula ${cell.formula}` : ''}</div>)}</div>
            </div>
          )}
        </section>
      ))}

      <footer className="rounded-xl border border-[#dfe8e4] bg-white p-5 text-xs leading-5 text-[#5f7068]">
        El manifiesto privado conserva las {source.cellCoverage.storedCells.toLocaleString('es-CL')} celdas almacenadas con dirección, valor, fórmula, tipo, formato, estilo y color. Las columnas anuales paralelas se muestran en forma independiente. Los colores se describen como marcas de la fuente y no se interpretan como estado laboral.
      </footer>
    </div>
  )
}
