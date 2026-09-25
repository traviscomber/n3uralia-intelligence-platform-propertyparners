'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, FileText, RefreshCw } from 'lucide-react'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { getDecisionThreshold } from '@/lib/management-decision-policy'

type Point = {
  period: string
  sales: number | null
  salesTarget: number | null
  salesUf?: number | null
  cumulativeSales?: number | null
  cumulativeSalesTarget?: number | null
  metrics?: Record<string, number | null>
  targets?: Record<string, number | null>
}
type Entity = { id: string; name: string; entityType: string; evolution?: Point[] }
type Summary = {
  generatedAt?: string
  entities: Entity[]
  dataLayers?: { approvedMetricCount?: number; errors?: string[] }
}
type Operations = { valuations: { review: number }; assignments: { paused: number }; market: { properties: number; confirmed: number }; tasks: { overdue: number; urgent: number }; errors: string[]; generatedAt: string }
type Action = { label: string; value: string; detail?: string; href: string; priority: number; critical: boolean }
type Risk = 'high' | 'medium' | 'low' | 'unknown'

const n = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const pct = (value: number | null | undefined) => value == null ? '—' : `${n(value, 1)}%`
const uf = (value: number | null | undefined) => value == null ? '—' : `${n(value)} UF`
const ratio = (value: number | null | undefined, target: number | null | undefined) => value != null && target != null && target !== 0 ? value / target * 100 : null
const tone = (value: number | null | undefined): 'default' | 'success' | 'warning' | 'danger' => value == null ? 'default' : value >= 100 ? 'success' : value >= 80 ? 'warning' : 'danger'
const periodName = (period: string) => { const [year, month] = period.split('-').map(Number); return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))) }
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
const metric = (point: Point | undefined, code: string) => point?.metrics?.[code] ?? null
const riskLabel = (risk: Risk) => risk === 'high' ? 'Alto' : risk === 'medium' ? 'Medio' : risk === 'low' ? 'Bajo' : 'Sin evidencia'
const riskClass = (risk: Risk) => risk === 'high' ? 'text-[#ff8d87]' : risk === 'medium' ? 'text-[#f0c96a]' : risk === 'low' ? 'text-[#78d59a]' : 'text-[var(--n3-text-muted)]'
const officeSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const DECISION_THRESHOLDS = {
  leadBacklogCritical: getDecisionThreshold('lead-backlog-critical'),
  leadBacklogAction: getDecisionThreshold('lead-backlog-action'),
  leadBacklogWatch: getDecisionThreshold('lead-backlog-watch'),
  visitsCritical: getDecisionThreshold('visits-critical'),
  visitsAction: getDecisionThreshold('visits-action'),
  visitsWatch: getDecisionThreshold('visits-watch'),
  suspendedCritical: getDecisionThreshold('suspended-critical'),
  suspendedWatch: getDecisionThreshold('suspended-watch'),
  unclassifiedCritical: getDecisionThreshold('unclassified-critical'),
  unclassifiedWatch: getDecisionThreshold('unclassified-watch'),
} as const

