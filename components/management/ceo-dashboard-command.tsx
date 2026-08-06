'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, FileText, RefreshCw } from 'lucide-react'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type Point = { period: string; sales: number | null; salesTarget: number | null; salesUf: number | null; cumulativeSales: number | null; cumulativeSalesTarget: number | null }
type Entity = { id: string; name: string; entityType: string; evolution?: Point[] }
type Summary = { generatedAt?: string; entities: Entity[] }
type Operations = { valuations: { review: number }; assignments: { paused: number }; market: { properties: number; confirmed: number }; tasks: { overdue: number; urgent: number }; errors: string[]; generatedAt: string }
type Action = { label: string; value: string; href: string; priority: number; critical: boolean }

const n = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const pct = (value: number | null | undefined) => value == null ? '—' : `${n(value, 1)}%`
const uf = (value: number | null | undefined) => value == null ? '—' : `${n(value)} UF`
const ratio = (value: number | null | undefined, target: number | null | undefined) => value != null && target != null && target !== 0 ? value / target * 100 : null
const tone = (value: number | null | undefined): 'default' | 'success' | 'warning' | 'danger' => value == null ? 'default' : value >= 100 ? 'success' : value >= 80 ? 'warning' : 'danger'
const toneClass = (value: number | null | undefined) => value == null ? 'text-[var(--n3-text-light)]' : value >= 100 ? 'text-[#78d59a]' : value >= 80 ? 'text-[#f0c96a]' : 'text-[#ff766f]'
const periodName = (period: string) => { const [year, month] = period.split('-').map(Number); return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))) }
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

