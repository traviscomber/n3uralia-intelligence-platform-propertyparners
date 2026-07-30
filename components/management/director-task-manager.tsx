'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { History, MessageSquare, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, SectionHeading } from '@/components/intelligence/design-system'

type Profile = { id: string; full_name: string | null; team: string | null; role: string | null }
type Comment = { id: string; body: string; created_at: string; authorProfile?: Profile | null }
type Event = { id: string; event_type: string; created_at: string; actorProfile?: Profile | null }
type Task = { id: string; title: string; detail: string | null; status: string; priority: string; due_date: string | null; assigned_to: string | null; assignedProfile?: Profile | null; subjectProfile?: Profile | null; comments?: Comment[]; events?: Event[] }

export function DirectorTaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<Profile[]>([])
  const [filter, setFilter] = useState<'active'|'all'|'done'>('active')
  const [comments, setComments] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [taskResponse, assigneeResponse] = await Promise.all([fetch('/api/management/tasks', { cache: 'no-store' }), fetch('/api/management/assignees', { cache: 'no-store' })])
      const taskData = await taskResponse.json(); const assigneeData = await assigneeResponse.json()
      if (!taskResponse.ok) throw new Error(taskData.error || 'No fue posible cargar las tareas.')
      if (!assigneeResponse.ok) throw new Error(assigneeData.error || 'No fue posible cargar responsables.')
      setTasks(taskData.tasks ?? []); setAssignees(assigneeData.assignees ?? [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar las tareas.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function update(id: string, patch: Record<string, unknown>) {
    setSaving(id)
    try {
      const response = await fetch('/api/management/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible actualizar la tarea.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la tarea.') }
    finally { setSaving(null) }
  }

  async function addComment(id: string) {
    const comment = (comments[id] ?? '').trim(); if (!comment) return
    setSaving(id)
    try {
      const response = await fetch('/api/management/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comment', taskId: id, comment }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible guardar el comentario.')
      setComments((current) => ({ ...current, [id]: '' })); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar el comentario.') }
    finally { setSaving(null) }
  }

  const visible = tasks.filter((task) => filter === 'all' ? true : filter === 'done' ? task.status === 'done' || task.status === 'dismissed' : task.status === 'open' || task.status === 'in_progress')

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Dirección · Seguimiento" title="Gestión de tareas" description="Responsable, prioridad, vencimiento, comentarios e historial auditado." actions={[{ label: 'Volver al dashboard', href: '/dashboard/director', primary: true }, { label: 'Reporte', href: '/dashboard/director/reporte' }]}/>
    <section><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="01 · Bandeja" title="Tareas de la oficina" description="Filtra y actualiza el seguimiento sin salir de esta vista."/><div className="flex gap-2 pb-5">{(['active','all','done'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${filter === value ? 'border-[#d7332b]' : 'border-[var(--n3-line)]'}`}>{value === 'active' ? 'Activas' : value === 'done' ? 'Cerradas' : 'Todas'}</button>)}</div></div></section>
    {loading ? <div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando tareas…</div> : null}
    {error ? <div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={14}/>Reintentar</button></div> : null}
    <div className="space-y-4">{visible.map((task) => <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex flex-col gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{task.title}</h2><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{task.priority}</span><span className="border border-[var(--n3-line)] px-2 py-1 text-[10px] uppercase">{task.status}</span></div><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Caso: {task.subjectProfile?.full_name ?? 'general de oficina'}</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs text-[var(--n3-text-muted)]">Responsable<select value={task.assigned_to ?? ''} onChange={(event) => void update(task.id, { assignedTo: event.target.value || null })} className="mt-1 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm text-white"><option value="">Sin responsable</option>{assignees.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.id}</option>)}</select></label><label className="text-xs text-[var(--n3-text-muted)]">Prioridad<select value={task.priority} onChange={(event) => void update(task.id, { priority: event.target.value })} className="mt-1 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm text-white"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label><label className="text-xs text-[var(--n3-text-muted)]">Estado<select value={task.status} onChange={(event) => void update(task.id, { status: event.target.value })} className="mt-1 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm text-white"><option value="open">Abierta</option><option value="in_progress">En progreso</option><option value="done">Completada</option><option value="dismissed">Descartada</option></select></label><label className="text-xs text-[var(--n3-text-muted)]">Vencimiento<input type="date" value={task.due_date ?? ''} onChange={(event) => void update(task.id, { dueDate: event.target.value })} className="mt-1 w-full border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm text-white"/></label></div><div><label htmlFor={`comment-${task.id}`} className="text-xs text-[var(--n3-text-muted)]">Comentario</label><div className="mt-1 flex gap-2"><input id={`comment-${task.id}`} value={comments[task.id] ?? ''} onChange={(event) => setComments((current) => ({ ...current, [task.id]: event.target.value }))} className="min-w-0 flex-1 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-sm"/><button disabled={saving === task.id} onClick={() => void addComment(task.id)} className="border border-[var(--n3-line)] px-3 py-2"><MessageSquare size={15}/><span className="sr-only">Guardar comentario</span></button></div></div>{task.comments?.length ? <div className="space-y-2"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><MessageSquare size={14}/>Comentarios</p>{task.comments.map((comment) => <div key={comment.id} className="border-l border-[var(--n3-line)] pl-3 text-sm"><p>{comment.body}</p><p className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{comment.authorProfile?.full_name ?? 'Usuario'} · {new Date(comment.created_at).toLocaleString('es-CL')}</p></div>)}</div> : null}{task.events?.length ? <details><summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><History size={14}/>Historial ({task.events.length})</summary><div className="mt-3 space-y-2">{task.events.map((event) => <p key={event.id} className="text-xs text-[var(--n3-text-muted)]">{new Date(event.created_at).toLocaleString('es-CL')} · {event.actorProfile?.full_name ?? 'Sistema'} · {event.event_type}</p>)}</div></details> : null}</div></article>)}{!loading && !visible.length ? <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No hay tareas para este filtro.</div> : null}</div>
    <div className="print-hidden"><Link href="/dashboard/director" className="text-xs text-[var(--n3-text-muted)]">Volver al dashboard</Link></div>
  </IntelligencePage>
}
