'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, History, Home, MessageSquare, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MetricCard, MetricGrid, SectionHeading, MethodologyNote } from '@/components/intelligence/design-system'

type Metric = { code: string; label: string; unit: string; value: number | null; target: number | null; compliance: number | null; mom: number | null; methodology: string; sourceName: string | null; sourceReference?: string | null }
type Entity = { id: string; name: string; entityType: string; classification?: string | null; metrics: Metric[]; evolution?: Array<{ period: string; sales: number | null; salesTarget: number | null; salesUf: number | null; salesUfTarget: number | null }> }
type Profile = { id: string; full_name: string | null; team: string | null; role: string | null }
type Comment = { id: string; body: string; created_at: string; authorProfile?: Profile | null }
type Event = { id: string; event_type: string; changes: Record<string, unknown>; created_at: string; actorProfile?: Profile | null }
type Task = { id: string; title: string; detail: string | null; severity: string; priority: string; status: string; due_date: string | null; created_at: string; assignedProfile?: Profile | null; subjectProfile?: Profile | null; comments?: Comment[]; events?: Event[] }
type Operational = { member: Profile; valuations: Array<{ id: string; status: string; address: string | null; property_type: string | null; estimated_value_uf: number | null; valuation_date: string | null }>; assignments: Array<{ id: string; status: string; assignment_role: string; assigned_at: string; market_properties: { id: string; normalized_address: string | null; property_type: string | null; bedrooms: number | null; bathrooms: number | null; useful_area_m2: number | null } | null }>; summary: { valuationCount: number; valuationDrafts: number; valuationInReview: number; activeAssignments: number; activeTasks: number; overdueTasks: number }; errors: string[] }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
const getMetric = (entity: Entity, code: string) => entity.metrics.find((item) => item.code === code)
const format = (item?: Metric) => !item || item.value === null ? 'n/d' : item.unit === 'uf' ? `${item.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF` : item.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
const statusLabel: Record<string, string> = { open: 'Abierta', in_progress: 'En progreso', done: 'Completada', dismissed: 'Descartada', draft: 'Borrador', review: 'En revisión', approved: 'Aprobada', issued: 'Emitida', active: 'Activa', paused: 'Pausada', ended: 'Finalizada' }

