import type { ReactNode } from 'react'

type CalculationTraceProps = {
  title: string
  source: ReactNode
  universe: ReactNode
  filters?: ReactNode
  exclusions?: ReactNode
  formula?: ReactNode
  result?: ReactNode
  note?: ReactNode
}

export function CalculationTrace({
  title,
  source,
  universe,
  filters,
  exclusions,
  formula,
  result,
  note,
}: CalculationTraceProps) {
  const rows = [
    ['Fuente', source],
    ['Universo', universe],
    filters ? ['Filtros', filters] : null,
    exclusions ? ['Exclusiones', exclusions] : null,
    formula ? ['Fórmula', formula] : null,
    result ? ['Resultado', result] : null,
  ].filter((row): row is [string, ReactNode] => Boolean(row))

  return (
    <details className="border-t border-[var(--n3-line)] py-3">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-4 text-xs font-medium text-[var(--n3-text-light)]">
        <span>{title}</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Cómo se calcula</span>
      </summary>
      <dl className="mt-2 grid gap-x-5 gap-y-2 text-xs leading-5 sm:grid-cols-[110px_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[var(--n3-text-muted)]">{label}</dt>
            <dd className="min-w-0 text-[var(--n3-text-light)]">{value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-3 text-[11px] leading-5 text-[var(--n3-text-muted)]">{note}</p> : null}
    </details>
  )
}