function sumThrough(points: Point[] | undefined, period: string, key: 'sales' | 'salesTarget') {
  const eligible = (points ?? []).filter((item) => item.period <= period)
  if (!eligible.length || eligible.some((item) => item[key] == null)) return null
  return eligible.reduce((total, item) => total + Number(item[key] ?? 0), 0)
}

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
  const selectedMetrics = selected?.metrics ?? {}
  const compliance = ratio(selected?.sales, selected?.salesTarget)
  const cumulativeSales = selected?.cumulativeSales ?? sumThrough(company?.evolution, period, 'sales')
  const cumulativeSalesTarget = selected?.cumulativeSalesTarget ?? sumThrough(company?.evolution, period, 'salesTarget')
  const cumulativeCompliance = ratio(cumulativeSales, cumulativeSalesTarget)
  const gap = selected?.sales != null && selected?.salesTarget != null ? selected.sales - selected.salesTarget : null
  const usesCommercialCredit = selectedMetrics.management_credited_sales != null

  const offices = useMemo(() => branches.map((branch) => {
    const point = branch.evolution?.find((item) => item.period === period)
    const active = metric(point, 'active_leads_snapshot')
    const stale90 = metric(point, 'stale_90_leads')
    const scheduled = metric(point, 'scheduled_visits')
    const realized = metric(point, 'realized_visits')
    const stock = metric(point, 'stock')
    const suspended = metric(point, 'suspended_listings')
    const followUp = metric(point, 'follow_up_score')
    const credited = metric(point, 'management_credited_sales')
    const creditedUf = metric(point, 'management_credited_sales_uf')
    const visitRate = ratio(realized, scheduled)
    const staleRatio = ratio(stale90, active)
    const suspendedRatio = ratio(suspended, stock)
    const hasRiskEvidence = staleRatio != null || visitRate != null || suspendedRatio != null || followUp != null

    let risk: Risk = 'unknown'
    let action = 'Revisar evidencia'
    let riskScore = -1

    if (staleRatio != null && staleRatio >= DECISION_THRESHOLDS.leadBacklogCritical) { risk = 'high'; action = 'Intervenir backlog'; riskScore = 100 + staleRatio }
    else if (visitRate != null && visitRate < DECISION_THRESHOLDS.visitsCritical) { risk = 'high'; action = 'Mejorar visitas'; riskScore = 95 + (DECISION_THRESHOLDS.visitsCritical - visitRate) }
    else if (suspendedRatio != null && suspendedRatio >= DECISION_THRESHOLDS.suspendedCritical) { risk = 'high'; action = 'Revisar cartera'; riskScore = 90 + suspendedRatio }
    else if ((staleRatio != null && staleRatio >= DECISION_THRESHOLDS.leadBacklogWatch) || (visitRate != null && visitRate < DECISION_THRESHOLDS.visitsWatch) || (suspendedRatio != null && suspendedRatio >= DECISION_THRESHOLDS.suspendedWatch)) { risk = 'medium'; action = 'Monitorear'; riskScore = 50 + Math.max(staleRatio ?? 0, suspendedRatio ?? 0, visitRate == null ? 0 : DECISION_THRESHOLDS.visitsWatch - visitRate) }
    else if (hasRiskEvidence) { risk = 'low'; action = followUp != null && followUp >= 80 ? 'Replicar gestión' : 'Monitorear'; riskScore = 0 }

    return {
      id: branch.id,
      name: branch.name,
      sales: point?.sales ?? null,
      salesUf: point?.salesUf ?? null,
      credited,
      creditedUf,
      active,
      stale90,
      scheduled,
      realized,
      visitRate,
      staleRatio,
      suspended,
      stock,
      suspendedRatio,
      risk,
      riskScore,
      action,
    }
  }).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name)), [branches, period])

  const intelligence = useMemo<Action[]>(() => {
    if (!selected) return []
    const items: Action[] = []
    const active = selectedMetrics.active_leads_snapshot ?? null
    const stale90 = selectedMetrics.stale_90_leads ?? null
    const unclassified = selectedMetrics.unclassified_leads ?? null
    const scheduled = selectedMetrics.scheduled_visits ?? null
    const realized = selectedMetrics.realized_visits ?? null
    const stock = selectedMetrics.stock ?? null
    const suspended = selectedMetrics.suspended_listings ?? null
    const credited = selectedMetrics.management_credited_sales ?? null
    const inScope = selectedMetrics.sales_operations_in_scope ?? null
    const visitRate = ratio(realized, scheduled)
    const staleRatio = ratio(stale90, active)
    const unclassifiedRatio = ratio(unclassified, active)
    const suspendedRatio = ratio(suspended, stock)

    if (stale90 != null && staleRatio != null && staleRatio >= DECISION_THRESHOLDS.leadBacklogAction) items.push({ label: 'Backlog +90 días', value: n(stale90), detail: `${pct(staleRatio)} de leads activos`, href: '/dashboard/control/operations', priority: staleRatio >= DECISION_THRESHOLDS.leadBacklogCritical ? 100 : 88, critical: staleRatio >= DECISION_THRESHOLDS.leadBacklogCritical })
    if (visitRate != null && visitRate < DECISION_THRESHOLDS.visitsAction) items.push({ label: 'Ejecución de visitas', value: pct(visitRate), detail: `${n(realized)} de ${n(scheduled)} realizadas`, href: '/dashboard/control/operations', priority: visitRate < DECISION_THRESHOLDS.visitsCritical ? 98 : 90, critical: visitRate < DECISION_THRESHOLDS.visitsCritical })
    if (unclassified != null && unclassifiedRatio != null && unclassifiedRatio >= DECISION_THRESHOLDS.unclassifiedWatch) items.push({ label: 'Leads sin clasificar', value: n(unclassified), detail: `${pct(unclassifiedRatio)} de leads activos`, href: '/dashboard/control/operations', priority: unclassifiedRatio >= DECISION_THRESHOLDS.unclassifiedCritical ? 94 : 82, critical: unclassifiedRatio >= DECISION_THRESHOLDS.unclassifiedCritical })
    if (suspended != null && suspendedRatio != null && suspendedRatio >= DECISION_THRESHOLDS.suspendedWatch) items.push({ label: 'Cartera suspendida', value: n(suspended), detail: `${pct(suspendedRatio)} del stock`, href: '/dashboard/properties', priority: suspendedRatio >= DECISION_THRESHOLDS.suspendedCritical ? 92 : 76, critical: suspendedRatio >= DECISION_THRESHOLDS.suspendedCritical })
    if (gap != null && gap < 0) items.push({ label: 'Brecha de meta', value: n(Math.abs(gap), 1), detail: `${pct(compliance)} de cumplimiento`, href: '/dashboard/control/admin', priority: 96, critical: true })
    if (credited != null && selected.sales != null && Math.abs(selected.sales - credited) >= 0.25) items.push({ label: 'Crédito comercial', value: `${n(credited, 1)} / ${n(selected.sales)}`, detail: inScope == null ? 'Separado de operaciones corporativas' : `${n(inScope)} operaciones en alcance`, href: '/dashboard/control/operations', priority: 55, critical: false })

    return items.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [compliance, gap, selected, selectedMetrics])

  const actions = useMemo<Action[]>(() => {
    if (!operations) return intelligence
    const items = [...intelligence]
    if (operations.tasks.overdue > 0) items.push({ label: 'Tareas vencidas', value: n(operations.tasks.overdue), href: '/dashboard/control/operations', priority: 97, critical: true })
    if (operations.tasks.urgent > 0) items.push({ label: 'Tareas urgentes', value: n(operations.tasks.urgent), href: '/dashboard/control/operations', priority: 93, critical: true })
    if (operations.valuations.review > 0) items.push({ label: 'Valorizaciones por revisar', value: n(operations.valuations.review), href: '/dashboard/valuations', priority: 72, critical: false })
    if (operations.assignments.paused > 0) items.push({ label: 'Asignaciones pausadas', value: n(operations.assignments.paused), href: '/dashboard/properties/admin', priority: 68, critical: false })
    return items.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [intelligence, operations])

  function exportData() {
    if (!selected || !operations || !period) return
    const rows = [
      ['Periodo', period],
      ['Operaciones corporativas', selected.sales],
      ['Meta', selected.salesTarget],
      ['Cumplimiento', compliance],
      ['Brecha', gap],
      ['UF corporativas', selected.salesUf],
      ['Crédito comercial', selectedMetrics.management_credited_sales],
      ['Operaciones en alcance', selectedMetrics.sales_operations_in_scope],
      ['UF acreditadas', selectedMetrics.management_credited_sales_uf],
      ['Leads activos', selectedMetrics.active_leads_snapshot],
      ['Leads +90 días', selectedMetrics.stale_90_leads],
      ['Leads sin clasificar', selectedMetrics.unclassified_leads],
      ['Visitas agendadas', selectedMetrics.scheduled_visits],
      ['Visitas realizadas', selectedMetrics.realized_visits],
      ['Stock', selectedMetrics.stock],
      ['Suspendidas', selectedMetrics.suspended_listings],
      ['Acumulado', cumulativeSales],
      ['Meta acumulada', cumulativeSalesTarget],
      ['Tareas vencidas', operations.tasks.overdue],
      ['Tareas urgentes', operations.tasks.urgent],
    ]
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
  const approvedMetricCount = summary.dataLayers?.approvedMetricCount ?? 0
  const dataLayerIssues = summary.dataLayers?.errors?.length ?? 0
  const dataStatus = operations.errors.length || dataLayerIssues || approvedMetricCount === 0
    ? 'partial'
    : identityCoverage === null || identityCoverage === 0
      ? 'blocked'
      : identityCoverage < 100 ? 'partial' : 'ready'
  const creditedDetail = usesCommercialCredit ? `${n(selectedMetrics.management_credited_sales, 1)} crédito gestión` : undefined
  const coverageLabel = `${identityCoverage === null ? 'Identidad —' : `Identidad ${n(identityCoverage, 1)}%`} · Aprobadas ${n(approvedMetricCount)}`

  return <WorkspaceShell>
    <WorkspaceHeader controls={<div><label htmlFor="ceo-period" className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Período</label><select id="ceo-period" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 min-w-56 border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 text-base font-semibold capitalize text-[var(--n3-text-light)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{periods.map((item) => <option key={item} value={item}>{periodName(item)}</option>)}</select></div>} meta={`Corte ${freshness}`} actions={[{ label: 'Actualizar', onClick: () => void load(), icon: <RefreshCw size={14} />, ariaLabel: 'Actualizar' }, { label: 'Informe', href: `/dashboard/reportes/operacion?period=${encodeURIComponent(period)}`, primary: true, icon: <FileText size={14} /> }, { label: 'Exportar', onClick: exportData, icon: <Download size={14} />, ariaLabel: 'Exportar' }]} />
    <MetricStrip items={[{ label: 'Resultado', value: <>{n(selected?.sales)} <span className="text-base text-[var(--n3-text-muted)]">/ {n(selected?.salesTarget)}</span></>, detail: creditedDetail }, { label: 'Cumplimiento', value: pct(compliance), tone: tone(compliance) }, { label: 'UF', value: uf(selected?.salesUf), detail: usesCommercialCredit ? `${uf(selectedMetrics.management_credited_sales_uf)} acreditadas` : undefined }, { label: 'Acumulado', value: n(cumulativeSales), detail: pct(cumulativeCompliance), tone: tone(cumulativeCompliance) }]} />

    <section className="mt-5">
      <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Señales y acciones</h2><span className={`text-xs tabular-nums ${critical ? 'text-[#ff8d87]' : 'text-[var(--n3-text-muted)]'}`}>{critical ? `${critical} críticas` : `${actions.length} activas`}</span></div>
      <div className="divide-y divide-[var(--n3-line)]">{actions.length ? actions.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className="group grid min-h-14 grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2 hover:bg-white/[0.025]"><span className={`h-2 w-2 rounded-full ${item.critical ? 'bg-[var(--primary)]' : 'bg-[#f0c96a]'}`} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.label}</span>{item.detail ? <span className="block truncate text-xs text-[var(--n3-text-muted)]">{item.detail}</span> : null}</span><span className={`text-base font-semibold tabular-nums ${item.critical ? 'text-[#ff8d87]' : 'text-[#f0c96a]'}`}>{item.value}</span><ArrowRight size={15} className="text-[var(--n3-text-muted)]" /></Link>) : <div className="py-4 text-sm text-[var(--n3-text-muted)]">Sin señales prioritarias</div>}</div>
    </section>

    <section className="mt-5">
      <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Oficinas</h2>
      <div className="mt-2 overflow-x-auto border-t border-[var(--n3-line)]"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.11em] text-[var(--n3-text-muted)]"><tr><th className="py-3 pr-4 font-medium">Oficina</th><th className="px-3 py-3 font-medium">Resultado</th><th className="px-3 py-3 font-medium">Pipeline</th><th className="px-3 py-3 font-medium">Ejecución</th><th className="px-3 py-3 font-medium">Riesgo</th><th className="px-3 py-3 text-right font-medium">Acción</th></tr></thead><tbody>{offices.map((item) => <tr key={item.id} className="border-b border-[var(--n3-line)] text-sm"><td className="py-3 pr-4 font-medium">{item.name}</td><td className="px-3 py-3 tabular-nums"><span className="block font-semibold">{item.sales == null ? '—' : `${n(item.sales, Number.isInteger(item.sales) ? 0 : 1)} cierres corporativos`}</span><span className="block text-xs text-[var(--n3-text-muted)]">{uf(item.salesUf)}</span>{item.credited != null ? <span className="mt-1 block text-xs text-[var(--n3-text-muted)]">{n(item.credited, Number.isInteger(item.credited) ? 0 : 1)} crédito gestión{item.creditedUf != null ? ` · ${uf(item.creditedUf)}` : ''}</span> : null}</td><td className="px-3 py-3 tabular-nums"><span className="block">{item.stale90 == null ? (item.active == null ? '—' : `${n(item.active)} activos`) : `${n(item.stale90)} >90d`}</span>{item.staleRatio != null ? <span className="block text-xs text-[var(--n3-text-muted)]">{pct(item.staleRatio)} del activo</span> : null}</td><td className="px-3 py-3 tabular-nums"><span className="block">{item.visitRate == null ? '—' : pct(item.visitRate)}</span>{item.scheduled != null && item.realized != null ? <span className="block text-xs text-[var(--n3-text-muted)]">{n(item.realized)} / {n(item.scheduled)} visitas</span> : null}</td><td className={`px-3 py-3 font-semibold ${riskClass(item.risk)}`}>{riskLabel(item.risk)}</td><td className="px-3 py-3 text-right"><Link href={`/dashboard/control/offices/${officeSlug(item.name)}`} className="inline-flex items-center gap-1 font-medium hover:text-[var(--n3-text-light)]">Office 360<ArrowRight size={13} /></Link></td></tr>)}</tbody></table></div>
    </section>

    <DataStatusBar cutoff={freshness} coverage={coverageLabel} issues={operations.errors.length + dataLayerIssues + (approvedMetricCount === 0 ? 1 : 0)} status={dataStatus} />
  </WorkspaceShell>
}
