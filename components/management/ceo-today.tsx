'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'
import { formatPropertyPartnersPeriod } from '@/lib/property-partners-time'

type CurrentSnapshot = {
  period: { key: string; start: string; end: string }
  sales: number | null
  salesTarget: number | null
  compliance: number | null
  salesUf: number | null
  managementCreditedSales: number | null
  metrics: Record<string, number | null>
  status: 'verified_operational'
  publicationStatus: 'not_formal_monthly_close'
  goalSource: string | null
  sourceCutoffAt: string | null
}

type CurrentResponse = {
  snapshot: CurrentSnapshot | null
  status: string
  note?: string
}

type Operations = {
  valuations: { review: number }
  assignments: { paused: number }
  market: {
    neighborhoodTotal: number
    neighborhoodResolved: number
    neighborhoodExceptions: number
  }
  tasks: { overdue: number; urgent: number }
  generatedAt: string
}

type Priority = { label: string; detail: string; href: string; critical?: boolean }

const n = (value: number | null | undefined, digits = 0) => value == null
  ? '—'
  : value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })

const ratio = (value: number | null | undefined, target: number | null | undefined) =>
  value != null && target != null && target !== 0 ? value / target * 100 : null

export function CeoToday() {
  const [current, setCurrent] = useState<CurrentResponse | null>(null)
  const [operations, setOperations] = useState<Operations | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      const [currentResponse, operationsResponse] = await Promise.all([
        fetch('/api/management/ceo-current', { cache: 'no-store' }),
        fetch('/api/management/ceo-operations', { cache: 'no-store' }),
      ])
      if (!currentResponse.ok || !operationsResponse.ok) throw new Error('LOAD_FAILED')
      setCurrent(await currentResponse.json())
      setOperations(await operationsResponse.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const snapshot = current?.snapshot ?? null
  const compliance = snapshot?.compliance ?? null
  const gap = snapshot?.sales != null && snapshot?.salesTarget != null ? snapshot.sales - snapshot.salesTarget : null
  const active = snapshot?.metrics.active_leads_snapshot ?? null
  const stale = snapshot?.metrics.stale_90_leads ?? null
  const staleRatio = ratio(stale, active)
  const scheduled = snapshot?.metrics.scheduled_visits ?? null
  const realized = snapshot?.metrics.realized_visits ?? null
  const visitRate = ratio(realized, scheduled)

  const priorities = useMemo<Priority[]>(() => {
    const items: Priority[] = []
    if (operations?.market.neighborhoodExceptions) {
      items.push({
        label: 'Excepciones territoriales',
        detail: `${n(operations.market.neighborhoodExceptions)} caso${operations.market.neighborhoodExceptions === 1 ? '' : 's'} sin evidencia suficiente para resolución automática`,
        href: '/dashboard/market/revisar-barrios',
      })
    }
    if (operations?.tasks.overdue) {
      items.push({
        label: 'Tareas vencidas',
        detail: `${n(operations.tasks.overdue)} requieren resolución`,
        href: '/dashboard/control/operations',
        critical: true,
      })
    }
    if (gap != null && gap < 0) {
      items.push({
        label: 'Meta comercial',
        detail: `Brecha de ${n(Math.abs(gap), 1)} operaciones respecto de la meta aprobada`,
        href: '/dashboard/control/admin',
        critical: true,
      })
    }
    if (stale != null && stale > 0 && staleRatio != null && staleRatio >= 20) {
      items.push({ label: 'Leads antiguos', detail: `${n(stale)} leads superan 90 días`, href: '/dashboard/control/operations' })
    }
    if (visitRate != null && visitRate < 80) {
      items.push({ label: 'Visitas', detail: `${n(visitRate, 0)}% de ejecución`, href: '/dashboard/control/operations' })
    }
    if (operations?.valuations.review) {
      items.push({ label: 'Valorizaciones', detail: `${n(operations.valuations.review)} esperando revisión`, href: '/dashboard/valuations' })
    }
    if (operations?.assignments.paused) {
      items.push({ label: 'Asignaciones', detail: `${n(operations.assignments.paused)} pausadas`, href: '/dashboard/properties/admin' })
    }
    return items.slice(0, 3)
  }, [gap, operations, stale, staleRatio, visitRate])

  if (loading) {
    return <WorkspaceShell><OperationalState kind="loading" title="Preparando prioridades" description="Consultando el último período operativo verificado, tareas y excepciones ejecutivas." /></WorkspaceShell>
  }

  if (failed || !current || !operations) {
    return <WorkspaceShell><OperationalState kind="error" title="No fue posible preparar las prioridades" description="La información ejecutiva no pudo consultarse. No se muestran métricas parciales como si fueran completas."><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 text-sm font-semibold"><RefreshCw size={15} />Reintentar</button></OperationalState></WorkspaceShell>
  }

  if (!snapshot) {
    return <WorkspaceShell><OperationalState kind="empty" title="Sin período operativo verificado" description="No existe un período con ventas verificadas y evaluables para construir la vista ejecutiva." /></WorkspaceShell>
  }

  const statusText = compliance == null
    ? 'El período tiene ventas verificadas, pero no existe una meta aprobada suficiente para calcular cumplimiento.'
    : compliance >= 100
      ? `Meta mensual superada: ${n(snapshot.sales)} cierres sobre una meta aprobada de ${n(snapshot.salesTarget)}.`
      : compliance >= 80
        ? 'El negocio está cerca de la meta; conviene concentrarse en las excepciones operativas.'
        : 'El negocio está bajo la meta y requiere atención en las prioridades señaladas.'

  const reviewCount = operations.valuations.review + operations.market.neighborhoodExceptions

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Hoy"
        title="Lo importante hoy"
        meta={`${formatPropertyPartnersPeriod(snapshot.period.key)} · último período operativo verificado`}
      />

      <div className="mt-5 max-w-4xl border-l-2 border-[var(--n3-line)] pl-4">
        <p className="text-xl leading-8 text-[var(--n3-text-light)] sm:text-2xl">{statusText}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">Datos al último corte disponible.</p>
      </div>

      <MetricStrip items={[
        { label: 'Ventas', value: n(snapshot.sales) },
        { label: 'Meta', value: n(snapshot.salesTarget) },
        { label: 'Cumplimiento', value: compliance == null ? '—' : `${n(compliance, 1)}%`, tone: compliance == null ? 'default' : compliance >= 100 ? 'success' : compliance >= 80 ? 'warning' : 'danger' },
        ...(reviewCount > 0 ? [{ label: 'Por revisar', value: reviewCount.toLocaleString('es-CL'), tone: 'warning' as const }] : []),
      ]} />

      {priorities.length ? (
        <section className="mt-8 max-w-5xl">
          <div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2">
            <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Requiere atención</h2>
            <span className="text-xs text-[var(--n3-text-muted)]">{priorities.length}</span>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">
            {priorities.map((item, index) => (
              <Link key={`${item.label}-${index}`} href={item.href} className="group grid min-h-20 gap-3 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--n3-text-light)]">{item.label}</p>
                  <p className={`mt-1 break-words text-sm ${item.critical ? 'text-[#ff8d87]' : 'text-[var(--n3-text-muted)]'}`}>{item.detail}</p>
                </div>
                <span className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--n3-teal-soft)]">Abrir <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-8 max-w-5xl border-y border-[var(--n3-line)] py-5">
          <p className="text-sm font-medium">No hay pendientes prioritarios.</p>
        </section>
      )}
    </WorkspaceShell>
  )
}
