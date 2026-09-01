'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, SectionHeading } from '@/components/intelligence/design-system'

type Profile={id:string;full_name:string|null;team:string|null;role:string|null}
type SourceContext={kind:'valuation';valuationId:string;address:string|null}
type Task={id:string;source_key:string|null;title:string;detail:string|null;status:string;priority:string;due_date:string|null;office:string|null;resolution_note:string|null;completed_at:string|null;started_at:string|null;assignedProfile?:Profile|null;sourceContext?:SourceContext|null}
type RelatedCase={task:Task;reason:string}

function formatDate(value:string|null){
  if(!value)return 'sin fecha'
  return new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(value))
}

function valuationIdFromSourceKey(sourceKey:string|null){
  const match=String(sourceKey??'').match(/^valuation:([^:]+):/)
  return match?.[1]??null
}

function normalizeText(value:string|null|undefined){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
}

function taskTypeKey(task:Task){
  const sourceParts=String(task.source_key??'').split(':').filter(Boolean)
  if(sourceParts.length>=3)return `${sourceParts[0]}:${sourceParts.slice(2).join(':')}`
  return normalizeText(task.title)
}

function relationReason(current:Task,candidate:Task){
  const currentValuation=current.sourceContext?.kind==='valuation'?current.sourceContext:null
  const candidateValuation=candidate.sourceContext?.kind==='valuation'?candidate.sourceContext:null

  if(currentValuation&&candidateValuation&&currentValuation.valuationId===candidateValuation.valuationId)return 'Misma valorización'

  const currentAddress=normalizeText(currentValuation?.address)
  const candidateAddress=normalizeText(candidateValuation?.address)
  if(currentAddress&&candidateAddress&&currentAddress===candidateAddress)return 'Misma propiedad'

  const sameType=taskTypeKey(current)===taskTypeKey(candidate)
  if(sameType&&current.office&&candidate.office&&current.office===candidate.office)return 'Misma oficina y tipo'
  if(sameType)return 'Mismo tipo de decisión'
  return null
}

function relatedCases(task:Task,tasks:Task[]):RelatedCase[]{
  return tasks
    .filter((candidate)=>candidate.id!==task.id&&candidate.status==='done'&&Boolean(candidate.resolution_note))
    .map((candidate)=>({task:candidate,reason:relationReason(task,candidate)}))
    .filter((item):item is {task:Task;reason:string}=>Boolean(item.reason))
    .sort((a,b)=>(b.task.completed_at??'').localeCompare(a.task.completed_at??''))
    .slice(0,3)
}

function taskBorder(task:Task,today:string){
  if(task.due_date&&task.due_date<today)return 'border-[#d7332b]'
  if(task.priority==='urgent')return 'border-[#a77a22]'
  return 'border-[var(--n3-line)]'
}

function RelatedCases({task,tasks,expanded,onToggle}:{task:Task;tasks:Task[];expanded:boolean;onToggle:()=>void}){
  const related=relatedCases(task,tasks)
  if(!related.length)return null

  return <div className="mt-4 border-t border-[var(--n3-line)] pt-3">
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}Antecedentes relacionados ({related.length})
    </button>
    {expanded?<div className="mt-2 space-y-2">{related.map(({task:relatedTask,reason})=>{
      const valuationId=relatedTask.sourceContext?.kind==='valuation'?relatedTask.sourceContext.valuationId:valuationIdFromSourceKey(relatedTask.source_key)
      return <div key={relatedTask.id} className="border border-[var(--n3-line)] bg-black/20 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{reason} · cerrada {formatDate(relatedTask.completed_at)}</p>
            <p className="mt-1 text-sm font-semibold">{relatedTask.title}</p>
            <p className="mt-2 text-sm text-[var(--n3-text-muted)]"><span className="font-semibold text-white/70">Resultado:</span> {relatedTask.resolution_note}</p>
          </div>
          {valuationId?<Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver evidencia<ArrowRight size={13}/></Link>:null}
        </div>
      </div>
    })}</div>:null}
  </div>
}

