'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Operations={valuations:{review:number;draft:number};assignments:{paused:number;active:number};market:{pendingIdentity:number;confirmed:number};tasks:{open:number;overdue:number;urgent:number}}
type Profile={id:string;full_name:string|null;team:string|null;role:string|null}
type Task={id:string;source_key:string|null;title:string;detail:string|null;status:string;priority:string;due_date:string|null;office:string|null;resolution_note:string|null;completed_at:string|null;started_at:string|null;assignedProfile?:Profile|null}
type Decision={id:string;action:string;reason:string|null;created_at:string}
type QueueItem={id:string;address:string|null;status:string;versionNumber:number|null;updatedAt:string;office:string|null;owner:Profile|null;latestDecision:Decision|null;tasks:Task[]}

const taskStatusLabel:Record<string,string>={open:'Abierta',in_progress:'En seguimiento',done:'Cerrada',dismissed:'Descartada'}

function formatDate(value:string|null){
  if(!value)return 'sin fecha'
  return new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(value))
}

function valuationIdFromSourceKey(sourceKey:string|null){
  const match=String(sourceKey??'').match(/^valuation:([^:]+):/)
  return match?.[1]??null
}

export function CeoDecisions(){
  const [operations,setOperations]=useState<Operations|null>(null)
  const [queue,setQueue]=useState<QueueItem[]>([])
  const [tasks,setTasks]=useState<Task[]>([])
  const [error,setError]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [updatingTaskId,setUpdatingTaskId]=useState<string|null>(null)
  const [resultDrafts,setResultDrafts]=useState<Record<string,string>>({})

  async function load(){
    setLoading(true);setError(null)
    try{
      const [operationsResponse,queueResponse,tasksResponse]=await Promise.all([
        fetch('/api/management/ceo-operations',{cache:'no-store'}),
        fetch('/api/management/ceo-decisions',{cache:'no-store'}),
        fetch('/api/management/tasks',{cache:'no-store'}),
      ])
      const [operationsData,queueData,tasksData]=await Promise.all([operationsResponse.json(),queueResponse.json(),tasksResponse.json()])
      if(!operationsResponse.ok||!queueResponse.ok||!tasksResponse.ok) throw new Error(operationsData.error||queueData.error||tasksData.error||'No fue posible cargar las decisiones.')
      setOperations(operationsData);setQueue(queueData.queue??[]);setTasks(tasksData.tasks??[])
    }catch(cause){setError(cause instanceof Error?cause.message:'Error de carga')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  async function updateTask(task:Task,status:'in_progress'|'done'){
    setError(null)
    const resolutionNote=(resultDrafts[task.id]??task.resolution_note??'').trim()
    if(status==='done'&&!resolutionNote){
      setError('Registra el resultado antes de cerrar la decisión.')
      return
    }
    setUpdatingTaskId(task.id)
    try{
      const response=await fetch('/api/management/tasks',{
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:task.id,status,...(status==='done'?{resolutionNote}:{})}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'No fue posible actualizar la decisión.')
      setResultDrafts((current)=>{const next={...current};delete next[task.id];return next})
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible actualizar la decisión.')}finally{setUpdatingTaskId(null)}
  }

  const today=new Date().toISOString().slice(0,10)
  const pending=useMemo(()=>tasks.filter((task)=>['open','in_progress'].includes(task.status)).sort((a,b)=>(a.due_date??'9999-12-31').localeCompare(b.due_date??'9999-12-31')),[tasks])
  const closed=useMemo(()=>tasks.filter((task)=>task.status==='done'&&task.resolution_note).sort((a,b)=>(b.completed_at??'').localeCompare(a.completed_at??'')).slice(0,12),[tasks])
  const offices=useMemo(()=>Array.from(new Set(queue.map((item)=>item.office).filter(Boolean))) as string[],[queue])

  return <IntelligencePage>
    <Link href="/dashboard/ceo" className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={14}/>Volver al CEO</Link>
    <IntelligenceHeader eyebrow="CEO · Centro de decisiones" title="Pendientes conectados con su evidencia" description="Cada decisión mantiene contexto, responsable, seguimiento y resultado verificable dentro del flujo operativo existente." actions={[{label:'Valorizaciones',href:'/dashboard/valuations',primary:true},{label:'Propiedades',href:'/dashboard/properties/admin'}]}/>
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14}/>Reintentar</button></div>:null}
    {loading?<div role="status" aria-live="polite" className="border border-[var(--n3-line)] p-8 text-[var(--n3-text-muted)]">Cargando decisiones…</div>:null}
    {operations&&!loading?<>
      <section><SectionHeading eyebrow="01 · Carga crítica" title="Decisiones abiertas"/><MetricGrid columns={4}><MetricCard label="Valorizaciones en revisión" value={operations.valuations.review} detail={`${operations.valuations.draft} borradores`}/><MetricCard label="Tareas vencidas" value={operations.tasks.overdue} detail={`${operations.tasks.urgent} urgentes`}/><MetricCard label="Asignaciones pausadas" value={operations.assignments.paused} detail={`${operations.assignments.active} activas`}/><MetricCard label="Oficinas con casos" value={offices.length} detail="Con pendientes trazables"/></MetricGrid></section>

      <section><SectionHeading eyebrow="02 · Valorizaciones y decisiones" title="De la oficina al expediente" description="La cola conecta cada caso con su responsable, última decisión, tareas derivadas y reporte imprimible."/>
        <div className="space-y-3">{queue.length?queue.map((item)=>{
          const task=item.tasks[0]??null
          return <article key={item.id} className={`border bg-[#0c1111] p-4 ${item.status==='review'?'border-[#a77a22]':'border-[var(--n3-line)]'}`}>
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
              <div><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{item.office??'Sin oficina'} · v{item.versionNumber??1} · {item.status}</p><p className="mt-1 font-semibold">{item.address??'Propiedad sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Ejecutiva: {item.owner?.full_name??'Sin responsable identificado'}</p></div>
              <div className="text-xs leading-5 text-[var(--n3-text-muted)]"><p>Última decisión: {item.latestDecision?.action?.replaceAll('_',' ')??'Sin decisión registrada'}</p><p>{item.latestDecision?.reason??'Sin observación adicional'}</p>{task?<p className="mt-1">Tarea: {taskStatusLabel[task.status]??task.status} · {task.assignedProfile?.full_name??'sin responsable'} · vence {task.due_date??'sin fecha'}</p>:<p className="mt-1">Sin tarea abierta vinculada</p>}</div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/ceo/oficina/${encodeURIComponent((item.office??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}`} className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver oficina</Link>
                <Link href={`/dashboard/valuations/${item.id}`} className="inline-flex min-h-11 items-center gap-2 border border-[#d7332b] px-3 py-2 text-xs text-[#ff766f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Abrir caso<ArrowRight size={13}/></Link>
                <Link href={`/dashboard/valuations/${item.id}/report`} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-teal)] px-3 py-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><FileText size={13}/>Reporte</Link>
              </div>
            </div>
          </article>
        }):<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen valorizaciones abiertas.</div>}</div>
      </section>

      <section><SectionHeading eyebrow="03 · Seguimiento ejecutivo" title="Responsables, acción y cierre" description="Una decisión pasa de abierta a seguimiento y sólo puede cerrarse cuando queda registrado su resultado."/><div className="space-y-3">{pending.length?pending.map((task)=>{
        const resultValue=resultDrafts[task.id]??task.resolution_note??''
        return <article key={task.id} className={`border bg-[#0c1111] p-4 ${task.due_date&&task.due_date<today?'border-[#d7332b]':task.priority==='urgent'?'border-[#a77a22]':'border-[var(--n3-line)]'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'} · {taskStatusLabel[task.status]??task.status} · vence {task.due_date??'sin fecha'}</p>{task.detail?<p className="mt-2 text-sm text-[var(--n3-text-muted)]">{task.detail}</p>:null}</div>
            {task.status==='open'?<button type="button" disabled={updatingTaskId===task.id} onClick={()=>void updateTask(task,'in_progress')} className="inline-flex min-h-11 shrink-0 items-center justify-center border border-[var(--n3-teal)] px-3 py-2 text-xs text-[var(--n3-teal)] disabled:opacity-50">Iniciar seguimiento</button>:null}
          </div>
          {task.status==='in_progress'?<div className="mt-4 border-t border-[var(--n3-line)] pt-4"><label htmlFor={`result-${task.id}`} className="text-xs font-semibold">Resultado</label><textarea id={`result-${task.id}`} rows={3} value={resultValue} onChange={(event)=>setResultDrafts((current)=>({...current,[task.id]:event.target.value}))} placeholder="Registra qué ocurrió y el resultado verificable de esta decisión." className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm outline-none focus:border-[var(--n3-teal)]"/><div className="mt-3 flex justify-end"><button type="button" disabled={updatingTaskId===task.id||!resultValue.trim()} onClick={()=>void updateTask(task,'done')} className="inline-flex min-h-11 items-center gap-2 border border-[#2f8f4e] px-3 py-2 text-xs text-[#65c780] disabled:opacity-40"><CheckCircle2 size={14}/>Cerrar con resultado</button></div></div>:null}
        </article>
      }):<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen decisiones abiertas o en seguimiento.</div>}</div></section>

      <section><SectionHeading eyebrow="04 · Evidencia de resultados" title="Decisiones cerradas" description="Historial reciente de decisiones cuyo resultado quedó registrado."/><div className="space-y-3">{closed.length?closed.map((task)=>{
        const valuationId=valuationIdFromSourceKey(task.source_key)
        return <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#65c780]"><CheckCircle2 size={14}/>Cerrada · {formatDate(task.completed_at)}</div><p className="mt-2 font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'}</p>{task.detail?<p className="mt-3 text-sm text-[var(--n3-text-muted)]"><span className="font-semibold text-white/70">Contexto:</span> {task.detail}</p>:null}<p className="mt-2 text-sm"><span className="font-semibold text-white/70">Resultado:</span> {task.resolution_note}</p></div>{valuationId?<Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver evidencia<ArrowRight size={13}/></Link>:null}</div></article>
      }):<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">Todavía no existen decisiones cerradas con resultado registrado.</div>}</div></section>
    </>:null}
  </IntelligencePage>
}
