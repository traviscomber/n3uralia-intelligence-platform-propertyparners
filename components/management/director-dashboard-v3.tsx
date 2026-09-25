'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardPlus, RefreshCw, ShieldCheck, UserRound } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric = { code: string; label: string; unit: 'count'|'uf'|'percent'|'days'|'score'; value: number|null; target: number|null; compliance: number|null; mom: number|null; yoy?: number|null; comparisonPeriod?: string|null }
type Entity = { id:string; name:string; entityType:string; classification?:string|null; metrics:Metric[]; evolution?:Array<{period:string;sales:number|null;salesTarget:number|null}> }
type Alert = { id:string; severity:'info'|'warning'|'critical'; title:string; detail:string; entityName:string }
type Task = { id:string; source_key:string|null; title:string; detail:string|null; severity:string; status:string; priority?:string|null; due_date:string|null; created_at:string }
type Payload = { scopeLabel:string; entities:Entity[]; alerts:Alert[]; operational?:{valuationInReview:number;valuationDrafts:number;activePropertyAssignments:number}|null; accesses?:Array<{label:string;href:string;permission:'read'|'manage';detail:string}>; periodLabel:string; generatedAt?:string; dataProvenance?:string }

const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')
const metric = (entity:Entity|undefined, code:string) => entity?.metrics.find((item)=>item.code===code)
const format = (item?:Metric) => !item || item.value===null ? 'n/d' : item.unit==='uf' ? `${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF` : item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const tone = (value:number|null|undefined) => value==null ? 'text-[var(--n3-text-muted)]' : value>=100 ? 'text-[#65c780]' : value>=90 ? 'text-[#f6c453]' : 'text-[#ff766f]'
const variation = (value:number|null|undefined) => value==null ? 'n/d' : `${value>0?'+':''}${value.toLocaleString('es-CL',{maximumFractionDigits:1})}%`
const isOverdue = (task:Task) => Boolean(task.due_date && new Date(`${task.due_date}T23:59:59`) < new Date())

