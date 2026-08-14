'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'

type SourceSummary = { sourceName:string; count:number; verified:number; evaluable:number }
type Reconciliation = {
  id:string
  entityName:string
  metricLabel:string
  metric_code:string
  period_start:string
  period_end:string
  published_value:number|string|null
  calculated_value:number|string|null
  absolute_delta:number|string|null
  relative_delta:number|string|null
  reconciliation_status:string
  publication_status:string
  formula_version:number
  calculatedSource:string|null
  publishedSource:string|null
  approved_at:string|null
  notes:string|null
  eligible:boolean
}
type Payload = {
  role:string
  canApprove:boolean
  calculatedSource:string
  counts:{metricValues:number;verifiedEvaluable:number;sourceValues:number;calculatedValues:number;reconciliations:number;pendingApproval:number;approved:number;blocked:number}
  readiness:{calculatedSourceAvailable:boolean;reconciliationAvailable:boolean;approvalAvailable:boolean}
  sourceSummary:SourceSummary[]
  reconciliations:Reconciliation[]
}

const n=(value:number|string|null|undefined,digits=2)=>value==null?'—':Number(value).toLocaleString('es-CL',{maximumFractionDigits:digits})
const statusLabel=(value:string)=>value==='exact'?'Exacta':value==='within_tolerance'?'Dentro de tolerancia':value==='different'?'Diferente':value==='not_comparable'?'No comparable':value==='blocked'?'Bloqueada':value
const publicationLabel=(value:string)=>value==='approved'?'Aprobada':value==='provisional'?'Provisional':value==='rejected'?'Rechazada':'Bloqueada'

