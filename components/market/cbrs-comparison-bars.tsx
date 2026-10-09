import type { AnnualCbrsMeasure } from '@/lib/market-pedro-history'
import { cbrsBarPercent, cbrsComparisonData, type CbrsChartMetric } from '@/lib/market-cbrs-chart'

const spanishInteger = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
function display(value: number | null, metric: CbrsChartMetric) {
  if (value === null) return '—'
  const printed = spanishInteger.format(value)
  return metric === 'medianPriceUf' ? 'UF ' + printed : printed
}

export function CbrsComparisonBars({
  rows,
  metric,
}: {
  rows: AnnualCbrsMeasure[]
  metric: CbrsChartMetric
}) {
  const data = cbrsComparisonData(rows, metric)
  const isSales = metric === 'transactions'
  const heading = isSales ? 'Compraventas por año' : 'Precio mediano de cierre'
  const description = isSales
    ? 'Inscripciones residenciales · cantidad de compraventas'
    : 'Mediana anual del precio registrado · UF'

  return <article className="min-w-0 border-t border-[var(--n3-line)] pt-5">
    <h3 className="text-lg font-semibold tracking-tight text-[var(--n3-text-light)]">{heading}</h3>
    <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{description}</p>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--n3-text-muted)]" aria-label="Leyenda">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 bg-[var(--n3-text-light)]" aria-hidden="true" />
        Casas
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 bg-[var(--n3-teal-soft)]" aria-hidden="true" />
        Departamentos
      </span>
    </div>

    {!data.hasData ? (
      <p role="status" className="mt-6 border-t border-[var(--n3-line)] py-5 text-sm text-[var(--n3-text-muted)]">
        No hay observaciones verificadas para mostrar este gráfico.
      </p>
    ) : <>
      <table className="sr-only">
        <caption>{heading}. {description}. Mismo eje desde cero para ambas categorías.</caption>
        <thead><tr><th scope="col">Año</th><th scope="col">Casas</th><th scope="col">Departamentos</th></tr></thead>
        <tbody>{data.years.map((entry) => <tr key={entry.year}>
          <th scope="row">{entry.year}</th>
          <td>{display(entry.values.Casa, metric)}</td>
          <td>{display(entry.values.Departamento, metric)}</td>
        </tr>)}</tbody>
      </table>

      <div className="mt-7" aria-hidden="true">
        <div className="grid grid-cols-[2.9rem_minmax(0,1fr)_4.25rem] items-end gap-x-2 sm:grid-cols-[3.4rem_minmax(0,1fr)_5rem] sm:gap-x-3">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">Año</span>
          <div className="relative h-6">
            {data.tickValues.map((tick, i) => (
              <span key={tick}
                style={{ left: (i * 25) + '%' }}
                className={'absolute bottom-1 whitespace-nowrap text-[10px] tabular-nums text-[var(--n3-text-muted)] ' +
                  (i === 0 ? '' : i === 4 ? '-translate-x-full' : '-translate-x-1/2') +
                  (i % 2 === 1 ? ' hidden sm:block' : '')}
              >{spanishInteger.format(tick)}</span>
            ))}
          </div>
          <span className="text-right text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)]">{isSales ? 'Ventas' : 'UF'}</span>
        </div>

        <div className="divide-y divide-[var(--n3-line)] border-t border-[var(--n3-line)]">
          {data.years.map((entry) => (
            <div key={entry.year} className="grid grid-cols-[2.9rem_minmax(0,1fr)_4.25rem] items-center gap-x-2 gap-y-3 py-4 sm:grid-cols-[3.4rem_minmax(0,1fr)_5rem] sm:gap-x-3">
              <span className="row-span-2 text-sm font-semibold tabular-nums text-[var(--n3-text-light)]">{entry.year}</span>
              {(['Casa', 'Departamento'] as const).map((type) => {
                const point = entry.values[type]
                const width = cbrsBarPercent(point, data.axisMaximum)
                return <div key={type} className="contents">
                  <div className="relative h-3.5 min-w-0 bg-white/[0.055]">
                    {width !== null ? <div
                      className={'relative h-full ' + (type === 'Casa'
                        ? 'bg-[var(--n3-text-light)]'
                        : 'bg-[var(--n3-teal-soft)]')}
                      style={{ width: width + '%' }}
                    /> : null}
                  </div>
                  <span className="text-right text-[11px] font-semibold tabular-nums text-[var(--n3-text-light)] sm:text-xs">
                    {point === null ? '—' : spanishInteger.format(point)}
                  </span>
                </div>
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[var(--n3-text-muted)]">
        Comparación con la misma escala para casas y departamentos; eje desde 0.
        {isSales ? ' Cada barra corresponde a compraventas inscritas en el año.' : ' Los precios medianos no ajustan por tamaño ni mezcla de inmuebles.'}
      </p>
    </>}
  </article>
}
