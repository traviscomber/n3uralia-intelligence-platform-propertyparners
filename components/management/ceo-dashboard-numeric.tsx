'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'

type Metric = {
  code: string
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score'
  value: number | null
  target: number | null
  compliance: number | null
}

type Entity = {
  entityType: string
  metrics: Metric[]
}

type Summary = {
  periodLabel: string
  entities: Entity[]
}

type Operations = {
  valuations: { review: number }
  assignments: { paused: number }
  tasks: { overdue: number; urgent: number }
}

const metric = (entity: Entity | undefined, code: string) =>
  entity?.metrics.find((item) => item.code === code)

const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? '—'
    : value.toLocaleString('es-CL', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

const percent = (value: number | null | undefined) =>
  value == null ? '—' : `${number(value, 1)}%`

const uf = (value: number | null | undefined) =>
  value == null ? '—' : `${number(value)} UF`

export function CeoDashboardNumeric() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [operations, setOperations] = useState<Operations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function load() {
    setLoading(true)
    setError(false)

    try {
      const [summaryResponse, operationsResponse] = await Promise.all([
        fetch('/api/management/summary', { cache: 'no-store' }),
        fetch('/api/management/ceo-operations', { cache: 'no-store' }),
      ])

      if (!summaryResponse.ok || !operationsResponse.ok) throw new Error('LOAD_FAILED')

      const [summaryData, operationsData] = await Promise.all([
        summaryResponse.json(),
        operationsResponse.json(),
      ])

      setSummary(summaryData)
      setOperations(operationsData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const company = summary?.entities.find((entity) => entity.entityType === 'company')
  const sales = metric(company, 'sales')
  const salesUf = metric(company, 'sales_uf')
  const stock = metric(company, 'stock')
  const gap = sales?.value != null && sales?.target != null ? sales.value - sales.target : null
  const decisions = useMemo(
    () =>
      (operations?.tasks.overdue ?? 0) +
      (operations?.valuations.review ?? 0) +
      (operations?.assignments.paused ?? 0),
    [operations],
  )

  if (loading) {
    return <main className="min-h-screen bg-[#050707] p-6 text-white">Cargando…</main>
  }

  if (error || !summary || !operations) {
    return (
      <main className="min-h-screen bg-[#050707] p-6 text-white">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold"
        >
          <RefreshCw size={16} /> Reintentar
        </button>
      </main>
    )
  }

  const cards = [
    ['Cierres', number(sales?.value)],
    ['Meta', number(sales?.target)],
    ['Cumplimiento', percent(sales?.compliance)],
    ['Brecha', number(gap, 1)],
    ['UF', uf(salesUf?.value)],
    ['Cartera', number(stock?.value)],
    ['Tareas vencidas', number(operations.tasks.overdue)],
    ['Decisiones', number(decisions)],
  ]

  return (
    <main className="min-h-screen bg-[#050707] px-5 py-6 text-white md:px-8 md:py-8">
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">CEO</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{summary.periodLabel}</h1>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="min-h-40 bg-[#0b0f0f] p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
            <p className="mt-7 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">{value}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
