'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PrintReportButton from '@/components/reports/print-report-button'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric = { code: string; label: string; unit: string; value: number | null; target: number | null; compliance: number | null }
type Entity = { id: string; name: string; entityType: string; classification?: string | null; metrics: Metric[] }
type Task = { id: string; title: string; status: string; priority: string; due_date: string | null; subjectProfile?: { full_name: string | null } | null }
type Payload = { scopeLabel: string; periodLabel: string; generatedAt?: string; dataProvenance?: string; entities: Entity[]; alerts: Array<{ id: string; entityName: string; title: string; detail: string; severity: string }>; operational?: { valuationCases: number; valuationInReview: number; activePropertyAssignments: number; teamMembers: number } | null }

const getMetric = (entity: Entity | undefined, code: string) => entity?.metrics.find((item) => item.code === code)
const fmt = (item?: Metric) => item?.value == null ? 'n/d' : item.unit === 'uf' ? `${item.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF` : item.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
const isOverdue = (task: Task) => Boolean(task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date())

export function DirectorReport() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void (async () => {
    try {
      const [summaryResponse, taskResponse] = await Promise.all([fetch('/api/management/summary', { cache: 'no-store' }), fetch('/api/management/tasks', { cache: 'no-store' })])
      const summary = await summaryResponse.json(); const taskData = await taskResponse.json()
      if (!summaryResponse.ok) throw new Error(summary.error || 'No fue posible generar el reporte.')
      if (!taskResponse.ok) throw new Error(taskData.error || 'No fue posible cargar las tareas del reporte.')
      setPayload(summary); setTasks(taskData.tasks ?? [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible generar el reporte.') }
  })() }, [])

  const branch = payload?.entities.find((entity) => entity.entityType === 'branch')
  const team = payload?.entities.filter((entity) => entity.entityType === 'partner') ?? []
  const openTasks = tasks.filter((task) => task.status === 'open' || task.status === 'in_progress')
  const overdueTasks = openTasks.filter(isOverdue)
  const generatedId = useMemo(() => `DIR-${payload?.scopeLabel?.toUpperCase().replace(/[^A-Z0-9]+/g, '-') ?? 'OFICINA'}-${(payload?.generatedAt ?? new Date().toISOString()).slice(0,10).replaceAll('-','')}`, [payload])
  const period = payload?.periodLabel || 'Período no disponible'

  return <IntelligencePage>
    <div className="print-hidden flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard/director" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]">Volver a dirección</Link><PrintReportButton/></div>
    <IntelligenceHeader eyebrow="Reporte de dirección" title={`Oficina ${payload?.scopeLabel ?? ''}`} description={`Resultado comercial, equipo, alertas y operación. Corte: ${period}.`} meta={<div className="text-xs text-[var(--n3-text-muted)]">ID {generatedId}</div>} />
    {error ? <div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]">{error}</div> : null}
    {!payload && !error ? <div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Generando reporte…</div> : null}
    {payload ? <>
      <section><SectionHeading eyebrow="01 · Resumen" title="Resultado y operación" description={`Indicadores correspondientes a ${period}.`}/><MetricGrid columns={4}><MetricCard label={getMetric(branch,'sales')?.label ?? 'Cierres'} value={fmt(getMetric(branch,'sales'))} detail={`Meta ${getMetric(branch,'sales')?.target ?? 'n/d'}`}/><MetricCard label={getMetric(branch,'sales_uf')?.label ?? 'Venta UF'} value={fmt(getMetric(branch,'sales_uf'))}/><MetricCard label="Valorizaciones en revisión" value={payload.operational?.valuationInReview ?? 0}/><MetricCard label="Tareas vencidas" value={overdueTasks.length} detail={`${openTasks.length} tareas activas`}/></MetricGrid></section>
      <section><SectionHeading eyebrow="02 · Equipo" title="Desempeño por ejecutiva"/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[900px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Ejecutiva</th><th className="px-4 py-3 text-left">Clasificación</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">UF</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Cartera</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th></tr></thead><tbody>{team.map((entity) => <tr key={entity.id} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3 font-medium">{entity.name}</td><td className="px-4 py-3">{entity.classification ?? 'n/d'}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'sales'))}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'sales_uf'))}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'management_score'))}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'portfolio_score'))}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'follow_up_score'))}</td><td className="px-4 py-3 text-right">{fmt(getMetric(entity,'conversion'))}</td></tr>)}</tbody></table></div></section>
      <section className="grid gap-5 xl:grid-cols-2"><div><SectionHeading eyebrow="03 · Alertas" title="Brechas prioritarias"/><div className="space-y-3">{payload.alerts.length ? payload.alerts.slice(0,20).map((alert) => <article key={alert.id} className="border border-[var(--n3-line)] p-4"><p className="font-semibold">{alert.entityName} · {alert.title}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{alert.detail}</p></article>) : <p className="border border-dashed border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">Sin brechas detectadas para el corte.</p>}</div></div><div><SectionHeading eyebrow="04 · Tareas" title="Seguimiento activo"/><div className="space-y-3">{openTasks.length ? openTasks.map((task) => <article key={task.id} className={`border p-4 ${isOverdue(task) ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}><p className="font-semibold">{task.title}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{task.subjectProfile?.full_name ?? 'Sin responsable'} · {task.priority} · vence {task.due_date ?? 'sin fecha'}{isOverdue(task) ? ' · VENCIDA' : ''}</p></article>) : <p className="border border-dashed border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">Sin tareas activas.</p>}</div></div></section>
      <section><SectionHeading eyebrow="05 · Trazabilidad" title="Fuente y vigencia"/><MethodologyNote>Reporte {generatedId}. Período {period}. Generado {payload.generatedAt ? new Date(payload.generatedAt).toLocaleString('es-CL') : new Date().toLocaleString('es-CL')}. {payload.dataProvenance} Este documento refleja datos canónicos y operación visible según RLS al momento de generación.</MethodologyNote></section>
    </> : null}
  </IntelligencePage>
}
