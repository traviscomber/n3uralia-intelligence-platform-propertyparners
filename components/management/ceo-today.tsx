'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type Point = {
  period: string
  sales: number | null
  salesTarget: number | null
  metrics?: Record<string, number | null>
}

type Entity = { entityType: string; evolution?: Point[] }
type Summary = { entities: Entity[]; generatedAt?: string }
type Operations = {
  valuations: { review: number }
  assignments: { paused: number }
  market: {
    neighborhoodApprovals: number
    neighborhoodRecommendations: number
    neighborhoodCorrections: number
    neighborhoodManual: number
  }
  tasks: { overdue: number; urgent: number }
  generatedAt: string
}
type Priority = { label: string; detail: string; href: string; critical?: boolean }

const n = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
const ratio = (value: number | null | undefined, target: number | null | undefined) => value != null && target != null && target !== 0 ? value / target * 100 : null

export function CeoToday() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [operations, setOperations] = useState<Operations | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      const [summaryResponse, operationsResponse] = await Promise.all([
        fetch('/api/management/summary', { cache: 'no-store' }),
        fetch('/api/management/ceo-operations', { cache: 'no-store' }),
      ])
      if (!summaryResponse.ok || !operationsResponse.ok) throw new Error('LOAD_FAILED')
      setSummary(await summaryResponse.json())
      setOperations(await operationsResponse.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const company = summary?.entities.find((item) => item.entityType === 'company')
  const latest = useMemo(() => [...(company?.evolution ?? [])].sort((a, b) => b.period.localeCompare(a.period))[0], [company])
  const compliance = ratio(latest?.sales, latest?.salesTarget)
  const gap = latest?.sales != null && latest?.salesTarget != null ? latest.sales - latest.salesTarget : null
  const active = latest?.metrics?.active_leads_snapshot ?? null
  const stale = latest?.metrics?.stale_90_leads ?? null
  const staleRatio = ratio(stale, active)
  const scheduled = latest?.metrics?.scheduled_visits ?? null
  const realized = latest?.metrics?.realized_visits ?? null
  const visitRate = ratio(realized, scheduled)

  const priorities = useMemo<Priority[]>(() => {
    const items: Priority[] = []
    if (operations?.market.neighborhoodApprovals) {
      const parts = [
        operations.market.neighborhoodRecommendations ? `${n(operations.market.neighborhoodRecommendations)} recomendaciones` : null,
        operations.market.neighborhoodCorrections ? `${n(operations.market.neighborhoodCorrections)} correcciones verificadas` : null,
        operations.market.neighborhoodManual ? `${n(operations.market.neighborhoodManual)} excepciones` : null,
      ].filter(Boolean)
      items.push({
        label: 'Resolver barrios',
        detail: `${parts.join(' + ')} en ${n(operations.market.neighborhoodApprovals)} decisión${operations.market.neighborhoodApprovals === 1 ? '' : 'es'}`,
        href: '/dashboard/market/revisar-barrios',
      })
    }
    if (operations?.tasks.overdue) items.push({ label: 'Tareas vencidas', detail: `${n(operations.tasks.overdue)} requieren resolución`, href: '/dashboard/control/operations', critical: true })
    if (gap != null && gap < 0) items.push({ label: 'Meta comercial', detail: `Brecha de ${n(Math.abs(gap), 1)} operaciones`, href: '/dashboard/control/admin', critical: true })
    if (stale != null && stale > 0 && staleRatio != null && staleRatio >= 20) items.push({ label: 'Leads antiguos', detail: `${n(stale)} leads superan 90 días`, href: '/dashboard/control/operations' })
    if (visitRate != null && visitRate < 80) items.push({ label: 'Visitas', detail: `${n(visitRate, 0)}% de ejecución`, href: '/dashboard/control/operations' })
    if (operations?.valuations.review) items.push({ label: 'Valorizaciones', detail: `${n(operations.valuations.review)} esperando revisión`, href: '/dashboard/valuations' })
    if (operations?.assignments.paused) items.push({ label: 'Asignaciones', detail: `${n(operations.assignments.paused)} pausadas`, href: '/dashboard/properties/admin' })
    return items.slice(0, 3)
  }, [gap, operations, stale, staleRatio, visitRate])

  if (loading) return <WorkspaceShell><OperationalState kind="loading" title="Preparando prioridades" description="Consultando desempeño, tareas y excepciones ejecutivas del período." /></WorkspaceShell>

  if (failed || !summary || !operations) return <WorkspaceShell><OperationalState kind="error" title="No fue posible preparar las prioridades" description="La información ejecutiva no pudo consultarse. No se muestran métricas parciales como si fueran completas."><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm font-semibold"><RefreshCw size={15} />Reintentar</button></OperationalState></WorkspaceShell>

  const statusText = compliance == null
    ? 'No hay evidencia suficiente para resumir el avance del período.'
    : compliance >= 100
      ? 'El negocio está cumpliendo la meta del período.'
      : compliance >= 80
        ? 'El negocio está cerca de la meta; conviene concentrarse en las excepciones.'
        : 'El negocio está bajo la meta y requiere atención en las prioridades señaladas.'

  return (
    <WorkspaceShell>
      <WorkspaceHeader eyebrow="Hoy" title="Prioridades ejecutivas" meta={latest?.period ?? 'Sin período'} />

      <div className="mt-6 max-w-4xl">
        <p className="text-xl leading-8 text-[var(--n3-text-light)] sm:text-2xl">{statusText}</p>
      </div>

      <MetricStrip items={[
        { label: 'Ventas', value: n(latest?.sales, 1) },
        { label: 'Meta', value: n(latest?.salesTarget, 1) },
        { label: 'Cumplimiento', value: compliance == null ? '—' : `${n(compliance, 0)}%`, tone: compliance == null ? 'default' : compliance >= 100 ? 'success' : compliance >= 80 ? 'warning' : 'danger' },
        { label: 'Por revisar', value: operations.valuations.review + operations.market.neighborhoodApprovals, tone: operations.valuations.review + operations.market.neighborhoodApprovals ? 'warning' : 'default' },
      ]} />

      <section className="mt-8 max-w-5xl">
        <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Qué requiere atención</h2>
          <span className="text-xs text-[var(--n3-text-muted)]">{priorities.length}</span>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {priorities.length ? priorities.map((item, index) => (
            <Link key={`${item.label}-${index}`} href={item.href} className="group grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--n3-text-light)]">{item.label}</p>
                <p className={`mt-1 break-words text-sm ${item.critical ? 'text-[#ff8d87]' : 'text-[var(--n3-text-muted)]'}`}>{item.detail}</p>
              </div>
              <span className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">Revisar <ArrowRight size={14} /></span>
            </Link>
          )) : (
            <div className="py-8 text-sm text-[var(--n3-text-muted)]">No hay excepciones prioritarias con la evidencia disponible.</div>
          )}
        </div>
      </section>
    </WorkspaceShell>
  )
}