export function DirectorTeamMember({ slug }: { slug: string }) {
  const [entity, setEntity] = useState<Entity | null>(null)
  const [partners, setPartners] = useState<Entity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [operational, setOperational] = useState<Operational | null>(null)
  const [scope, setScope] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [summaryResponse, tasksResponse, operationalResponse] = await Promise.all([
        fetch('/api/management/summary', { cache: 'no-store' }),
        fetch('/api/management/tasks', { cache: 'no-store' }),
        fetch(`/api/management/team-member?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }),
      ])
      const summary = await summaryResponse.json(); const taskData = await tasksResponse.json(); const operationalData = await operationalResponse.json()
      if (!summaryResponse.ok) throw new Error(summary.error || 'No fue posible cargar la ficha.')
      if (!operationalResponse.ok) throw new Error(operationalData.error || 'No fue posible cargar la operación de la ejecutiva.')
      const team = (summary.entities as Entity[]).filter((item) => item.entityType === 'partner')
      const match = team.find((item) => normalize(item.name) === slug)
      if (!match) throw new Error('La ejecutiva no pertenece al alcance autorizado o no tiene ficha canónica.')
      setEntity(match); setPartners(team); setScope(summary.scopeLabel); setOperational(operationalData)
      setTasks((taskData.tasks ?? []).filter((task: Task) => task.subjectProfile?.id === operationalData.member.id || task.assignedProfile?.id === operationalData.member.id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar la ficha.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [slug])

  const scoreMetrics = useMemo(() => entity ? ['management_score','portfolio_score','follow_up_score','conversion'].map((code) => getMetric(entity, code)).filter(Boolean) as Metric[] : [], [entity])
  const officeAverages = useMemo(() => Object.fromEntries(['management_score','portfolio_score','follow_up_score','conversion','sales','sales_uf','stock'].map((code) => {
    const values = partners.map((partner) => getMetric(partner, code)?.value).filter((value): value is number => typeof value === 'number')
    return [code, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null]
  })), [partners])

  async function updateTask(id: string, patch: Record<string, unknown>) {
    setSaving(id)
    try {
      const response = await fetch('/api/management/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible actualizar la tarea.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la tarea.') }
    finally { setSaving(null) }
  }

  async function addComment(id: string) {
    const value = (comment[id] ?? '').trim(); if (!value) return
    setSaving(id)
    try {
      const response = await fetch('/api/management/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comment', taskId: id, comment: value }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible guardar el comentario.')
      setComment((current) => ({ ...current, [id]: '' })); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar el comentario.') }
    finally { setSaving(null) }
  }

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Dirección · Ficha ejecutiva" title={entity?.name ?? 'Detalle de ejecutiva'} description={`Desempeño, comparación de oficina, cartera, valorizaciones y tareas dentro de ${scope || 'la oficina autorizada'}.`} actions={[{ label: 'Volver al equipo', href: '/dashboard/director', primary: true }, { label: 'Reporte de oficina', href: '/dashboard/director/reporte' }]} />
    {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]" role="status">Cargando ficha y operación…</div> : null}
    {error ? <div className="border border-[#d7332b] p-5 text-sm text-[#ff766f]" role="alert"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14}/>Reintentar</button></div> : null}
    {entity && operational && !loading ? <>
      <Link href="/dashboard/director" className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={14}/>Volver a dirección</Link>
      <section><SectionHeading eyebrow="01 · Resultado comercial" title={entity.classification ?? 'Sin clasificación'} description="Cierre junio 2026 y metas canónicas disponibles."/><MetricGrid columns={4}>{['sales','sales_uf','cumulative_sales','stock'].map((code) => { const item = getMetric(entity, code); const average = officeAverages[code]; return <MetricCard key={code} label={item?.label ?? code} value={format(item)} detail={`${item?.target == null ? 'Meta n/d' : `Meta ${item.target.toLocaleString('es-CL')}`} · ${item?.compliance == null ? 'Cumpl. n/d' : `${item.compliance.toFixed(1)}%`} · Prom. oficina ${average == null ? 'n/d' : average.toLocaleString('es-CL', { maximumFractionDigits: 1 })}`}/> })}</MetricGrid></section>
      <section><SectionHeading eyebrow="02 · Calidad de gestión" title="Scores y comparación con Lo Beltrán"/><MetricGrid columns={4}>{scoreMetrics.map((item) => { const average = officeAverages[item.code]; return <MetricCard key={item.code} label={item.label} value={format(item)} detail={`Objetivo 70 · ${item.value === null ? 'sin dato' : item.value >= 70 ? 'cumple' : `brecha ${(70-item.value).toFixed(1)} pts`} · Prom. oficina ${average == null ? 'n/d' : average.toFixed(1)}`}/> })}</MetricGrid></section>
      <section><SectionHeading eyebrow="03 · Operación viva" title="Cartera, valorizaciones y seguimiento"/><MetricGrid columns={4}><MetricCard label="Propiedades activas" value={operational.summary.activeAssignments}/><MetricCard label="Valorizaciones" value={operational.summary.valuationCount} detail={`${operational.summary.valuationDrafts} borrador · ${operational.summary.valuationInReview} revisión`}/><MetricCard label="Tareas activas" value={operational.summary.activeTasks}/><MetricCard label="Tareas vencidas" value={operational.summary.overdueTasks}/></MetricGrid>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><h3 className="flex items-center gap-2 font-semibold"><Home size={17}/>Propiedades asignadas</h3><div className="mt-4 space-y-3">{operational.assignments.length ? operational.assignments.map((assignment) => <article key={assignment.id} className="border border-[var(--n3-line)] p-3"><p className="font-medium">{assignment.market_properties?.normalized_address ?? 'Dirección no disponible'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{assignment.market_properties?.property_type ?? 'Tipo n/d'} · {assignment.market_properties?.useful_area_m2 ?? 'n/d'} m² · {statusLabel[assignment.status] ?? assignment.status}</p></article>) : <p className="text-sm text-[var(--n3-text-muted)]">Sin propiedades asignadas.</p>}</div></div>
          <div className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><h3 className="font-semibold">Valorizaciones recientes</h3><div className="mt-4 space-y-3">{operational.valuations.length ? operational.valuations.map((valuation) => <article key={valuation.id} className="border border-[var(--n3-line)] p-3"><p className="font-medium">{valuation.address ?? 'Dirección no disponible'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{statusLabel[valuation.status] ?? valuation.status} · {valuation.estimated_value_uf == null ? 'Sin resultado' : `${Number(valuation.estimated_value_uf).toLocaleString('es-CL')} UF`}</p></article>) : <p className="text-sm text-[var(--n3-text-muted)]">Sin valorizaciones registradas.</p>}</div></div>
        </div>
      </section>
      <section><SectionHeading eyebrow="04 · Evolución" title="Cierres mensuales versus meta"/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[720px] w-full text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Mes</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">Meta</th><th className="px-4 py-3 text-right">UF</th><th className="px-4 py-3 text-right">Meta UF</th></tr></thead><tbody>{entity.evolution?.map((point) => <tr key={point.period} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3">{point.period}</td><td className="px-4 py-3 text-right">{point.sales ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesTarget ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesUf?.toLocaleString('es-CL') ?? 'n/d'}</td><td className="px-4 py-3 text-right">{point.salesUfTarget?.toLocaleString('es-CL') ?? 'n/d'}</td></tr>)}</tbody></table></div></section>
      <section><SectionHeading eyebrow="05 · Seguimiento" title="Tareas, comentarios e historial" description="Registros persistentes y auditados dentro del alcance de la oficina."/><div className="space-y-4">{tasks.length ? tasks.map((task) => <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><ClipboardCheck size={18} className="text-[#ff766f]"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{task.title}</p><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{task.priority}</span><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{statusLabel[task.status] ?? task.status}</span></div><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><select aria-label="Estado de tarea" value={task.status} onChange={(event) => void updateTask(task.id, { status: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm"><option value="open">Abierta</option><option value="in_progress">En progreso</option><option value="done">Completada</option><option value="dismissed">Descartada</option></select><select aria-label="Prioridad de tarea" value={task.priority} onChange={(event) => void updateTask(task.id, { priority: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><input aria-label="Fecha de vencimiento" type="date" value={task.due_date ?? ''} onChange={(event) => void updateTask(task.id, { dueDate: event.target.value })} className="border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm"/></div><div className="mt-4"><label className="text-xs text-[var(--n3-text-muted)]" htmlFor={`comment-${task.id}`}>Agregar comentario</label><div className="mt-2 flex gap-2"><input id={`comment-${task.id}`} value={comment[task.id] ?? ''} onChange={(event) => setComment((current) => ({ ...current, [task.id]: event.target.value }))} className="min-w-0 flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm"/><button disabled={saving === task.id} onClick={() => void addComment(task.id)} className="border border-[var(--n3-line)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><MessageSquare size={15}/><span className="sr-only">Guardar comentario</span></button></div></div>
        {task.comments?.length ? <div className="mt-4 space-y-2"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><MessageSquare size={14}/>Comentarios</p>{task.comments.map((item) => <div key={item.id} className="border-l border-[var(--n3-line)] pl-3 text-sm"><p>{item.body}</p><p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{item.authorProfile?.full_name ?? 'Usuario'} · {new Date(item.created_at).toLocaleString('es-CL')}</p></div>)}</div> : null}
        {task.events?.length ? <details className="mt-4"><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><History size={14}/>Historial ({task.events.length})</summary><div className="mt-3 space-y-2">{task.events.map((event) => <div key={event.id} className="text-xs text-[var(--n3-text-muted)]">{new Date(event.created_at).toLocaleString('es-CL')} · {event.actorProfile?.full_name ?? 'Sistema'} · {event.event_type}</div>)}</div></details> : null}</div></div></article>) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen tareas persistentes asociadas.</div>}</div></section>
      <MethodologyNote>Datos canónicos enero–junio 2026 y operación viva de Supabase. Propiedades, valorizaciones y tareas están limitadas por RLS a la oficina autorizada.</MethodologyNote>
    </> : null}
  </IntelligencePage>
}
