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

type Entity = {
  id: string
  name: string
  entityType: string
  metrics: Metric[]
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

const complianceTone = (value: number | null | undefined) => {
  if (value == null) return 'text-white'
  if (value >= 100) return 'text-[#78d59a]'
  if (value >= 80) return 'text-[#f0c96a]'
  return 'text-[#ff766f]'
}

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
  const cumulativeUf = metric(company, 'cumulative_sales_uf')
  const portfolioChange = metric(company, 'portfolio_net_change')
  const gap = sales?.value != null && sales?.target != null ? sales.value - sales.target : null
  const criticalCount = (operations?.tasks.overdue ?? 0) + (operations?.tasks.urgent ?? 0)

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
      value: weakestBranch ? `${weakestBranch.name} · ${percent(weakestBranch.sales?.compliance)}` : '—',
      href: weakestBranch ? `/dashboard/reportes/${encodeURIComponent(weakestBranch.id)}` : '/dashboard/ceo',
      tone: 'text-[#ff8d87]',
    },
    {
      label: 'Oportunidad',
      value: strongestBranch ? `${strongestBranch.name} · ${percent(strongestBranch.sales?.compliance)}` : '—',
      href: strongestBranch ? `/dashboard/reportes/${encodeURIComponent(strongestBranch.id)}` : '/dashboard/ceo',
      tone: 'text-[#8fdca8]',
    },
    {
      label: 'Cambio',
      value: sales?.mom != null ? `Cierres ${signed(sales.mom, '%')}` : `Cartera ${signed(portfolioChange?.mom, '%')}`,
      href: '/dashboard/ceo/reporte',
      tone: 'text-white',
    },
  ]

  const cards = [
    { label: 'Cierres', value: number(sales?.value), subvalue: `Meta ${number(sales?.target)}` },
    { label: 'Cumplimiento', value: percent(sales?.compliance), subvalue: `Brecha ${number(gap, 1)}`, tone: complianceTone(sales?.compliance) },
    { label: 'UF', value: uf(salesUf?.value), subvalue: `Acum. ${uf(cumulativeUf?.value)}` },
    { label: 'Cartera', value: number(stock?.value), subvalue: signed(portfolioChange?.mom, '%') },
    { label: 'Conversión', value: number(conversion?.value, 1), subvalue: 'Score' },
    { label: 'Críticos', value: number(criticalCount), subvalue: 'Vencidas + urgentes', tone: criticalCount > 0 ? 'text-[#ff766f]' : 'text-white' },
  ]

  function exportCsv() {
    if (!summary || !operations) return
    const rows = [
      ['Periodo', summary.periodLabel],
      ['Cierres', sales?.value],
      ['Meta', sales?.target],
      ['Cumplimiento', sales?.compliance],
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
    return <main role="status" className="min-h-screen bg-[#050707] p-6 text-sm text-white/55">Cargando datos…</main>
  }

  if (error || !summary || !operations) {
    return (
      <main className="min-h-screen bg-[#050707] p-6 text-white">
        <p role="alert" className="mb-4 text-sm text-[#ff9b95]">No fue posible cargar la vista CEO.</p>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
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
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
              <span>CEO</span>
              <span aria-hidden="true">·</span>
              <span>Actualizado {freshness}</span>
              {operations.errors.length > 0 ? <span className="text-[#ff766f]">{operations.errors.length} fuentes con error</span> : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{summary.periodLabel}</h1>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm">
              <RefreshCw size={14} /> Actualizar
            </button>
            <Link href="/dashboard/reportes/crear" className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#d7332b] px-3 text-xs font-semibold transition hover:bg-[#bd2e28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm">
              <FileText size={14} /> Informe
            </Link>
            <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm">
              <Download size={14} /> Exportar
            </button>
          </div>
        </header>

        <section aria-label="Indicadores principales" className="grid border-b border-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((item) => (
            <article key={item.label} className="border-b border-white/8 py-6 pr-5 sm:border-r sm:px-5 sm:first:pl-0 xl:border-b-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/38">{item.label}</p>
              <p className={`mt-4 text-3xl font-semibold tabular-nums tracking-tight ${item.tone ?? 'text-white'}`}>{item.value}</p>
              <p className="mt-1.5 text-xs tabular-nums text-white/38">{item.subvalue}</p>
            </article>
          ))}
        </section>

        <section className="mt-10" aria-labelledby="ceo-intelligence-title">
          <h2 id="ceo-intelligence-title" className="text-[10px] uppercase tracking-[0.16em] text-white/40">Inteligencia</h2>
          <div className="mt-3 divide-y divide-white/8 border-y border-white/10 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
            {insights.map((item) => (
              <Link key={item.label} href={item.href} className="group flex min-h-20 items-center justify-between gap-5 py-4 transition hover:bg-white/[0.025] md:px-5 md:first:pl-0">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{item.label}</p>
                  <p className={`mt-2 text-base font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
                </div>
                <span aria-hidden="true" className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-10 xl:grid-cols-2">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Mercado</h2>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-white/8 border-y border-white/10">
              {[
                ['Oferta', operations.market.properties],
                ['Confirmadas', operations.market.confirmed],
                ['Variación', portfolioChange?.mom == null ? '—' : signed(portfolioChange.mom, '%')],
              ].map(([label, value]) => (
                <div key={label} className="py-5 text-center first:text-left last:text-right">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums">{typeof value === 'number' ? number(value) : value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Gestión</h2>
            <dl className="mt-3 grid grid-cols-4 divide-x divide-white/8 border-y border-white/10">
              {[
                ['Vencidas', operations.tasks.overdue],
                ['Urgentes', operations.tasks.urgent],
                ['Revisión', operations.valuations.review],
                ['Pausadas', operations.assignments.paused],
              ].map(([label, value]) => (
                <div key={label} className="py-5 text-center first:text-left last:text-right">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</dt>
                  <dd className={`mt-2 text-2xl font-semibold tabular-nums ${Number(value) > 0 ? 'text-[#ff8d87]' : 'text-white'}`}>{number(Number(value))}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="offices-title">
          <h2 id="offices-title" className="text-[10px] uppercase tracking-[0.16em] text-white/40">Oficinas</h2>
          <div className="mt-3 overflow-x-auto border-t border-white/10">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/35">
                <tr><th className="py-3 pr-4 font-medium">Oficina</th><th className="px-4 py-3 font-medium">Cierres</th><th className="px-4 py-3 font-medium">Cumplimiento</th><th className="px-4 py-3 font-medium">UF</th><th className="px-4 py-3 font-medium">Conversión</th></tr>
              </thead>
              <tbody>
                {branchRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/8 text-sm tabular-nums transition hover:bg-white/[0.02]">
                    <td className="py-4 pr-4 font-medium text-white/85">{row.name}</td>
                    <td className="px-4 py-4 text-white/70">{number(row.sales?.value)}</td>
                    <td className={`px-4 py-4 font-medium ${complianceTone(row.sales?.compliance)}`}>{percent(row.sales?.compliance)}</td>
                    <td className="px-4 py-4 text-white/70">{uf(row.uf?.value)}</td>
                    <td className="px-4 py-4 text-white/70">{number(row.conversion?.value, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
