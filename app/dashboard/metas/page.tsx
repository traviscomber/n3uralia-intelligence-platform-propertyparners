import Link from 'next/link'
import { getBranchTargetPerformance, getCompanySalesCompliance, getTargetSource } from '@/lib/targets-2026'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function format(value: number | null, unit?: string) {
  if (value === null) return 'n/d'
  const formatted = value.toLocaleString('es-CL', { maximumFractionDigits: unit === 'uf' ? 0 : 2 })
  return unit === 'uf' ? `UF ${formatted}` : formatted
}

function formatSource(value: number | null, unit?: string) {
  if (value === null) return 'n/d'
  return unit === 'uf' ? `UF ${String(value)}` : String(value)
}

function ExactSourceValue({ value, displayedValue, unit }: { value: number | null; displayedValue?: string | null; unit?: string }) {
  return <span>{formatSource(value, unit)}{displayedValue !== null && displayedValue !== undefined && <span className="ml-2 font-normal text-[var(--n3-text-muted)]">Excel: {displayedValue}</span>}</span>
}

function issueContext(issue: object) {
  const row = issue as Record<string, unknown>
  return [row.period, row.cell ? `celda ${row.cell}` : null, row.sourceRow ? `fila ${row.sourceRow}` : null].filter(Boolean).join(' · ')
}

