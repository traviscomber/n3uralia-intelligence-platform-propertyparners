'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, FileText, RefreshCw } from 'lucide-react'

type Metric = {
  code: string
  unit: 'count' | 'uf' | 'percent' | 'days' | 'score'
  value: number | null
  target: number | null
  compliance: number | null
  mom?: number | null
  yoy?: number | null
}

type Evolution = {
  period: string
  sales: number | null
  salesTarget: number | null
}

type Entity = {
  id: string
  name: string
  entityType: string
  metrics: Metric[]
  evolution?: Evolution[]
}

type Summary = {
  periodLabel: string
  generatedAt?: string
  entities: Entity[]
}

type Operations = {
  valuations: { review: number }
  assignments: { paused: number }
  market: { properties: number; confirmed: number; pendingIdentity: number }
  tasks: { overdue: number; urgent: number }
  errors: string[]
  generatedAt: string
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

const signed = (value: number | null | undefined, suffix = '') =>
  value == null ? '—' : `${value > 0 ? '+' : ''}${number(value, 1)}${suffix}`

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

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
  const branches = summary?.entities.filter((entity) => entity.entityType === 'branch') ?? []
  const sales = metric(company, 'sales')
  const salesUf = metric(company, 'sales_uf')
  const stock = metric(company, 'stock')
  const conversion = metric(company, 'conversion')
  const cumulativeSales = metric(company, 'cumulative_sales')
  const cumulativeUf = metric(company, 'cumulative_sales_uf')
  const portfolioChange = metric(company, 'portfolio_net_change')
  const gap = sales?.value != null && sales?.target != null ? sales.value - sales.target : null

  const branchRows = useMemo(
    () => branches
      .map((branch) => ({
        id: branch.id,
        name: branch.name,
        sales: metric(branch, 'sales'),
        uf: metric(branch, 'sales_uf'),
        conversion: metric(branch, 'conversion'),
      }))
      .sort((a, b) => Number(a.sales?.compliance ?? 999) - Number(b.sales?.compliance ?? 999)),
    [branches],
  )

  const weakestBranch = branchRows[0]
  const strongestBranch = [...branchRows]
    .filter((item) => item.sales?.compliance != null)
    .sort((a, b) => Number(b.sales?.compliance) - Number(a.sales?.compliance))[0]

  const insights = [
    {
      label: 'Riesgo',
      value: weakestBranch ? `${weakestBranch.name} ${percent(weakestBranch.sales?.compliance)}` : '—',
      href: weakestBranch ? `/dashboard/reportes/${encodeURIComponent(weakestBranch.id)}` : '/dashboard/ceo',
    },
    {
      label: 'Oportunidad',
      value: strongestBranch ? `${strongestBranch.name} ${percent(strongestBranch.sales?.compliance)}` : '—',
      href: strongestBranch ? `/dashboard/reportes/${encodeURIComponent(strongestBranch.id)}` : '/dashboard/ceo',
    },
    {
      label: 'Cambio',
      value: sales?.mom != null ? `Cierres ${signed(sales.mom, '%')}` : `Cartera ${signed(portfolioChange?.mom, '%')}`,
      href: '/dashboard/ceo/reporte',
    },
  ]

  const cards = [
    ['Cierres', number(sales?.value), `Meta ${number(sales?.target)}`],
    ['Cumplimiento', percent(sales?.compliance), `Brecha ${number(gap, 1)}`],
    ['UF', uf(salesUf?.value), `Acum. ${uf(cumulativeUf?.value)}`],
    ['Cartera', number(stock?.value), signed(portfolioChange?.mom, '%')],
    ['Conversión', number(conversion?.value, 1), 'Score'],
    ['Críticos', number((operations?.tasks.overdue ?? 0) + (operations?.tasks.urgent ?? 0)), 'Vencidas + urgentes'],
  ]

  function exportCsv() {
    if (!summary || !operations) return
    const rows = [
      ['Periodo', summary.periodLabel],
      ['Cierres', sales?.value],
      ['Meta', sales?.target],
      ['Cumplimiento', sales?.compliance],
      ['Cierres acumulados', cumulativeSales?.value],
      ['UF', salesUf?.value],
      ['UF acumuladas', cumulativeUf?.value],
      ['Cartera', stock?.value],
      ['Conversión', conversion?.value],
      ['Tareas vencidas', operations.tasks.overdue],
      ['Tareas urgentes', operations.tasks.urgent],
      ['Valorizaciones en revisión', operations.valuations.review],
      ['Asignaciones pausadas', operations.assignments.paused],
      ['Propiedades sin identidad', operations.market.pendingIdentity],
    ]
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ceo-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <main className="min-h-screen bg-[#050707] p-6 text-white">Cargando…</main>
  }

  if (error || !summary || !operations) {
    return (
      <main className="min-h-screen bg-[#050707] p-6 text-white">
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold">
          <RefreshCw size={16} /> Reintentar
        </button>
      </main>
    )
  }

  const updatedAt = new Date(summary.generatedAt || operations.generatedAt)
  const freshness = Number.isNaN(updatedAt.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(updatedAt)

  return (
    <main className="min-h-screen bg-[#050707] px-5 py-6 text-white md:px-8 md:py-8">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">CEO · {freshness}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{summary.periodLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 bg-white/8 px-4 py-2.5 text-sm"><RefreshCw size={15} /> Actualizar</button>
          <Link href="/dashboard/reportes/crear" className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-2.5 text-sm font-semibold"><FileText size={15} /> Informe</Link>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 bg-white/8 px-4 py-2.5 text-sm"><Download size={15} /> Exportar</button>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden bg-white/10 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value, subvalue]) => (
          <article key={label} className="bg-[#0b0f0f] p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</p>
            <p className="mt-5 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
            <p className="mt-2 text-xs tabular-nums text-white/40">{subvalue}</p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-white/45">Inteligencia</p>
        <div className="grid gap-px bg-white/10 md:grid-cols-3">
          {insights.map((item) => (
            <Link key={item.label} href={item.href} className="bg-[#0b0f0f] p-5 transition hover:bg-[#101616]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">{item.label}</p>
              <p className="mt-3 text-lg font-semibold tabular-nums">{item.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-2">
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-white/45">Mercado</p>
          <div className="grid gap-px bg-white/10 sm:grid-cols-4">
            {[
              ['Oferta', operations.market.properties],
              ['Confirmadas', operations.market.confirmed],
              ['Sin identidad', operations.market.pendingIdentity],
              ['Variación cartera', portfolioChange?.mom == null ? '—' : `${signed(portfolioChange.mom, '%')}`],
            ].map(([label, value]) => (
              <article key={label} className="bg-[#0b0f0f] p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{typeof value === 'number' ? number(value) : value}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-white/45">Gestión</p>
          <div className="grid gap-px bg-white/10 sm:grid-cols-5">
            {[
              ['Vencidas', operations.tasks.overdue],
              ['Urgentes', operations.tasks.urgent],
              ['Revisión', operations.valuations.review],
              ['Pausadas', operations.assignments.paused],
              ['Sin identidad', operations.market.pendingIdentity],
            ].map(([label, value]) => (
              <article key={label} className="bg-[#0b0f0f] p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{number(Number(value))}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Oficinas</p>
          <Link href="/dashboard/reportes/autonomos" className="text-xs text-white/45 hover:text-white">Ver detalle</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
              <tr><th className="py-3 pr-4">Oficina</th><th className="px-4 py-3">Cierres</th><th className="px-4 py-3">Meta</th><th className="px-4 py-3">%</th><th className="px-4 py-3">UF</th><th className="px-4 py-3">Conversión</th></tr>
            </thead>
            <tbody>
              {branchRows.map((row) => (
                <tr key={row.id} className="border-b border-white/8 text-sm tabular-nums">
                  <td className="py-4 pr-4 font-medium">{row.name}</td>
                  <td className="px-4 py-4">{number(row.sales?.value)}</td>
                  <td className="px-4 py-4">{number(row.sales?.target)}</td>
                  <td className="px-4 py-4">{percent(row.sales?.compliance)}</td>
                  <td className="px-4 py-4">{uf(row.uf?.value)}</td>
                  <td className="px-4 py-4">{number(row.conversion?.value, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {operations.errors.length > 0 ? <p className="mt-5 text-xs text-[#ff766f]">Fuentes con error: {operations.errors.length}</p> : null}
    </main>
  )
}