export function DirectorDashboardV3() {
  const [payload,setPayload]=useState<Payload|null>(null)
  const [tasks,setTasks]=useState<Task[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [sort,setSort]=useState<'management'|'sales'|'gap'>('management')
  const [working,setWorking]=useState<string|null>(null)

  async function load(){
    setLoading(true);setError(null)
    try{
      const [summaryResponse,tasksResponse]=await Promise.all([fetch('/api/management/summary',{cache:'no-store'}),fetch('/api/management/tasks',{cache:'no-store'})])
      const summary=await summaryResponse.json();const taskData=await tasksResponse.json()
      if(!summaryResponse.ok) throw new Error(summary.error||'No fue posible cargar la vista de dirección.')
      if(!tasksResponse.ok) throw new Error(taskData.error||'No fue posible cargar las tareas de dirección.')
      setPayload(summary);setTasks(taskData.tasks??[])
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar la vista de dirección.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  async function createTask(alert:Alert){
    setWorking(alert.id)
    try{
      const due=new Date();due.setDate(due.getDate()+7)
      const response=await fetch('/api/management/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceKey:alert.id,title:`${alert.entityName} · ${alert.title}`,detail:alert.detail,severity:alert.severity,entityName:alert.entityName,dueDate:due.toISOString().slice(0,10),priority:alert.severity==='critical'?'high':'medium'})})
      const data=await response.json();if(!response.ok) throw new Error(data.error||'No fue posible crear la tarea.')
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible crear la tarea.')}finally{setWorking(null)}
  }
  async function updateTask(id:string,status:string){
    setWorking(id)
    try{const response=await fetch('/api/management/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});const data=await response.json();if(!response.ok)throw new Error(data.error||'No fue posible actualizar la tarea.');await load()}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible actualizar la tarea.')}finally{setWorking(null)}
  }

  const branch=payload?.entities.find((entity)=>entity.entityType==='branch')
  const partners=useMemo(()=>{
    const rows=payload?.entities.filter((entity)=>entity.entityType==='partner')??[]
    return [...rows].sort((a,b)=>sort==='sales'?Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1):sort==='gap'?Number(metric(a,'management_score')?.value??999)-Number(metric(b,'management_score')?.value??999):Number(metric(b,'management_score')?.value??-1)-Number(metric(a,'management_score')?.value??-1))
  },[payload,sort])
  const headline=['sales','sales_uf','cumulative_sales','cumulative_sales_uf'].map((code)=>metric(branch,code)).filter(Boolean) as Metric[]
  const salesMetric=metric(branch,'sales')
  const captationsMetric=metric(branch,'listings')
  const productivityMetric=metric(branch,'productivity')
  const derivedProductivity=productivityMetric?.value ?? (
    salesMetric?.value != null && partners.length > 0 ? salesMetric.value / partners.length : null
  )
  const salesRanking=useMemo(()=>{
    const ranked=[...partners]
      .map((entity)=>({entity,value:metric(entity,'sales')?.value??null}))
      .filter((item): item is {entity:Entity;value:number}=>item.value!=null)
      .sort((a,b)=>b.value-a.value)
    const rankByValue=new Map([...new Set(ranked.map((item)=>item.value))].map((value,index)=>[value,index+1]))
    return new Map(ranked.map((item)=>[item.entity.id,rankByValue.get(item.value)??null]))
  },[partners])
  const openTasks=tasks.filter((task)=>['open','in_progress'].includes(task.status))
  const overdueTasks=openTasks.filter(isOverdue)
  const period=payload?.periodLabel??'Sin período'
  const valuationInReview=payload?.operational?.valuationInReview??0
  const valuationDrafts=payload?.operational?.valuationDrafts??0
  const activePropertyAssignments=payload?.operational?.activePropertyAssignments??0
  const headerActions=[
    {label:'Asignar propiedades',href:'/dashboard/properties/admin',primary:true},
    ...(valuationInReview>0?[{label:'Revisar valorizaciones',href:'/dashboard/valuations'}]:[]),
  ]

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Dirección · Gestión comercial" title={`Oficina ${payload?.scopeLabel??''}`} description={`Metas, evolución, equipo, tareas y decisiones. Corte: ${period}.`} actions={headerActions} meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><BarChart3 size={15}/>{period}</div>}/>
    {loading?<div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando indicadores, alertas y tareas…</div>:null}
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><RefreshCw size={14}/>Reintentar</button></div>:null}
    {!loading&&payload? <>
      <section><SectionHeading eyebrow="01 · Pulso de la oficina" title="Resultado contra meta" description={`Indicadores del corte ${period}, con objetivo y cumplimiento disponible.`}/><MetricGrid columns={4}>{headline.map((item)=><MetricCard key={item.code} label={item.label} value={format(item)} detail={`${item.target==null?'Meta n/d':`Meta ${item.target.toLocaleString('es-CL')}`} · ${item.compliance==null?'Cumpl. n/d':`${item.compliance.toFixed(1)}%`}`}/>)}</MetricGrid></section>
      <section>
        <SectionHeading eyebrow="Contrato · lectura obligatoria" title="MoM, YoY y cobertura KPI" description="Se muestran sólo métricas soportadas por fuente canónica. Lo no aprobado queda explícitamente pendiente; no se infiere."/>
        <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-5">
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">MoM · cierres</p><strong className="mt-2 block text-2xl">{variation(salesMetric?.mom)}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Mismo indicador vs mes anterior comparable.</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">YoY · cierres</p><strong className="mt-2 block text-2xl">{variation(salesMetric?.yoy)}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{salesMetric?.comparisonPeriod ? "Base: "+salesMetric.comparisonPeriod : "Sin período comparable aprobado."}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Captaciones</p><strong className="mt-2 block text-2xl">{captationsMetric?.value==null?"Sin dato":captationsMetric.value.toLocaleString("es-CL")}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{captationsMetric?"Fuente aprobada del período.":"No se reemplaza por stock ni variación neta."}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Productividad</p><strong className="mt-2 block text-2xl">{derivedProductivity==null?"Sin dato":derivedProductivity.toLocaleString("es-CL",{maximumFractionDigits:2})}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{productivityMetric?.value!=null?"Métrica canónica persistida.":"Cierres del período / ejecutivas visibles en el mismo alcance."}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[var(--n3-text-muted)]">Ranking de cierres</p><strong className="mt-2 block text-2xl">{salesRanking.size||"Sin dato"}</strong><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Orden por cierres canónicos. Los empates comparten posición; no se inventa desempate.</p></article>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {valuationInReview>0?<Link href="/dashboard/valuations?status=review" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><MetricCard label="En revisión" value={String(valuationInReview)} detail="Valorizaciones que requieren decisión"/></Link>:null}
        {valuationDrafts>0?<Link href="/dashboard/valuations?status=draft" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><MetricCard label="Borradores" value={String(valuationDrafts)} detail="Casos aún no enviados"/></Link>:null}
        <Link href="/dashboard/properties/admin?status=active" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><MetricCard label="Propiedades activas" value={String(activePropertyAssignments)} detail="Asignaciones visibles por RLS"/></Link>
        {openTasks.length>0?<Link href="/dashboard/director/tareas" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><MetricCard label="Tareas abiertas" value={String(openTasks.length)} detail={overdueTasks.length>0?`${overdueTasks.length} vencidas`:'Seguimiento activo'}/></Link>:null}
      </section>
      <section><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><SectionHeading eyebrow="02 · Equipo" title="Desempeño y brechas por ejecutiva" description="Cada fila abre una ficha con evolución, metas y tareas."/><div className="flex flex-wrap gap-2 pb-5">{([['management','Gestión'],['sales','Cierres'],['gap','Mayor brecha']] as const).map(([value,label])=><button key={value} onClick={()=>setSort(value)} aria-pressed={sort===value} className={`border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f] ${sort===value?'border-[#d7332b] text-white':'border-[var(--n3-line)] text-[var(--n3-text-muted)]'}`}>{label}</button>)}</div></div>
        <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[1400px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Ejecutiva</th><th className="px-4 py-3 text-left">Clasificación</th><th className="px-4 py-3 text-right">Cierres/meta</th><th className="px-4 py-3 text-right">UF/meta</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Cartera</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th><th className="px-4 py-3 text-right">Stock/meta</th><th className="px-4 py-3 text-right">Rank cierres</th><th className="px-4 py-3 text-right">MoM</th><th className="px-4 py-3 text-right">YoY</th><th className="px-4 py-3"></th></tr></thead><tbody>{partners.map((entity)=>{const sales=metric(entity,'sales'),salesUf=metric(entity,'sales_uf'),stock=metric(entity,'stock');return <tr key={entity.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]"><td className="px-4 py-4 font-semibold">{entity.name}</td><td className="px-4 py-4 text-[var(--n3-text-muted)]">{entity.classification??'Sin clasificación'}</td><td className={`px-4 py-4 text-right ${tone(sales?.compliance)}`}>{sales?.value??'n/d'} / {sales?.target??'n/d'}</td><td className={`px-4 py-4 text-right ${tone(salesUf?.compliance)}`}>{salesUf?.value?.toLocaleString('es-CL')??'n/d'} / {salesUf?.target?.toLocaleString('es-CL')??'n/d'}</td>{['management_score','portfolio_score','follow_up_score','conversion'].map((code)=><td key={code} className="px-4 py-4 text-right">{metric(entity,code)?.value?.toFixed(1)??'n/d'}</td>)}<td className={`px-4 py-4 text-right ${tone(stock?.compliance)}`}>{stock?.value??'n/d'} / {stock?.target??'n/d'}</td><td className="px-4 py-4 text-right">{salesRanking.get(entity.id)??'n/d'}</td><td className="px-4 py-4 text-right">{variation(sales?.mom)}</td><td className="px-4 py-4 text-right">{variation(sales?.yoy)}</td><td className="px-4 py-4 text-right"><Link href={`/dashboard/director/equipo/${normalize(entity.name)}`} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><UserRound size={14}/>Ver ficha</Link></td></tr>})}</tbody></table></div>
      </section>
      {payload.alerts.length||openTasks.length?<section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        {payload.alerts.length?<div><SectionHeading eyebrow="03 · Alertas" title="Convertir brechas en trabajo" description="Crear una tarea persistente asignada a la ejecutiva, con vencimiento inicial de siete días."/><div className="space-y-3">{payload.alerts.slice(0,16).map((alert)=>{const exists=openTasks.some((task)=>task.source_key===alert.id);return <article key={alert.id} className={`border bg-[#0c1111] p-4 ${alert.severity==='critical'?'border-[#d7332b]':'border-[#a77a22]'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><AlertTriangle size={18} className={alert.severity==='critical'?'text-[#ff766f]':'text-[#f6c453]'}/><div className="min-w-0 flex-1"><p className="font-semibold">{alert.entityName} · {alert.title}</p><p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">{alert.detail}</p></div>{exists?<span className="inline-flex items-center gap-1 text-xs text-[#65c780]"><CheckCircle2 size={14}/>Tarea abierta</span>:<button disabled={working===alert.id} onClick={()=>void createTask(alert)} className="inline-flex items-center justify-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]"><ClipboardPlus size={14}/>Crear tarea</button>}</div></article>})}</div></div>:null}
        {openTasks.length?<div><SectionHeading eyebrow="04 · Tareas" title="Seguimiento activo" description="Cambiar estado sin perder trazabilidad."/><div className="space-y-3">{openTasks.map((task)=><article key={task.id} className={`border bg-[#0c1111] p-4 ${isOverdue(task)?'border-[#d7332b]':'border-[var(--n3-line)]'}`}><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{task.status} · {task.priority??'medium'} · vence {task.due_date??'sin fecha'}{isOverdue(task)?' · VENCIDA':''}</p>{task.detail?<p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p>:null}<div className="mt-3 flex flex-wrap gap-2">{task.status==='open'?<button disabled={working===task.id} onClick={()=>void updateTask(task.id,'in_progress')} className="border border-[var(--n3-line)] px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]">Iniciar</button>:null}<button disabled={working===task.id} onClick={()=>void updateTask(task.id,'done')} className="border border-[#2f8f4e] px-3 py-2 text-xs text-[#65c780] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65c780]">Completar</button><button disabled={working===task.id} onClick={()=>void updateTask(task.id,'dismissed')} className="border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff766f]">Descartar</button></div></article>)}</div></div>:null}
      </section>:null}
      <section><SectionHeading eyebrow="05 · Acciones" title="Operación habilitada"/><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Link href="/dashboard/director/tareas" className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b]"><div className="flex h-9 w-9 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]"><ShieldCheck size={17}/></div><div className="min-w-0 flex-1"><p className="font-semibold">Gestionar tareas</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Responsables, prioridades, vencimientos y comentarios.</p></div><ArrowRight size={15}/></Link><Link href="/dashboard/director/reporte" className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b]"><div className="flex h-9 w-9 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]"><ShieldCheck size={17}/></div><div className="min-w-0 flex-1"><p className="font-semibold">Reporte directivo</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Vista imprimible del corte y seguimiento.</p></div><ArrowRight size={15}/></Link>{payload.accesses?.map((access)=><Link key={access.href} href={access.href} className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b]"><div className="flex h-9 w-9 items-center justify-center border border-[var(--n3-line)] text-[#ff766f]"><ShieldCheck size={17}/></div><div className="min-w-0 flex-1"><p className="font-semibold">{access.label}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{access.detail}</p></div><ArrowRight size={15}/></Link>)}</div></section>
      <MethodologyNote>{payload.dataProvenance} Generado {payload.generatedAt?new Date(payload.generatedAt).toLocaleString('es-CL'):'sin fecha disponible'}. Las alertas derivadas no se convierten en tareas hasta que dirección lo decide.</MethodologyNote>
    </>:null}
  </IntelligencePage>
}
