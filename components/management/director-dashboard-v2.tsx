'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric = { code: string; label: string; unit: 'count' | 'uf' | 'percent' | 'days' | 'score'; value: number | null; target: number | null; compliance: number | null; mom: number | null }
type EvolutionPoint = { period: string; sales: number | null; salesTarget: number | null }
type Entity = { id: string; name: string; entityType: string; classification?: string | null; metrics: Metric[]; evolution?: EvolutionPoint[] }
type Alert = { id: string; severity: 'info' | 'warning' | 'critical'; title: string; detail: string; entityName: string }
type Task = { id: string; source_key: string | null; title: string; detail: string | null; severity: string; status: string; due_date: string | null; subject_profile_id: string | null }
type Payload = {
  scopeLabel: string
  entities: Entity[]
  alerts: Alert[]
  operational?: { valuationDrafts: number; valuationInReview: number; activePropertyAssignments: number } | null
  accesses?: Array<{ label: string; href: string; permission: 'read' | 'manage'; detail: string }>
  periodLabel: string
  generatedAt?: string
  dataProvenance?: string
}

const months: Record<string, string> = { '2026-01': 'Ene', '2026-02': 'Feb', '2026-03': 'Mar', '2026-04': 'Abr', '2026-05': 'May', '2026-06': 'Jun' }
const metric = (entity: Entity | undefined, code: string) => entity?.metrics.find((item) => item.code === code)
const format = (item: Metric | undefined) => !item || item.value === null ? 'n/d' : item.unit === 'uf' ? `${item.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF` : item.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })
const complianceLabel = (item: Metric | undefined) => item?.compliance == null ? '' : `${item.compliance.toFixed(0)}%`
const complianceTone = (value: number | null | undefined) => value == null ? 'text-[var(--n3-text-muted)]' : value >= 100 ? 'text-[#65c780]' : value >= 90 ? 'text-[#f6c453]' : 'text-[#ff766f]'
const slug = (name: string) => encodeURIComponent(name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))

function ScoreBadge({ value }: { value: number | null }) {
  const tone = value === null ? 'border-[var(--n3-line)] text-[var(--n3-text-muted)]' : value >= 70 ? 'border-[#2f8f4e] text-[#65c780]' : value >= 50 ? 'border-[#a77a22] text-[#f6c453]' : 'border-[#d7332b] text-[#ff766f]'
  return <span className={`inline-flex min-w-12 justify-center border px-2 py-1 text-xs font-semibold tabular-nums ${tone}`}>{value === null ? 'n/d' : value.toFixed(1)}</span>
}

function EvolutionChart({ points }: { points: EvolutionPoint[] }) {
  const max = Math.max(1, ...points.flatMap((point) => [point.sales ?? 0, point.salesTarget ?? 0]))
  return <div className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
    <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Evolución mensual</p><h3 className="mt-1 text-lg font-semibold">Cierres reales vs meta</h3></div>
    {points.length ? <div className="grid grid-cols-6 gap-3">{points.map((point) => <div key={point.period} className="min-w-0">
      <div className="flex h-44 items-end justify-center gap-1 border-b border-[var(--n3-line)] px-1">
        <div className="w-3 bg-[#d7332b]" style={{ height: `${Math.max(3, ((point.sales ?? 0) / max) * 100)}%` }} title={`Real ${point.sales ?? 'n/d'}`} />
        <div className="w-3 border border-[var(--n3-line)] bg-white/10" style={{ height: `${Math.max(3, ((point.salesTarget ?? 0) / max) * 100)}%` }} title={`Meta ${point.salesTarget ?? 'n/d'}`} />
      </div><p className="mt-2 text-center text-xs text-[var(--n3-text-muted)]">{months[point.period] ?? point.period}</p>
    </div>)}</div> : <p className="text-sm text-[var(--n3-text-muted)]">No existe evolución mensual para esta oficina.</p>}
  </div>
}

