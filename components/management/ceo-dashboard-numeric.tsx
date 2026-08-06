'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, FileText, RefreshCw } from 'lucide-react'

type Metric = { code: string; value: number | null; target: number | null; compliance: number | null; mom?: number | null }
type EvolutionPoint = {
  period: string
  sales: number | null
  salesTarget: number | null
  salesUf: number | null
  salesUfTarget: number | null
  cumulativeSales: number | null
  cumulativeSalesTarget: number | null
}
type Entity = { id: string; name: string; entityType: string; metrics: Metric[]; evolution?: EvolutionPoint[] }
type Summary = { periodLabel: string; generatedAt?: string; entities: Entity[] }
type Operations = {
  valuations: { review: number }
  assignments: { paused: number }
  market: { properties: number; confirmed: number }
  tasks: { overdue: number; urgent: number }
  errors: string[]
  generatedAt: string
}

type ActionItem = {
  label: string
  value: string
  href: string
  priority: number
  tone: string
}

const number = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const percent = (value: number | null | undefined) => value == null ? '—' : `${number(value, 1)}%`
const uf = (value: number | null | undefined) => value == null ? '—' : `${number(value)} UF`
const compliance = (value: number | null | undefined, target: number | null | undefined) => value != null && target != null && target !== 0 ? (value / target) * 100 : null
const complianceTone = (value: number | null | undefined) => value == null ? 'text-white' : value >= 100 ? 'text-[#78d59a]' : value >= 80 ? 'text-[#f0c96a]' : 'text-[#ff766f]'
const csvCell = (value: string | number | null | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export function CeoDashboardNumeric() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [operations, setOperations] = useState<Operations | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('')
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
      const [summaryData, operationsData] = await Promise.all([summaryResponse.json(), operationsResponse.json()])
      setSummary(summaryData)
      setOperations(operationsData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const company = summary?.entities.find((entity) => entity.entityType === 'company')
  const branches = summary?.entities.filter((entity) => entity.entityType === 'branch') ?? []
  const periods = useMemo(() => [...new Set(company?.evolution?.map((item) => item.period) ?? [])].sort(), [company])

  useEffect(() => {
    if (!selectedPeriod && periods.length > 0) setSelectedPeriod(periods[periods.length - 1])
  }, [periods, selectedPeriod])

  const selectedCompany = company?.evolution?.find((item) => item.period === selectedPeriod)
  const selectedCompliance = compliance(selectedCompany?.sales, selectedCompany?.salesTarget)
  const gap = selectedCompany?.sales != null && selectedCompany?.salesTarget != null ? selectedCompany.sales - selectedCompany.salesTarget : null

  const branchRows = useMemo(() => branches.map((branch) => {
    const point = branch.evolution?.find((item) => item.period === selectedPeriod)
    return {
      id: branch.id,
      name: branch.name,
      sales: point?.sales ?? null,
      target: point?.salesTarget ?? null,
      compliance: compliance(point?.sales, point?.salesTarget),
      salesUf: point?.salesUf ?? null,
    }
  }).sort((a, b) => Number(a.compliance ?? 999) - Number(b.compliance ?? 999)), [branches, selectedPeriod])

  const weakestBranch = branchRows.find((item) => item.compliance != null)

  const cards = [
    { label: 'Cierres', value: number(selectedCompany?.sales) },
    { label: 'Meta', value: number(selectedCompany?.salesTarget) },
    { label: 'Cumplimiento', value: percent(selectedCompliance), tone: complianceTone(selectedCompliance) },
    { label: 'Brecha', value: number(gap, 1), tone: gap != null && gap < 0 ? 'text-[#ff766f]' : 'text-[#78d59a]' },
    { label: 'UF', value: uf(selectedCompany?.salesUf) },
    { label: 'Acumulado', value: number(selectedCompany?.cumulativeSales) },
  ]

  const actions = useMemo<ActionItem[]>(() => {
    if (!operations) return []

    const items: ActionItem[] = []
    if (weakestBranch?.compliance != null && weakestBranch.compliance < 100) {
      items.push({
        label: weakestBranch.name,
        value: `${percent(weakestBranch.compliance)} cumplimiento`,
        href: '/dashboard/control',
        priority: weakestBranch.compliance < 80 ? 100 : 70,
        tone: weakestBranch.compliance < 80 ? 'text-[#ff8d87]' : 'text-[#f0c96a]',
      })
    }
    if (operations.tasks.overdue > 0) items.push({ label: 'Tareas vencidas', value: number(operations.tasks.overdue), href: '/dashboard/control', priority: 95, tone: 'text-[#ff8d87]' })
    if (operations.tasks.urgent > 0) items.push({ label: 'Tareas urgentes', value: number(operations.tasks.urgent), href: '/dashboard/control', priority: 90, tone: 'text-[#ff8d87]' })
    if (operations.valuations.review > 0) items.push({ label: 'Valorizaciones', value: `${number(operations.valuations.review)} en revisión`, href: '/dashboard/valuations', priority: 80, tone: 'text-[#f0c96a]' })
    if (operations.assignments.paused > 0) items.push({ label: 'Asignaciones', value: `${number(operations.assignments.paused)} pausadas`, href: '/dashboard/properties/admin', priority: 75, tone: 'text-[#f0c96a]' })
    if (gap != null && gap < 0) items.push({ label: 'Meta del período', value: `${number(Math.abs(gap), 1)} cierres de brecha`, href: '/dashboard/control/admin', priority: 85, tone: 'text-[#ff8d87]' })

    return items.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [gap, operations, weakestBranch])

  function exportCsv() {
    if (!summary || !operations || !selectedPeriod) return
    const rows = [
      ['Periodo', selectedPeriod],
      ['Cierres', selectedCompany?.sales],
      ['Meta', selectedCompany?.salesTarget],
      ['Cumplimiento', selectedCompliance],
      ['Brecha', gap],
      ['UF', selectedCompany?.salesUf],
      ['Cierres acumulados', selectedCompany?.cumulativeSales],
      ['Meta acumulada', selectedCompany?.cumulativeSalesTarget],
      ['Tareas vencidas actuales', operations.tasks.overdue],
      ['Tareas urgentes actuales', operations.tasks.urgent],
      ['Valorizaciones en revisión actuales', operations.valuations.review],
      ['Asignaciones pausadas actuales', operations.assignments.paused],
    ]
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ceo-${selectedPeriod}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <main role="status" aria-busy="true" className="min-h-screen bg-[#050707] p-6 text-sm text-white/55">Cargando…</main>
  if (error || !summary || !operations) return <main className="min-h-screen bg-[#050707] p-6 text-white"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold"><RefreshCw size={16} /> Reintentar</button></main>

  const sourceDates = [summary.generatedAt, operations.generatedAt]
    .map((value) => value ? new Date(value) : null)
    .filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
  const cutoff = sourceDates.length > 0 ? new Date(Math.min(...sourceDates.map((value) => value.getTime()))) : null
  const freshness = cutoff ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(cutoff) : '—'

  return <main className="min-h-screen bg-[#050707] px-5 py-5 text-white md:px-8 md:py-7"><div className="mx-auto max-w-[1320px]">
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Corte {freshness}</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{selectedPeriod ? formatPeriod(selectedPeriod) : '—'}</h1>
          <label className="sr-only" htmlFor="ceo-period">Período</label>
          <select id="ceo-period" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="min-h-10 border border-white/15 bg-[#0a0d0d] px-3 text-sm text-white outline-none focus:border-white/40">
            {periods.map((period) => <option key={period} value={period}>{formatPeriod(period)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex">
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/70"><RefreshCw size={14} /> Actualizar</button>
        <Link href={`/dashboard/reportes/crear?period=${encodeURIComponent(selectedPeriod)}`} className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#d7332b] px-3 text-xs font-semibold"><FileText size={14} /> Informe</Link>
        <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/70"><Download size={14} /> Exportar</button>
      </div>
    </header>

    <section aria-label="Indicadores del período" className="grid border-b border-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map((item) => <article key={item.label} className="border-b border-white/8 py-5 pr-4 sm:border-r sm:px-4 sm:first:pl-0 xl:border-b-0"><p className="text-[10px] uppercase tracking-[0.13em] text-white/38">{item.label}</p><p className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${item.tone ?? 'text-white'}`}>{item.value}</p></article>)}</section>

    <section className="mt-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Acciones</h2>
        <span className="text-xs tabular-nums text-white/35">{actions.length}</span>
      </div>
      <div className="divide-y divide-white/8">
        {actions.length > 0 ? actions.map((item) => (
          <Link key={`${item.label}-${item.href}`} href={item.href} className="group grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3 transition hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <span className="truncate text-sm font-medium text-white/85">{item.label}</span>
            <span className={`text-sm font-semibold tabular-nums ${item.tone}`}>{item.value}</span>
            <ArrowRight size={15} className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
          </Link>
        )) : <div className="py-5 text-sm text-white/45">Sin acciones pendientes</div>}
      </div>
    </section>

    <section className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.52fr)]">
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Oficinas</h2>
        <div className="mt-2 overflow-x-auto border-t border-white/10"><table className="w-full min-w-[520px] border-collapse text-left"><thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/35"><tr><th className="py-3 pr-4 font-medium">Oficina</th><th className="px-4 py-3 font-medium">Cierres</th><th className="px-4 py-3 font-medium">Meta</th><th className="px-4 py-3 font-medium">Cumplimiento</th><th className="px-4 py-3 font-medium">UF</th></tr></thead><tbody>{branchRows.map((row) => <tr key={row.id} className="border-b border-white/8 text-sm tabular-nums"><td className="py-3 pr-4 font-medium text-white/85">{row.name}</td><td className="px-4 py-3 text-white/70">{number(row.sales)}</td><td className="px-4 py-3 text-white/70">{number(row.target)}</td><td className={`px-4 py-3 font-medium ${complianceTone(row.compliance)}`}>{percent(row.compliance)}</td><td className="px-4 py-3 text-white/70">{uf(row.salesUf)}</td></tr>)}</tbody></table></div>
      </div>
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Mercado</h2>
        <dl className="mt-2 grid grid-cols-2 divide-x divide-y divide-white/8 border-y border-white/10">
          <div className="px-3 py-4"><dt className="text-[9px] uppercase tracking-[0.1em] text-white/35">Oferta</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{number(operations.market.properties)}</dd></div>
          <div className="px-3 py-4"><dt className="text-[9px] uppercase tracking-[0.1em] text-white/35">Confirmadas</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{number(operations.market.confirmed)}</dd></div>
        </dl>
      </div>
    </section>
  </div></main>
}