export function CeoDashboardCommand() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [operations, setOperations] = useState<Operations | null>(null)
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  async function load() {
    setLoading(true); setFailed(false)
    try {
      const [a, b] = await Promise.all([fetch('/api/management/summary', { cache: 'no-store' }), fetch('/api/management/ceo-operations', { cache: 'no-store' })])
      if (!a.ok || !b.ok) throw new Error('LOAD_FAILED')
      const [summaryData, operationsData] = await Promise.all([a.json(), b.json()])
      setSummary(summaryData); setOperations(operationsData)
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  const company = summary?.entities.find((item) => item.entityType === 'company')
  const branches = summary?.entities.filter((item) => item.entityType === 'branch') ?? []
  const periods = useMemo(() => [...new Set(company?.evolution?.map((item) => item.period) ?? [])].sort(), [company])
  useEffect(() => { if (!period && periods.length) setPeriod(periods.at(-1) ?? '') }, [period, periods])
  const selected = company?.evolution?.find((item) => item.period === period)
  const compliance = ratio(selected?.sales, selected?.salesTarget)
  const cumulativeCompliance = ratio(selected?.cumulativeSales, selected?.cumulativeSalesTarget)
  const gap = selected?.sales != null && selected?.salesTarget != null ? selected.sales - selected.salesTarget : null
  const offices = useMemo(() => branches.map((branch) => { const point = branch.evolution?.find((item) => item.period === period); return { id: branch.id, name: branch.name, sales: point?.sales ?? null, compliance: ratio(point?.sales, point?.salesTarget), salesUf: point?.salesUf ?? null } }).sort((a, b) => Number(a.compliance ?? 999) - Number(b.compliance ?? 999)), [branches, period])
  const weakest = offices.find((item) => item.compliance != null)
  const actions = useMemo<Action[]>(() => {
    if (!operations) return []
    const items: Action[] = []
    if (weakest?.compliance != null && weakest.compliance < 100) items.push({ label: weakest.name, value: pct(weakest.compliance), href: '/dashboard/control/operations', priority: weakest.compliance < 80 ? 100 : 70, critical: weakest.compliance < 80 })
    if (operations.tasks.overdue > 0) items.push({ label: 'Tareas vencidas', value: n(operations.tasks.overdue), href: '/dashboard/control/operations', priority: 95, critical: true })
    if (operations.tasks.urgent > 0) items.push({ label: 'Tareas urgentes', value: n(operations.tasks.urgent), href: '/dashboard/control/operations', priority: 90, critical: true })
    if (gap != null && gap < 0) items.push({ label: 'Brecha de meta', value: n(Math.abs(gap), 1), href: '/dashboard/control/admin', priority: 85, critical: true })
    if (operations.valuations.review > 0) items.push({ label: 'Valorizaciones', value: n(operations.valuations.review), href: '/dashboard/valuations', priority: 80, critical: false })
    if (operations.assignments.paused > 0) items.push({ label: 'Asignaciones pausadas', value: n(operations.assignments.paused), href: '/dashboard/properties/admin', priority: 75, critical: false })
    return items.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [gap, operations, weakest])

  function exportData() {
    if (!selected || !operations || !period) return
    const rows = [['Periodo', period], ['Cierres', selected.sales], ['Meta', selected.salesTarget], ['Cumplimiento', compliance], ['Brecha', gap], ['UF', selected.salesUf], ['Acumulado', selected.cumulativeSales], ['Meta acumulada', selected.cumulativeSalesTarget], ['Tareas vencidas', operations.tasks.overdue], ['Tareas urgentes', operations.tasks.urgent], ['Valorizaciones', operations.valuations.review], ['Asignaciones pausadas', operations.assignments.paused]]
    const blob = new Blob([rows.map((row) => row.map(csv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `ceo-${period}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  if (loading) return <WorkspaceShell><div role="status" aria-busy="true" className="py-8 text-sm text-[var(--n3-text-muted)]">Cargando datos canónicos…</div></WorkspaceShell>
  if (failed || !summary || !operations) return <WorkspaceShell><button onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 bg-[var(--primary)] px-4 text-sm font-semibold"><RefreshCw size={16} /> Reintentar</button></WorkspaceShell>

  const dates = [summary.generatedAt, operations.generatedAt].map((value) => value ? new Date(value) : null).filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
  const cutoff = dates.length ? new Date(Math.min(...dates.map((value) => value.getTime()))) : null
  const freshness = cutoff ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(cutoff) : '—'
  const critical = actions.filter((item) => item.critical).length
  const identityCoverage = operations.market.properties > 0 ? operations.market.confirmed / operations.market.properties * 100 : null
  const dataStatus = operations.errors.length ? 'partial' : identityCoverage === null || identityCoverage === 0 ? 'blocked' : identityCoverage < 100 ? 'partial' : 'ready'

  return <WorkspaceShell>
    <WorkspaceHeader controls={<div><label htmlFor="ceo-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><select id="ceo-period" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 min-w-56 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-base font-semibold capitalize text-[var(--n3-text-light)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{periods.map((item) => <option key={item} value={item}>{periodName(item)}</option>)}</select></div>} meta={`Corte ${freshness}`} actions={[{ label: 'Actualizar', onClick: () => void load(), icon: <RefreshCw size={14} />, ariaLabel: 'Actualizar' }, { label: 'Informe', href: `/dashboard/reportes/crear?period=${encodeURIComponent(period)}`, primary: true, icon: <FileText size={14} /> }, { label: 'Exportar', onClick: exportData, icon: <Download size={14} />, ariaLabel: 'Exportar' }]} />
    <MetricStrip items={[{ label: 'Resultado', value: <>{n(selected?.sales)} <span className="text-base text-[var(--n3-text-muted)]">/ {n(selected?.salesTarget)}</span></> }, { label: 'Cumplimiento', value: pct(compliance), tone: tone(compliance) }, { label: 'UF', value: uf(selected?.salesUf) }, { label: 'Acumulado', value: n(selected?.cumulativeSales), detail: pct(cumulativeCompliance), tone: tone(cumulativeCompliance) }]} />
    <section className="mt-5"><div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Acciones</h2><span className={`text-xs tabular-nums ${critical ? 'text-[#ff8d87]' : 'text-[var(--n3-text-muted)]'}`}>{critical ? `${critical} críticas` : `${actions.length} pendientes`}</span></div><div className="divide-y divide-[var(--n3-line)]">{actions.length ? actions.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className="group grid min-h-12 grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2 hover:bg-white/[0.025]"><span className={`h-2 w-2 rounded-full ${item.critical ? 'bg-[var(--primary)]' : 'bg-[#f0c96a]'}`} /><span className="truncate text-sm font-medium">{item.label}</span><span className={`text-base font-semibold tabular-nums ${item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{item.value}</span><ArrowRight size={15} className="text-[var(--n3-text-muted)]" /></Link>) : <div className="py-4 text-sm text-[var(--n3-text-muted)]">Sin acciones pendientes</div>}</div></section>
    <section className="mt-5"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Oficinas</h2><div className="mt-2 overflow-x-auto border-t border-[var(--n3-line)]"><table className="w-full min-w-[460px] border-collapse text-left"><thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.11em] text-[var(--n3-text-muted)]"><tr><th className="py-3 pr-4 font-medium">Oficina</th><th className="px-3 py-3 font-medium">Cierres</th><th className="px-3 py-3 font-medium">Cumplimiento</th><th className="px-3 py-3 text-right font-medium">UF</th></tr></thead><tbody>{offices.map((item) => <tr key={item.id} className="border-b border-[var(--n3-line)] text-sm tabular-nums"><td className="py-3 pr-4 font-medium">{item.name}</td><td className="px-3 py-3 text-[var(--n3-text-muted)]">{n(item.sales)}</td><td className={`px-3 py-3 font-semibold ${toneClass(item.compliance)}`}>{pct(item.compliance)}</td><td className="px-3 py-3 text-right text-[var(--n3-text-muted)]">{uf(item.salesUf)}</td></tr>)}</tbody></table></div></section>
    <DataStatusBar cutoff={freshness} coverage={identityCoverage === null ? 'Identidad —' : `Identidad ${n(identityCoverage, 1)}%`} issues={operations.errors.length} status={dataStatus} />
  </WorkspaceShell>
}