export function DirectorDashboardV2() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [sort, setSort] = useState<'management' | 'sales' | 'gap'>('management')

  async function load() {
    setLoading(true); setError(null)
    try {
      const [summaryResponse, taskResponse] = await Promise.all([fetch('/api/management/summary', { cache: 'no-store' }), fetch('/api/management/tasks', { cache: 'no-store' })])
      const summary = await summaryResponse.json()
      const taskData = await taskResponse.json()
      if (!summaryResponse.ok) throw new Error(summary.error || 'No fue posible cargar la vista de dirección.')
      setPayload(summary)
      setTasks(taskResponse.ok ? taskData.tasks ?? [] : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar la vista de dirección.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function createTask(alert: Alert) {
    setBusy(alert.id)
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const response = await fetch('/api/management/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceKey: alert.id, title: alert.title, detail: alert.detail, severity: alert.severity, entityName: alert.entityName, dueDate }) })
    const data = await response.json()
    if (!response.ok && response.status !== 409) setError(data.error || 'No fue posible crear la tarea.')
    await load(); setBusy(null)
  }

  async function updateTask(id: string, status: string) {
    setBusy(id)
    const response = await fetch('/api/management/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'No fue posible actualizar la tarea.')
    await load(); setBusy(null)
  }

  const branch = payload?.entities.find((entity) => entity.entityType === 'branch')
  const partners = useMemo(() => {
    const rows = payload?.entities.filter((entity) => entity.entityType === 'partner') ?? []
    return [...rows].sort((a, b) => sort === 'sales' ? Number(metric(b, 'sales')?.value ?? -1) - Number(metric(a, 'sales')?.value ?? -1) : sort === 'gap' ? Number(metric(a, 'management_score')?.value ?? 999) - Number(metric(b, 'management_score')?.value ?? 999) : Number(metric(b, 'management_score')?.value ?? -1) - Number(metric(a, 'management_score')?.value ?? -1))
  }, [payload, sort])
  const headline = ['sales', 'sales_uf', 'cumulative_sales', 'cumulative_sales_uf'].map((code) => metric(branch, code)).filter(Boolean) as Metric[]
  const openTasks = tasks.filter((task) => ['open', 'in_progress'].includes(task.status))

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Dirección · Gestión comercial" title={`Oficina ${payload?.scopeLabel ?? ''}`} description="Metas, evolución, equipo, tareas y decisiones dentro del alcance autorizado." actions={[{ label: 'Asignar propiedades', href: '/dashboard/properties/admin', primary: true }, { label: 'Revisar valorizaciones', href: '/dashboard/valuations' }]} meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><BarChart3 size={15} />{payload?.periodLabel ?? 'Sin período'}</div>} />
    {loading ? <div className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando indicadores, equipo y tareas…</div> : null}
    {error ? <div className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={() => void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2"><RefreshCw size={14} />Reintentar</button></div> : null}
    {!loading && payload ? <>
      <section><SectionHeading eyebrow="01 · Pulso de la oficina" title="Resultado contra meta" description="Junio y acumulado enero–junio con cumplimiento y variación mensual cuando existe base comparable." /><MetricGrid columns={4}>{headline.map((item) => <MetricCard key={item.code} label={item.label} value={format(item)} detail={`${item.target == null ? 'Meta n/d' : `Meta ${item.target.toLocaleString('es-CL')}`} · ${item.compliance == null ? 'Cumpl. n/d' : `${item.compliance.toFixed(1)}%`}${item.mom == null ? '' : ` · MoM ${item.mom > 0 ? '+' : ''}${item.mom.toFixed(1)}%`}`} />)}</MetricGrid></section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><EvolutionChart points={branch?.evolution ?? []} /><div className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Estado operativo</p><div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/dashboard/valuations?status=review" className="border border-[var(--n3-line)] p-4 hover:bg-white/[0.03]"><p className="text-2xl font-semibold">{payload.operational?.valuationInReview ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">En revisión</p></Link>
        <Link href="/dashboard/properties/admin?status=active" className="border border-[var(--n3-line)] p-4 hover:bg-white/[0.03]"><p className="text-2xl font-semibold">{payload.operational?.activePropertyAssignments ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Asignaciones activas</p></Link>
        <Link href="/dashboard/valuations?status=draft" className="border border-[var(--n3-line)] p-4 hover:bg-white/[0.03]"><p className="text-2xl font-semibold">{payload.operational?.valuationDrafts ?? 0}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Borradores</p></Link>
        <div className="border border-[var(--n3-line)] p-4"><p className="text-2xl font-semibold">{openTasks.length}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Tareas activas</p></div>
      </div></div></section>
      <section><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><SectionHeading eyebrow="02 · Equipo" title="Desempeño y brechas por ejecutiva" description="Ordena y abre la ficha individual para intervenir con contexto." /><div className="flex gap-2 pb-5">{([['management','Gestión'],['sales','Cierres'],['gap','Mayor brecha']] as const).map(([value,label]) => <button key={value} onClick={() => setSort(value)} className={`border px-3 py-2 text-xs ${sort === value ? 'border-[#d7332b] text-white' : 'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{label}</button>)}</div></div>
        <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[1240px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Ejecutiva</th><th className="px-4 py-3 text-left">Clasificación</th><th className="px-4 py-3 text-right">Cierres / meta</th><th className="px-4 py-3 text-right">UF / meta</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Cartera</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th><th className="px-4 py-3 text-right">Stock / meta</th><th className="px-4 py-3 text-right">Ficha</th></tr></thead><tbody>{partners.map((entity) => { const sales=metric(entity,'sales'); const salesUf=metric(entity,'sales_uf'); const stock=metric(entity,'stock'); return <tr key={entity.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]"><td className="px-4 py-4 font-semibold">{entity.name}</td><td className="px-4 py-4 text-[var(--n3-text-muted)]">{entity.classification ?? 'Sin clasificación'}</td><td className={`px-4 py-4 text-right ${complianceTone(sales?.compliance)}`}>{sales?.value ?? 'n/d'} / {sales?.target ?? 'n/d'}<div className="text-[10px]">{complianceLabel(sales)}</div></td><td className={`px-4 py-4 text-right ${complianceTone(salesUf?.compliance)}`}>{salesUf?.value?.toLocaleString('es-CL') ?? 'n/d'} / {salesUf?.target?.toLocaleString('es-CL') ?? 'n/d'}<div className="text-[10px]">{complianceLabel(salesUf)}</div></td>{['management_score','portfolio_score','follow_up_score','conversion'].map((code) => <td key={code} className="px-4 py-4 text-right"><ScoreBadge value={metric(entity,code)?.value ?? null} /></td>)}<td className={`px-4 py-4 text-right ${complianceTone(stock?.compliance)}`}>{stock?.value ?? 'n/d'} / {stock?.target ?? 'n/d'}<div className="text-[10px]">{complianceLabel(stock)}</div></td><td className="px-4 py-4 text-right"><Link className="border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]" href={`/dashboard/director/equipo/${slug(entity.name)}`}>Ver ficha</Link></td></tr> })}</tbody></table></div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><div><SectionHeading eyebrow="03 · Prioridades" title="Brechas convertibles en tareas" description="Cada alerta puede convertirse una sola vez en tarea operativa con vencimiento inicial de siete días." /><div className="space-y-3">{payload.alerts.slice(0,16).map((alert) => { const linked=tasks.find((task) => task.source_key===alert.id && ['open','in_progress'].includes(task.status)); return <article key={alert.id} className={`border bg-[#0c1111] p-4 ${alert.severity==='critical'?'border-[#d7332b]':'border-[#a77a22]'}`}><div className="flex gap-3"><AlertTriangle size={18} className={alert.severity==='critical'?'text-[#ff766f]':'text-[#f6c453]'} /><div className="flex-1"><p className="font-semibold">{alert.entityName} · {alert.title}</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">{alert.detail}</p><button disabled={Boolean(linked)||busy===alert.id} onClick={() => void createTask(alert)} className="mt-3 border border-[var(--n3-line)] px-3 py-2 text-xs disabled:opacity-50">{linked ? 'Tarea activa' : busy===alert.id ? 'Creando…' : 'Crear tarea'}</button></div></div></article>})}</div></div>
        <div><SectionHeading eyebrow="04 · Seguimiento" title="Tareas activas" description="La dirección puede iniciar o completar el seguimiento sin salir del dashboard." /><div className="space-y-3">{openTasks.length ? openTasks.map((task) => <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.status} · vence {task.due_date ?? 'sin fecha'}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p><div className="mt-3 flex gap-2">{task.status==='open' ? <button disabled={busy===task.id} onClick={() => void updateTask(task.id,'in_progress')} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Iniciar</button> : null}<button disabled={busy===task.id} onClick={() => void updateTask(task.id,'done')} className="border border-[#2f8f4e] px-3 py-2 text-xs text-[#65c780]">Completar</button></div></article>) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No hay tareas activas.</div>}</div></div>
      </section>
      <section><SectionHeading eyebrow="05 · Acciones" title="Operación habilitada" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{payload.accesses?.map((access) => <Link key={access.href} href={access.href} className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:bg-white/[0.03]"><div className="flex h-9 w-9 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]">{access.permission==='manage'?<ShieldCheck size={17}/>:<ClipboardCheck size={17}/>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{access.label}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{access.detail}</p></div><ArrowRight size={15}/></Link>)}</div></section>
      <section><SectionHeading eyebrow="06 · Trazabilidad" title="Fuente, corte y alcance" /><MethodologyNote>{payload.dataProvenance} Generado {payload.generatedAt ? new Date(payload.generatedAt).toLocaleString('es-CL') : 'sin fecha disponible'}. La cuenta QA usa una identidad canónica de Lo Beltrán y no confirma el cargo real de esa persona.</MethodologyNote></section>
    </> : null}
  </IntelligencePage>
}