function issueExactDetails(issue: object) {
  const row = issue as Record<string, unknown>
  const details = [String(row.detail)]
  if ('delta' in row) details.push(`Total ${String(row.sourceTotal)} · suma partners ${String(row.partnerSum)} · diferencia ${String(row.delta)}.`)
  if ('value' in row) details.push(`Valor ${String(row.value)}${row.formula ? ` · fórmula ${String(row.formula)}` : ''}.`)
  if (Array.isArray(row.annualValues)) {
    details.push(row.annualValues.map((annual) => {
      const value = annual as Record<string, unknown>
      return `${String(value.cell)}=${String(value.value)}${value.formula ? ` [${String(value.formula)}]` : ''}`
    }).join(' · '))
  }
  return details.join(' ')
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
      <header className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-7 text-[var(--n3-text-light)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--n3-teal-soft)]">Metas 2026 · revisión 202607</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Gestión por metas con trazabilidad total</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Tres libros reales, siete métricas y cada celda fuente preservada. Las diferencias de origen se muestran; no se corrigen, promedian ni omiten.</p>
          </div>
          <div className="border border-[var(--n3-line)] bg-black/20 px-5 py-4 text-right">
            <div className="text-xs text-[var(--n3-text-muted)]">Ventas Vitacura · {MONTHS[monthNumber - 1]} 2026</div>
            <div className="mt-1 text-2xl font-bold">{format(companySales.actual)} / {format(companySales.target)}</div>
            <div className="text-xs text-[var(--n3-teal-soft)]">{companySales.compliance === null ? 'Cumplimiento n/d' : `${companySales.compliance}% de la meta fuente`}</div>
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
          <div key={label} className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--n3-text-light)]">{Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Mes de metas">
        {MONTHS.map((label, index) => (
          <Link key={label} href={`/dashboard/metas?month=${index + 1}`} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: index + 1 === monthNumber ? 'var(--n3-deep)' : 'var(--n3-line)', background: index + 1 === monthNumber ? 'var(--n3-deep)' : '#fff', color: index + 1 === monthNumber ? '#fff' : 'var(--n3-text-muted)' }}>{label}</Link>
        ))}
      </nav>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Incidencias conservadas</p>
            <p className="mt-1 text-sm text-amber-950">{source.quality.criticalCount} críticas y {source.quality.issueCount} observaciones de origen. El estado no invalida ni borra la data.</p>
            <p className="mt-1 text-xs text-amber-900">Además, {source.quality.displayRoundingDifferenceCount} totales mensuales difieren al sumar los números visibles redondeados por Excel; se controlan aparte y no se clasifican como error fuente.</p>
            <p className="mt-1 text-xs text-amber-900">Las {source.quality.fractionalMonthlyCountTargetCellCount.toLocaleString('es-CL')} celdas mensuales fraccionarias de metas de conteo se conservan sin redondear.</p>
          </div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">{source.status}</span>
        </div>
      </section>

      <details className="overflow-hidden rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--n3-text-light)]">Registro completo de {source.quality.issueCount} incidencias fuente</summary>
        <div className="overflow-x-auto border-t border-[var(--n3-line)]">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-[var(--n3-black)] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-2">Severidad</th><th className="px-4 py-2">Sucursal</th><th className="px-4 py-2">Métrica</th><th className="px-4 py-2">Referencia</th><th className="px-4 py-2">Detalle exacto</th></tr></thead>
            <tbody>{source.quality.issues.map((issue, index) => (
              <tr key={`${issue.code}-${issue.branch}-${index}`} className="border-t border-[var(--n3-line)] align-top">
                <td className="px-4 py-2 font-bold" style={{ color: issue.severity === 'critical' ? '#b91c1c' : 'var(--warning)' }}>{issue.severity}</td>
                <td className="px-4 py-2">{issue.branch}</td>
                <td className="px-4 py-2">{'metric' in issue ? issue.metric : 'fuera de bloque'}</td>
                <td className="px-4 py-2">{issueContext(issue) || 'bloque completo'}</td>
                <td className="px-4 py-2">{issueExactDetails(issue)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>

      {branches.map((branch) => (
        <section key={branch.branch} className="space-y-4 rounded-2xl border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--n3-text-muted)]">Sucursal</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--n3-text-light)]">{branch.branch}</h2>
            </div>
            <p className="text-xs text-[var(--n3-text-muted)]">Fuente: {branch.file}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {branch.metrics.map((metric) => (
              <article key={metric.metric} className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--n3-text-muted)]">{metric.label}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div><p className="text-xs text-[var(--n3-text-muted)]">Real CRM</p><p className="text-xl font-bold text-[var(--n3-text-light)]">{format(metric.actual, metric.unit)}</p></div>
                  <div className="text-right"><p className="text-xs text-[var(--n3-text-muted)]">Meta fuente</p><p className="text-xl font-bold text-[var(--success)]">{format(metric.target, metric.unit)}</p></div>
                </div>
                <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{metric.compliance === null ? metric.compatibility === 'definition_pending' ? 'Cumplimiento pendiente de definición: agendada vs realizada.' : metric.compatibility === 'actual_unavailable' ? 'No existe actual compatible en CRM.' : 'Atribución CRM no disponible.' : `${metric.compliance}% de cumplimiento`}</p>
                {metric.reconciliation && !metric.reconciliation.exact && <p className="mt-2 rounded-md bg-[#160d0c] px-2 py-1 text-xs font-semibold text-red-700">Fuente exacta: total {formatSource(metric.reconciliation.sourceTotal, metric.unit)} · partners {formatSource(metric.reconciliation.partnerSum, metric.unit)} · diferencia {formatSource(metric.reconciliation.delta, metric.unit)}</p>}
                {metric.reconciliation && !metric.reconciliation.display.exact && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">Vista Excel redondeada: total {formatSource(metric.reconciliation.display.sourceTotal, metric.unit)} · suma visible partners {formatSource(metric.reconciliation.display.partnerSum, metric.unit)} · diferencia visual {formatSource(metric.reconciliation.display.delta, metric.unit)}. No altera el valor crudo.</p>}
              </article>
            ))}
          </div>

          <div className="space-y-4">
            {branch.metrics.map((metric) => (
              <details key={metric.metric} className="overflow-hidden rounded-xl border border-[var(--n3-line)] bg-[var(--n3-deep)]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--n3-text-light)]">Detalle completo · {metric.label} · {metric.partners.length} filas fuente</summary>
                <div className="overflow-x-auto border-t border-[var(--n3-line)]">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-[var(--n3-black)] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-2">Fila</th><th className="px-4 py-2">Partner fuente</th><th className="px-4 py-2">Marca fuente</th><th className="px-4 py-2">Meta {MONTHS[monthNumber - 1]}</th>{metric.annualValues.map((annual) => <th key={annual.cell} className="px-4 py-2">{annual.header} · col. {annual.column}</th>)}</tr></thead>
                    <tbody>
                      {metric.partners.map((partner) => (
                        <tr key={partner.sourceRow} className="border-t border-[var(--n3-line)]">
                          <td className="px-4 py-2 text-[var(--n3-text-muted)]">{partner.sourceRow}</td>
                          <td className="px-4 py-2 font-medium text-[var(--n3-deep)]">
                            {partner.name ?? 'Sin nombre'}
                            {partner.identityStatus === 'unresolved' && <span className="ml-2 text-red-700">Identidad no resuelta</span>}
                            {partner.identityStatus === 'inferred_from_formula' && <span className="ml-2 text-amber-700">Inferida por fórmula: {partner.inferredName}</span>}
                          </td>
                          <td className="px-4 py-2">{partner.sourceColor ? <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: partner.sourceColor === 'green' ? 'var(--success)' : 'var(--destructive)' }} />{partner.sourceColor}</span> : 'sin marca'}</td>
                          <td className="px-4 py-2 font-semibold"><ExactSourceValue value={partner.target} displayedValue={partner.targetDisplayedValue} unit={metric.unit} /></td>
                          {partner.annualValues.map((annual) => <td key={annual.cell} className="px-4 py-2"><ExactSourceValue value={annual.value} displayedValue={annual.displayedValue} unit={metric.unit} /> <span className="text-[var(--n3-text-muted)]">({annual.cell})</span></td>)}
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[var(--n3-line)] bg-[var(--n3-deep)] font-bold"><td className="px-4 py-2" colSpan={3}>Total sucursal fuente</td><td className="px-4 py-2"><ExactSourceValue value={metric.target} displayedValue={metric.targetDisplayedValue} unit={metric.unit} /></td>{metric.annualValues.map((annual) => <td key={annual.cell} className="px-4 py-2"><ExactSourceValue value={annual.value} displayedValue={annual.displayedValue} unit={metric.unit} /> <span className="font-normal text-[var(--n3-text-muted)]">({annual.cell})</span></td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>

          {branch.unmappedCells.length > 0 && (
            <div className="rounded-xl border border-[var(--n3-line)] bg-[#160d0c] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">Celdas fuera de bloque preservadas</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">{branch.unmappedCells.map((cell) => <div key={cell.address} className="rounded-lg bg-[var(--n3-deep)] px-3 py-2 text-xs text-red-950"><strong>{cell.address}</strong> · {String(cell.value)}{cell.formula ? ` · fórmula ${cell.formula}` : ''}</div>)}</div>
            </div>
          )}
        </section>
      ))}

      <footer className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 text-xs leading-5 text-[var(--n3-text-muted)]">
        El manifiesto de auditoría conserva las {source.cellCoverage.storedCells.toLocaleString('es-CL')} celdas almacenadas con dirección, valor, visualización Excel, fórmula, tipo, formato, estilo y color. Las columnas anuales paralelas se muestran en forma independiente. Los colores se describen como marcas de la fuente y no se interpretan como estado laboral. El repositorio actual es público; el manifiesto no debe considerarse privado hasta migrarlo a almacenamiento servidor.
      </footer>
    </div>
  )
}