export function CeoDecisions(){
  const [tasks,setTasks]=useState<Task[]>([])
  const [error,setError]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [updatingTaskId,setUpdatingTaskId]=useState<string|null>(null)
  const [resultDrafts,setResultDrafts]=useState<Record<string,string>>({})
  const [expandedRelated,setExpandedRelated]=useState<Record<string,boolean>>({})

  async function load(){
    setLoading(true);setError(null)
    try{
      const response=await fetch('/api/management/tasks',{cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'No fue posible cargar las decisiones.')
      setTasks(data.tasks??[])
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
  const attention=useMemo(()=>tasks.filter((task)=>task.status==='open').sort((a,b)=>{
    const priorityOrder={urgent:0,high:1,medium:2,low:3}
    const priorityDelta=(priorityOrder[a.priority as keyof typeof priorityOrder]??4)-(priorityOrder[b.priority as keyof typeof priorityOrder]??4)
    if(priorityDelta!==0)return priorityDelta
    return (a.due_date??'9999-12-31').localeCompare(b.due_date??'9999-12-31')
  }),[tasks])
  const following=useMemo(()=>tasks.filter((task)=>task.status==='in_progress').sort((a,b)=>(a.due_date??'9999-12-31').localeCompare(b.due_date??'9999-12-31')),[tasks])
  const closed=useMemo(()=>tasks.filter((task)=>task.status==='done'&&task.resolution_note).sort((a,b)=>(b.completed_at??'').localeCompare(a.completed_at??'')).slice(0,12),[tasks])
  const activeCount=attention.length+following.length
  const showCounts=activeCount>0||closed.length>0

  return <IntelligencePage>
    <Link href="/dashboard/ceo" className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={14}/>Volver al CEO</Link>
    <IntelligenceHeader eyebrow="CEO · Centro de decisiones" title={activeCount>0?'Qué requiere atención ahora':'Decisiones'} description={activeCount>0?'Una sola vista para decisiones abiertas, seguimiento activo y resultados recientes. Los antecedentes aparecen sólo cuando existe una relación verificable.':'Historial de resultados verificables y acceso directo a los flujos de decisión.'} actions={[{label:'Valorizaciones',href:'/dashboard/valuations',primary:true},{label:'Propiedades',href:'/dashboard/properties/admin'}]}/>

    {!loading&&!error&&showCounts?<div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-[var(--n3-line)] py-3 text-xs text-[var(--n3-text-muted)]">{attention.length>0?<span><strong className="font-semibold text-white">{attention.length}</strong> requieren atención</span>:null}{following.length>0?<span><strong className="font-semibold text-white">{following.length}</strong> en seguimiento</span>:null}{closed.length>0?<span><strong className="font-semibold text-white">{closed.length}</strong> resultados recientes</span>:null}</div>:null}

    {error?<div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14}/>Reintentar</button></div>:null}
    {loading?<div role="status" aria-live="polite" className="border border-[var(--n3-line)] p-8 text-[var(--n3-text-muted)]">Cargando decisiones…</div>:null}

    {!loading&&!error?<>
      {attention.length>0?<section>
        <SectionHeading eyebrow="01 · Requiere atención" title="Decisiones abiertas" description="Sólo asuntos que todavía necesitan iniciar seguimiento."/>
        <div className="space-y-3">{attention.map((task)=>{
          const valuationId=task.sourceContext?.kind==='valuation'?task.sourceContext.valuationId:valuationIdFromSourceKey(task.source_key)
          return <article key={task.id} className={`border bg-[#0c1111] p-4 ${taskBorder(task,today)}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]"><span>{task.office??'Sin oficina'}</span><span>{task.priority}</span><span>vence {formatDate(task.due_date)}</span></div>
                <p className="mt-2 font-semibold">{task.title}</p>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Responsable: {task.assignedProfile?.full_name??'Sin responsable'}</p>
                {task.sourceContext?.address?<p className="mt-1 text-xs text-[var(--n3-text-muted)]">Propiedad: {task.sourceContext.address}</p>:null}
                {task.detail?<p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{task.detail}</p>:null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {valuationId?<Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver evidencia<ArrowRight size={13}/></Link>:null}
                <button type="button" disabled={updatingTaskId===task.id} onClick={()=>void updateTask(task,'in_progress')} className="inline-flex min-h-11 items-center justify-center border border-[var(--n3-teal)] px-3 py-2 text-xs text-[var(--n3-teal)] disabled:opacity-50">Iniciar seguimiento</button>
              </div>
            </div>
            <RelatedCases task={task} tasks={tasks} expanded={Boolean(expandedRelated[task.id])} onToggle={()=>setExpandedRelated((current)=>({...current,[task.id]:!current[task.id]}))}/>
          </article>
        })}</div>
      </section>:null}

      {following.length>0?<section>
        <SectionHeading eyebrow="02 · En seguimiento" title="Decisiones en curso" description="Aquí sólo permanecen decisiones con una acción activa y todavía sin resultado final."/>
        <div className="space-y-3">{following.map((task)=>{
          const resultValue=resultDrafts[task.id]??task.resolution_note??''
          const valuationId=task.sourceContext?.kind==='valuation'?task.sourceContext.valuationId:valuationIdFromSourceKey(task.source_key)
          return <article key={task.id} className={`border bg-[#0c1111] p-4 ${taskBorder(task,today)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'} · vence {formatDate(task.due_date)}</p>{task.sourceContext?.address?<p className="mt-1 text-xs text-[var(--n3-text-muted)]">Propiedad: {task.sourceContext.address}</p>:null}{task.detail?<p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">{task.detail}</p>:null}</div>
              {valuationId?<Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver evidencia<ArrowRight size={13}/></Link>:null}
            </div>
            <RelatedCases task={task} tasks={tasks} expanded={Boolean(expandedRelated[task.id])} onToggle={()=>setExpandedRelated((current)=>({...current,[task.id]:!current[task.id]}))}/>
            <div className="mt-4 border-t border-[var(--n3-line)] pt-4"><label htmlFor={`result-${task.id}`} className="text-xs font-semibold">Resultado</label><textarea id={`result-${task.id}`} rows={3} value={resultValue} onChange={(event)=>setResultDrafts((current)=>({...current,[task.id]:event.target.value}))} placeholder="Registra qué ocurrió y cuál fue el resultado verificable." className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm outline-none focus:border-[var(--n3-teal)]"/><div className="mt-3 flex justify-end"><button type="button" disabled={updatingTaskId===task.id||!resultValue.trim()} onClick={()=>void updateTask(task,'done')} className="inline-flex min-h-11 items-center gap-2 border border-[#2f8f4e] px-3 py-2 text-xs text-[#65c780] disabled:opacity-40"><CheckCircle2 size={14}/>Cerrar con resultado</button></div></div>
          </article>
        })}</div>
      </section>:null}

      {closed.length>0?<section>
        <SectionHeading eyebrow="03 · Resultados" title="Resultados recientes" description="Decisiones cerradas cuyo resultado quedó registrado y puede volver a revisarse."/>
        <div className="space-y-3">{closed.map((task)=>{
          const valuationId=task.sourceContext?.kind==='valuation'?task.sourceContext.valuationId:valuationIdFromSourceKey(task.source_key)
          return <article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#65c780]"><CheckCircle2 size={14}/>Cerrada · {formatDate(task.completed_at)}</div><p className="mt-2 font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'}</p>{task.sourceContext?.address?<p className="mt-1 text-xs text-[var(--n3-text-muted)]">Propiedad: {task.sourceContext.address}</p>:null}{task.detail?<p className="mt-3 text-sm text-[var(--n3-text-muted)]"><span className="font-semibold text-white/70">Contexto:</span> {task.detail}</p>:null}<p className="mt-2 text-sm"><span className="font-semibold text-white/70">Resultado:</span> {task.resolution_note}</p></div>{valuationId?<Link href={`/dashboard/valuations/${valuationId}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Ver evidencia<ArrowRight size={13}/></Link>:null}</div></article>
        })}</div>
      </section>:null}
    </>:null}
  </IntelligencePage>
}
