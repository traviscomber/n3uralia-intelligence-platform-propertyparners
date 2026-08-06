'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, FileText, RefreshCw } from 'lucide-react'

type EvolutionPoint = {
  period: string
  sales: number | null
  salesTarget: number | null
  salesUf: number | null
  salesUfTarget: number | null
  cumulativeSales: number | null
  cumulativeSalesTarget: number | null
}

type Entity = {
  id: string
  name: string
  entityType: string
  evolution?: EvolutionPoint[]
}

type Summary = {
  generatedAt?: string
  entities: Entity[]
}

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
  status: 'critical' | 'attention'
}

const formatNumber = (value: number | null | undefined, digits = 0) =>
  value == null
    ? '—'
    : value.toLocaleString('es-CL', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

const formatPercent = (value: number | null | undefined) =>
  value == null ? '—' : `${formatNumber(value, 1)}%`

const formatUf = (value: number | null | undefined) =>
  value == null ? '—' : `${formatNumber(value)} UF`

const calculateCompliance = (
  value: number | null | undefined,
  target: number | null | undefined,
) => (value != null && target != null && target !== 0 ? (value / target) * 100 : null)

const complianceTone = (value: number | null | undefined) =>
  value == null
    ? 'text-white'
    : value >= 100
      ? 'text-[#78d59a]'
      : value >= 80
        ? 'text-[#f0c96a]'
        : 'text-[#ff766f]'

const csvCell = (value: string | number | null | undefined) =>
  `"${String(value ?? '').replaceAll('"', '""')}"`

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
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

  const periods = useMemo(
    () => [...new Set(company?.evolution?.map((item) => item.period) ?? [])].sort(),
    [company],
  )

  useEffect(() => {
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(periods[periods.length - 1])
    }
  }, [periods, selectedPeriod])

  const selectedCompany = company?.evolution?.find((item) => item.period === selectedPeriod)
  const selectedCompliance = calculateCompliance(
    selectedCompany?.sales,
    selectedCompany?.salesTarget,
  )
  const cumulativeCompliance = calculateCompliance(
    selectedCompany?.cumulativeSales,
    selectedCompany?.cumulativeSalesTarget,
  )
  const gap =
    selectedCompany?.sales != null && selectedCompany?.salesTarget != null
      ? selectedCompany.sales - selectedCompany.salesTarget
      : null

  const branchRows = useMemo(
    () =>
      branches
        .map((branch) => {
          const point = branch.evolution?.find((item) => item.period === selectedPeriod)
          return {
            id: branch.id,
            name: branch.name,
            sales: point?.sales ?? null,
            compliance: calculateCompliance(point?.sales, point?.salesTarget),
            salesUf: point?.salesUf ?? null,
          }
        })
        .sort((a, b) => Number(a.compliance ?? 999) - Number(b.compliance ?? 999)),
    [branches, selectedPeriod],
  )

  const weakestBranch = branchRows.find((item) => item.compliance != null)

  const metrics = [
    { label: 'Cierres', value: formatNumber(selectedCompany?.sales) },
    { label: 'Meta', value: formatNumber(selectedCompany?.salesTarget) },
    {
      label: 'Cumplimiento',
      value: formatPercent(selectedCompliance),
      tone: complianceTone(selectedCompliance),
    },
    {
      label: 'Brecha',
      value: gap == null ? '—' : `${gap > 0 ? '+' : ''}${formatNumber(gap, 1)}`,
      tone: gap != null && gap < 0 ? 'text-[#ff766f]' : 'text-[#78d59a]',
    },
    { label: 'UF', value: formatUf(selectedCompany?.salesUf) },
    {
      label: 'Acumulado',
      value: formatNumber(selectedCompany?.cumulativeSales),
      meta: formatPercent(cumulativeCompliance),
      tone: complianceTone(cumulativeCompliance),
    },
  ]

  const actions = useMemo<ActionItem[]>(() => {
    if (!operations) return []

    const items: ActionItem[] = []

    if (weakestBranch?.compliance != null && weakestBranch.compliance < 100) {
      items.push({
        label: weakestBranch.name,
        value: formatPercent(weakestBranch.compliance),
        href: '/dashboard/control',
        priority: weakestBranch.compliance < 80 ? 100 : 70,
        status: weakestBranch.compliance < 80 ? 'critical' : 'attention',
      })
    }

    if (operations.tasks.overdue > 0) {
      items.push({
        label: 'Tareas vencidas',
        value: formatNumber(operations.tasks.overdue),
        href: '/dashboard/control',
        priority: 95,
        status: 'critical',
      })
    }

    if (operations.tasks.urgent > 0) {
      items.push({
        label: 'Tareas urgentes',
        value: formatNumber(operations.tasks.urgent),
        href: '/dashboard/control',
        priority: 90,
        status: 'critical',
      })
    }

    if (gap != null && gap < 0) {
      items.push({
        label: 'Brecha de meta',
        value: formatNumber(Math.abs(gap), 1),
        href: '/dashboard/control/admin',
        priority: 85,
        status: 'critical',
      })
    }

    if (operations.valuations.review > 0) {
      items.push({
        label: 'Valorizaciones',
        value: formatNumber(operations.valuations.review),
        href: '/dashboard/valuations',
        priority: 80,
        status: 'attention',
      })
    }

    if (operations.assignments.paused > 0) {
      items.push({
        label: 'Asignaciones pausadas',
        value: formatNumber(operations.assignments.paused),
        href: '/dashboard/properties/admin',
        priority: 75,
        status: 'attention',
      })
    }

    return items.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [gap, operations, weakestBranch])

  const criticalActions = actions.filter((item) => item.status === 'critical').length

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

    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(',')).join('\n')],
      { type: 'text/csv;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ceo-${selectedPeriod}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <main role="status" aria-busy="true" className="min-h-screen bg-[#050707] p-6 text-sm text-white/55">
        Cargando…
      </main>
    )
  }

  if (error || !summary || !operations) {
    return (
      <main className="min-h-screen bg-[#050707] p-6 text-white">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 bg-[#d7332b] px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <RefreshCw size={16} /> Reintentar
        </button>
      </main>
    )
  }

  const sourceDates = [summary.generatedAt, operations.generatedAt]
    .map((value) => (value ? new Date(value) : null))
    .filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
  const cutoff =
    sourceDates.length > 0
      ? new Date(Math.min(...sourceDates.map((value) => value.getTime())))
      : null
  const freshness = cutoff
    ? new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(cutoff)
    : '—'

  return (
    <main className="min-h-screen bg-[#050707] px-4 py-4 text-white sm:px-6 md:px-8 md:py-6">
      <div className="mx-auto max-w-[1180px]">
        <header className="grid gap-4 border-b border-white/10 pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div>
              <label htmlFor="ceo-period" className="text-[10px] uppercase tracking-[0.16em] text-white/38">
                Período
              </label>
              <select
                id="ceo-period"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="mt-1 block min-h-11 min-w-56 border border-white/15 bg-[#0a0d0d] px-3 text-base font-semibold capitalize text-white outline-none transition hover:border-white/25 focus:border-white/45"
              >
                {periods.map((period) => (
                  <option key={period} value={period}>
                    {formatPeriod(period)}
                  </option>
                ))}
              </select>
            </div>
            <p className="pb-1 text-[10px] uppercase tracking-[0.14em] text-white/32">
              Corte {freshness}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Actualizar datos"
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/65 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <Link
              href={`/dashboard/reportes/crear?period=${encodeURIComponent(selectedPeriod)}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#d7332b] px-4 text-xs font-semibold transition hover:bg-[#bd2e28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FileText size={14} /> Informe
            </Link>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/10 px-3 text-xs text-white/65 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </header>

        <section aria-label="Resultado del período" className="grid border-b border-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((item) => (
            <article key={item.label} className="border-b border-white/8 py-4 pr-4 sm:border-r sm:px-4 sm:first:pl-0 xl:border-b-0">
              <p className="text-[10px] uppercase tracking-[0.13em] text-white/35">{item.label}</p>
              <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${item.tone ?? 'text-white'}`}>
                {item.value}
              </p>
              {'meta' in item && item.meta ? (
                <p className={`mt-1 text-xs font-semibold tabular-nums ${item.tone ?? 'text-white/40'}`}>
                  {item.meta}
                </p>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Acciones</h2>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              {criticalActions > 0 ? <span className="text-[#ff8d87]">{criticalActions} críticas</span> : null}
              <span className="text-white/35">{actions.length} total</span>
            </div>
          </div>

          <div className="divide-y divide-white/8">
            {actions.length > 0 ? (
              actions.map((item) => (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="group grid min-h-14 grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 transition hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${item.status === 'critical' ? 'bg-[#d7332b]' : 'bg-[#f0c96a]'}`}
                  />
                  <span className="truncate text-sm font-medium text-white/85">{item.label}</span>
                  <span className={`text-base font-semibold tabular-nums ${item.status === 'critical' ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>
                    {item.value}
                  </span>
                  <ArrowRight size={15} className="text-white/28 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                </Link>
              ))
            ) : (
              <div className="py-5 text-sm text-white/45">Sin acciones pendientes</div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-white/40">Oficinas</h2>
          <div className="mt-2 overflow-x-auto border-t border-white/10">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.11em] text-white/35">
                <tr>
                  <th className="py-3 pr-4 font-medium">Oficina</th>
                  <th className="px-3 py-3 font-medium">Cierres</th>
                  <th className="px-3 py-3 font-medium">Cumplimiento</th>
                  <th className="px-3 py-3 text-right font-medium">UF</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/8 text-sm tabular-nums transition hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white/85">{row.name}</td>
                    <td className="px-3 py-3 text-white/70">{formatNumber(row.sales)}</td>
                    <td className={`px-3 py-3 font-semibold ${complianceTone(row.compliance)}`}>
                      {formatPercent(row.compliance)}
                    </td>
                    <td className="px-3 py-3 text-right text-white/70">{formatUf(row.salesUf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Mercado actual" className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-white/10 py-4">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Mercado actual</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{formatNumber(operations.market.properties)}</span>
            <span className="text-xs text-white/38">oferta</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{formatNumber(operations.market.confirmed)}</span>
            <span className="text-xs text-white/38">confirmadas</span>
          </div>
          {operations.errors.length > 0 ? (
            <span className="ml-auto text-xs tabular-nums text-[#ff8d87]">{operations.errors.length} fuentes con error</span>
          ) : null}
        </section>
      </div>
    </main>
  )
}