export default function ManagementReconciliationPage(){
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [savingId,setSavingId]=useState<string|null>(null)

  async function load(){
    setLoading(true);setError(null)
    try{
      const response=await fetch('/api/management/reconciliation',{cache:'no-store'})
      const payload=await response.json() as Payload & {error?:string}
      if(!response.ok)throw new Error(payload.error||'No fue posible cargar la reconciliación.')
      setData(payload)
    }catch(cause){setData(null);setError(cause instanceof Error?cause.message:'No fue posible cargar la reconciliación.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  async function update(item:Reconciliation,action:'approve'|'reject'){
    const promptLabel=action==='approve'?'Nota de aprobación (opcional)':'Motivo del rechazo'
    const notes=window.prompt(promptLabel)??''
    if(action==='reject'&&!notes.trim())return
    setSavingId(item.id);setError(null)
    try{
      const response=await fetch('/api/management/reconciliation',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,action,notes})})
      const payload=await response.json() as {error?:string}
      if(!response.ok)throw new Error(payload.error||'No fue posible actualizar la reconciliación.')
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible actualizar la reconciliación.')}finally{setSavingId(null)}
  }

  const pending=useMemo(()=>data?.reconciliations.filter(item=>item.publication_status!=='approved').sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.period_end??'').localeCompare(a.period_end??''))??[],[data])
  const approved=useMemo(()=>data?.reconciliations.filter(item=>item.publication_status==='approved')??[],[data])

  if(loading)return <WorkspaceShell><OperationalState kind="loading" title="Cargando reconciliación" description="Validando fuentes, cálculos, tolerancias y estado de publicación."/></WorkspaceShell>
  if(!data)return <WorkspaceShell><OperationalState kind="error" title="Reconciliación no disponible" description={error??'No fue posible consultar la información.'}/></WorkspaceShell>

  const status=data.readiness.approvalAvailable?'ready':data.readiness.calculatedSourceAvailable?'partial':'blocked'
  const coverage=data.counts.metricValues>0?data.counts.approved/data.counts.metricValues*100:0

  return <WorkspaceShell>
    <div className="mb-3"><Link href="/dashboard/control/admin" className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-text-muted)]"><ArrowLeft size={14}/>Volver a metas y alertas</Link></div>
    <WorkspaceHeader eyebrow="Control de gestión · Reconciliación" title="Evidencia antes de publicación" meta={`${data.counts.pendingApproval} listas para decisión · ${data.counts.approved} aprobadas`} actions={[{label:'Actualizar',onClick:()=>void load(),icon:<RefreshCw size={14}/>,ariaLabel:'Actualizar reconciliación'}]}/>

    {error?<div role="alert" className="mt-4 border border-[#d7332b] px-4 py-3 text-sm text-[#ff8d87]">{error}</div>:null}

    <MetricStrip items={[
      {label:'Valores registrados',value:data.counts.metricValues},
      {label:'Verificados/evaluables',value:data.counts.verifiedEvaluable},
      {label:'Cálculos canónicos',value:data.counts.calculatedValues,tone:data.counts.calculatedValues?'success':'danger'},
      {label:'Aprobados',value:data.counts.approved,tone:data.counts.approved?'success':'default'},
    ]}/>

    {!data.readiness.calculatedSourceAvailable?<section className="mt-5 border border-[#a77a22]/50 bg-[#a77a22]/5 p-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#f0c96a]"/><div><h2 className="text-sm font-semibold text-[#f0c96a]">Falta la etapa de cálculo canónico</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--n3-text-muted)]">Existen {data.counts.sourceValues} valores fuente verificados y evaluables, pero ninguno utiliza la identidad reservada <code className="text-[var(--n3-text-light)]">{data.calculatedSource}</code>. Sin ese cálculo independiente no se habilita reconciliación ni aprobación. Esta pantalla no copia ni convierte automáticamente valores fuente en datos publicados.</p></div></div></section>:null}

    <section className="mt-6"><div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Fuentes registradas</h2><span className="text-xs text-[var(--n3-text-muted)]">{data.sourceSummary.length} fuentes</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="py-3 pr-4">Fuente</th><th className="px-3 py-3 text-right">Registros</th><th className="px-3 py-3 text-right">Verificados</th><th className="px-3 py-3 text-right">Evaluables</th></tr></thead><tbody>{data.sourceSummary.map(item=><tr key={item.sourceName} className="border-b border-[var(--n3-line)] text-sm"><td className="py-3 pr-4 font-medium">{item.sourceName}</td><td className="px-3 py-3 text-right tabular-nums">{item.count}</td><td className="px-3 py-3 text-right tabular-nums">{item.verified}</td><td className="px-3 py-3 text-right tabular-nums">{item.evaluable}</td></tr>)}</tbody></table></div></section>

    <section className="mt-7"><div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Reconciliaciones pendientes</h2><span className="text-xs text-[var(--n3-text-muted)]">{pending.length}</span></div>{pending.length?<div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-[var(--n3-line)] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="py-3 pr-4">Entidad / métrica</th><th className="px-3 py-3">Período</th><th className="px-3 py-3 text-right">Publicado</th><th className="px-3 py-3 text-right">Calculado</th><th className="px-3 py-3">Reconciliación</th><th className="px-3 py-3">Publicación</th><th className="px-3 py-3 text-right">Decisión</th></tr></thead><tbody>{pending.map(item=><tr key={item.id} className="border-b border-[var(--n3-line)] text-sm"><td className="py-3 pr-4"><span className="block font-medium">{item.entityName}</span><span className="block text-xs text-[var(--n3-text-muted)]">{item.metricLabel} · fórmula v{item.formula_version}</span></td><td className="px-3 py-3 text-xs text-[var(--n3-text-muted)]">{item.period_start} → {item.period_end}</td><td className="px-3 py-3 text-right tabular-nums">{n(item.published_value)}</td><td className="px-3 py-3 text-right tabular-nums">{n(item.calculated_value)}</td><td className="px-3 py-3"><span className={item.eligible?'text-[#78d59a]':'text-[#f0c96a]'}>{statusLabel(item.reconciliation_status)}</span>{item.calculatedSource?<span className="block text-[10px] text-[var(--n3-text-muted)]">{item.calculatedSource}</span>:null}</td><td className="px-3 py-3 text-[var(--n3-text-muted)]">{publicationLabel(item.publication_status)}</td><td className="px-3 py-3"><div className="flex justify-end gap-2">{data.canApprove&&item.eligible?<button disabled={savingId===item.id} onClick={()=>void update(item,'approve')} className="inline-flex min-h-10 items-center gap-1 border border-[#78d59a]/40 px-3 text-xs text-[#78d59a] disabled:opacity-40"><CheckCircle2 size={13}/>Aprobar</button>:null}{data.canApprove?<button disabled={savingId===item.id} onClick={()=>void update(item,'reject')} className="inline-flex min-h-10 items-center gap-1 border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)] disabled:opacity-40"><XCircle size={13}/>Rechazar</button>:null}</div></td></tr>)}</tbody></table></div>:<OperationalState compact kind={data.readiness.calculatedSourceAvailable?'success':'empty'} title={data.readiness.calculatedSourceAvailable?'Sin reconciliaciones pendientes':'Todavía no hay reconciliaciones'} description={data.readiness.calculatedSourceAvailable?'No existen decisiones de publicación pendientes.':'Primero debe existir cálculo canónico independiente y una reconciliación trazable.'}/>}</section>

    {approved.length?<section className="mt-7"><div className="flex items-center justify-between border-b border-[var(--n3-line)] pb-2"><h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Publicadas</h2><span className="text-xs text-[#78d59a]">{approved.length}</span></div><div className="divide-y divide-[var(--n3-line)]">{approved.slice(0,30).map(item=><div key={item.id} className="grid gap-2 py-3 text-sm md:grid-cols-[minmax(0,1fr)_180px_160px]"><div><span className="font-medium">{item.entityName} · {item.metricLabel}</span><span className="ml-2 text-xs text-[var(--n3-text-muted)]">{item.period_end}</span></div><span className="text-[var(--n3-text-muted)]">{statusLabel(item.reconciliation_status)}</span><span className="text-right text-[#78d59a]">{n(item.calculated_value)}</span></div>)}</div></section>:null}

    <DataStatusBar cutoff="Reconciliación explícita" coverage={`Publicación ${n(coverage,1)}%`} issues={data.counts.blocked} status={status}/>
  </WorkspaceShell>
}
