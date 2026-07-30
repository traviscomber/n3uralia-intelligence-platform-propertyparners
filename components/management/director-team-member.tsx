'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MetricCard, MetricGrid, SectionHeading, MethodologyNote } from '@/components/intelligence/design-system'

type Metric = { code: string; label: string; unit: string; value: number | null; target: number | null; compliance: number | null; mom: number | null; methodology: string; sourceName: string | null; sourceReference?: string | null }
type Entity = { id: string; name: string; entityType: string; classification?: string | null; metrics: Metric[]; evolution?: Array<{ period: string; sales: number | null; salesTarget: number | null; salesUf: number | null; salesUfTarget: number | null }> }
type Task = { id: string; title: string; detail: string | null; severity: string; status: string; due_date: string | null; created_at: string }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
const getMetric = (entity: Entity, code: string) => entity.metrics.find((item) => item.code === code)
const format = (metric?: Metric) => {
  if (!metric || metric.value === null) return 'n/d'
  if (metric.unit === 'uf') return `${metric.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
  return metric.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

export function DirectorTeamMember({ slug }: { slug: string }) {
  const [entity, setEntity] = useState<Entity | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [scope, setScope] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [summaryResponse, tasksResponse] = await Promise.all([
        fetch('/api/management/summary', { cache: 'no-store' }),
        fetch('/api/management/tasks', { cache: 'no-store' }),
      ])
      const summary = await summaryResponse.json()
      const taskData = await tasksResponse.json()
      if (!summaryResponse.ok) throw new Error(summary.error || 'No fue posible cargar la ficha.')
      const match = (summary.entities as Entity[]).find((item) => item.entityType === 'partner' && normalize(item.name) === slug)
      if (!match) throw new Error('La ejecutiva no pertenece al alcance autorizado o no tiene ficha canónica.')
      setEntity(match); setScope(summary.scopeLabel)
      setTasks((taskData.tasks ?? []).filter((task: Task & { subject_profile_id?: string | null }) => task.title.toLowerCase().includes(match.name.toLowerCase()) || task.detail?.toLowerCase().includes(match.name.toLowerCase())))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar la ficha.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [slug])

  const scoreMetrics = useMemo(() => entity ? ['management_score','portfolio_score','follow_up_score','conversion'].map((code) => getMetric(entity, code)).filter(Boolean) as Metric[] : [], [entity])

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Dirección · Ficha ejecutiva" title={entity?.name ?? 'Detalle de ejecutiva'} description={`Desempeño, metas, evolución y tareas dentro de ${scope || 'la oficina autorizada'}.`} actions={[{ label: 'Volver al equipo', href: '/dashboard/director', primary: true }]} />
    {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando ficha y tareas…</div> : null}
    {error ? <div className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={14}/>Reintentar</button></div> : null}
    {entity && !loading && !error ? <>
      <Link href="/dashboard/director" className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)] hover:text-white"><ArrowLeft size={14}/>Volver a dirección</Link>
      <section><SectionHeading eyebrow="01 · Resultado comercial" title={entity.classification ?? 'Sin clasificación'} description="Cierre junio 2026 y metas canónicas disponibles."/><MetricGrid columns={4}>{['sales','sales_uf','cumulative_sales','stock'].map((code) => { const item = getMetric(entity, code); return <MetricCard key={code} label={item?.label ?? code} value={format(item)} detail={`${item?.target === null || item?.target === undefined ? 'Meta n/d' : `Meta ${item.target.toLocaleString('es-CL')}`} · ${item?.compliance === null || item?.compliance === undefined ? 'Cumpl. n/d' : `${item.compliance.toFixed(1)}%`}`}/> })}</MetricGrid></section>
      <section><SectionHeading eyebrow="02 · Calidad de gestión" title="Scores y brechas"/><MetricGrid columns={4}>{scoreMetrics.map((item) => <MetricCard key={item.code} label={item.label} value={format(item)} detail={`Objetivo 70 · ${item.value === null ? 'sin dato' : item.value >= 70 ? 'cumple' : `brecha ${(70-item.value).toFixed(1)} pts`}`}/>)}</MetricGrid></section>
      <section><SectionHeading eyebrow="03 · Evolución" title="Cierres mensuales versus meta"/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[720px] w-full text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Mes</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">Meta</th><th className="px-4 py-3 text-right">UF</th><th className="px-4 py-3 text-right">Meta UF</th></tr></thead><tbody>{entity.evolution?.map((point) => <tr key={point.period} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3">{point.period}</td><td className="px-4 py-3 text-right">{point.sales ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesTarget ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesUf?.toLocaleString('es-CL') ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesUfTarget?.toLocaleString('es-CL') ?? 'n/d'}</td></tr>)}</tbody></table></div></section>
      <section><SectionHeading eyebrow="04 · Seguimiento" title="Tareas asociadas" description="Sólo tareas persistentes creadas por dirección."/><div className="space-y-3">{tasks.length ? tasks.map((task) => <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex items-start gap-3"><ClipboardCheck size={17} className="mt-0.5 text-[#ff766f]"/><div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{task.status} · {task.due_date ?? 'sin vencimiento'}</p>{task.detail ? <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p> : null}</div></div></article>) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen tareas persistentes asociadas.</div>}</div></section>
      <MethodologyNote>La ficha usa datos canónicos del período enero–junio 2026. Las tareas son registros operativos persistentes y están limitadas por RLS a la oficina autorizada.</MethodologyNote>
    </> : null}
  </IntelligencePage>
}
