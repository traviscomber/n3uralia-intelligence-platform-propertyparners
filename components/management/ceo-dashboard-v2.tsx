'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, Building2, ClipboardCheck, FileText, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric = { code:string; label:string; unit:'count'|'uf'|'percent'|'days'|'score'; value:number|null; target:number|null; compliance:number|null; mom:number|null }
type Entity = { id:string; name:string; entityType:string; parentId:string|null; classification?:string|null; metrics:Metric[] }
type Summary = { scopeLabel:string; periodLabel:string; generatedAt?:string; dataProvenance?:string; entities:Entity[] }
type Operations = {
  valuations:{total:number;draft:number;review:number;approved:number;issued:number}
  assignments:{total:number;active:number;paused:number}
  market:{properties:number;confirmed:number;pendingIdentity:number}
  tasks:{total:number;open:number;overdue:number;urgent:number;byOffice:Array<{office:string;count:number}>}
  people:{total:number;sellers:number;leaders:number}
  generatedAt:string
  errors:string[]
}
type Task = { id:string; title:string; status:string; priority:string; due_date:string|null; office:string|null; assignedProfile?:{full_name:string|null}|null }

const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value===null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const compliance=(item?:Metric)=>item?.compliance==null?'n/d':`${item.compliance.toFixed(1)}%`
const riskTone=(value:number|null|undefined)=>value==null?'text-[var(--n3-text-muted)]':value>=100?'text-[#65c780]':value>=80?'text-[#f6c453]':'text-[#ff766f]'

export function CeoDashboardV2(){
  const [summary,setSummary]=useState<Summary|null>(null)
  const [operations,setOperations]=useState<Operations|null>(null)
  const [tasks,setTasks]=useState<Task[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  async function load(){
    setLoading(true);setError(null)
    try{
      const [summaryResponse,operationsResponse,tasksResponse]=await Promise.all([
        fetch('/api/management/summary',{cache:'no-store'}),
        fetch('/api/management/ceo-operations',{cache:'no-store'}),
        fetch('/api/management/tasks',{cache:'no-store'}),
      ])
      const [summaryData,operationsData,tasksData]=await Promise.all([summaryResponse.json(),operationsResponse.json(),tasksResponse.json()])
      if(!summaryResponse.ok)throw new Error(summaryData.error||'No fue posible cargar el consolidado ejecutivo.')
      if(!operationsResponse.ok)throw new Error(operationsData.error||'No fue posible cargar la operación global.')
      if(!tasksResponse.ok)throw new Error(tasksData.error||'No fue posible cargar las tareas ejecutivas.')
      setSummary(summaryData);setOperations(operationsData);setTasks(tasksData.tasks??[])
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar la vista CEO.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const company=summary?.entities.find((entity)=>entity.entityType==='company')
  const branches=summary?.entities.filter((entity)=>entity.entityType==='branch')??[]
  const partners=summary?.entities.filter((entity)=>entity.entityType==='partner')??[]
  const openTasks=tasks.filter((task)=>['open','in_progress'].includes(task.status))

  const risks=useMemo(()=>partners.flatMap((entity)=>{
    const rows:Array<{id:string;entity:string;title:string;detail:string;severity:'critical'|'warning'}>=[]
    for(const [code,label] of [['management_score','Gestión'],['portfolio_score','Cartera'],['follow_up_score','Seguimiento'],['conversion','Conversión']] as const){
      const value=metric(entity,code)?.value
      if(value!=null&&value<70)rows.push({id:`${entity.id}:${code}`,entity:entity.name,title:`${label} bajo umbral`,detail:`${value.toFixed(1)} puntos · brecha ${(70-value).toFixed(1)}`,severity:value<50?'critical':'warning'})
    }
    const sales=metric(entity,'sales')
    if(sales?.compliance!=null&&sales.compliance<90)rows.push({id:`${entity.id}:sales`,entity:entity.name,title:'Meta de cierres en riesgo',detail:`Cumplimiento ${sales.compliance.toFixed(1)}%`,severity:sales.compliance<60?'critical':'warning'})
    return rows
  }).sort((a,b)=>a.severity===b.severity?a.entity.localeCompare(b.entity):a.severity==='critical'?-1:1),[partners])

  const ranking=useMemo(()=>[...partners].sort((a,b)=>Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1)).slice(0,10),[partners])
  const overdue=openTasks.filter((task)=>task.due_date&&task.due_date<new Date().toISOString().slice(0,10))

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Vista CEO · Comando ejecutivo" title="Control consolidado de Property Partners" description="Resultados, oficinas, equipo, valorizaciones, cartera, riesgos y decisiones pendientes en una sola vista." actions={[{label:'Control de gestión',href:'/dashboard/control',primary:true},{label:'Reportes',href:'/dashboard/reportes/autonomos'}]} meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><Building2 size={15}/>{summary?.periodLabel??'Sin período'}</div>}/>

    {loading?<div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Preparando consolidado ejecutivo…</div>:null}
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14}/>Reintentar</button></div>:null}

    {!loading&&!error&&summary&&operations?<>
      <section>
        <SectionHeading eyebrow="01 · Resumen ejecutivo" title="Pulso de la compañía" description="Indicadores canónicos del período y operación disponible al momento de consulta."/>
        <MetricGrid columns={4}>
          <MetricCard label={metric(company,'sales')?.label??'Cierres'} value={fmt(metric(company,'sales'))} detail={`Meta ${metric(company,'sales')?.target?.toLocaleString('es-CL')??'n/d'} · cumplimiento ${compliance(metric(company,'sales'))}`}/>
          <MetricCard label={metric(company,'sales_uf')?.label??'Venta UF'} value={fmt(metric(company,'sales_uf'))} detail={`Meta ${metric(company,'sales_uf')?.target?.toLocaleString('es-CL')??'n/d'} · cumplimiento ${compliance(metric(company,'sales_uf'))}`}/>
          <MetricCard label="Oficinas" value={String(branches.length)} detail={`${partners.length} ejecutivas con ficha canónica`}/>
          <MetricCard label="Riesgos críticos" value={String(risks.filter((risk)=>risk.severity==='critical').length)} detail={`${risks.length} brechas detectadas en total`}/>
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Operación global" title="Decisiones y carga operativa"/>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/valuations?status=review" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><p className="text-3xl font-semibold">{operations.valuations.review}</p><p className="mt-2 text-sm">Valorizaciones en revisión</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{operations.valuations.draft} borradores · {operations.valuations.approved+operations.valuations.issued} aprobadas/emitidas</p></Link>
          <Link href="/dashboard/properties/admin" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><p className="text-3xl font-semibold">{operations.assignments.active}</p><p className="mt-2 text-sm">Asignaciones activas</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{operations.assignments.total} asignaciones visibles</p></Link>
          <Link href="/dashboard/director/tareas" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><p className="text-3xl font-semibold">{operations.tasks.open}</p><p className="mt-2 text-sm">Tareas abiertas</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{operations.tasks.overdue} vencidas · {operations.tasks.urgent} urgentes</p></Link>
          <Link href="/dashboard/market" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><p className="text-3xl font-semibold">{operations.market.properties}</p><p className="mt-2 text-sm">Propiedades de mercado</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{operations.market.confirmed} identidades confirmadas</p></Link>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Oficinas" title="Comparativo ejecutivo por sucursal" description="Resultados, metas y calidad de gestión de cada oficina."/>
        <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[980px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Oficina</th><th className="px-4 py-3 text-right">Cierres/meta</th><th className="px-4 py-3 text-right">UF/meta</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Cartera</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th></tr></thead><tbody>{branches.map((branch)=>{const sales=metric(branch,'sales'),salesUf=metric(branch,'sales_uf');return <tr key={branch.id} className="border-t border-[var(--n3-line)]"><td className="px-4 py-4 font-semibold">{branch.name}</td><td className={`px-4 py-4 text-right ${riskTone(sales?.compliance)}`}>{sales?.value??'n/d'} / {sales?.target??'n/d'}<div className="text-[10px]">{compliance(sales)}</div></td><td className={`px-4 py-4 text-right ${riskTone(salesUf?.compliance)}`}>{salesUf?.value?.toLocaleString('es-CL')??'n/d'} / {salesUf?.target?.toLocaleString('es-CL')??'n/d'}<div className="text-[10px]">{compliance(salesUf)}</div></td>{['management_score','portfolio_score','follow_up_score','conversion'].map((code)=><td key={code} className="px-4 py-4 text-right">{metric(branch,code)?.value?.toFixed(1)??'n/d'}</td>)}</tr>})}</tbody></table></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div><SectionHeading eyebrow="04 · Riesgos" title="Brechas que requieren decisión" description="Priorizadas por severidad y asociadas a resultados canónicos."/><div className="space-y-3">{risks.slice(0,14).map((risk)=><article key={risk.id} className={`border bg-[#0c1111] p-4 ${risk.severity==='critical'?'border-[#d7332b]':'border-[#a77a22]'}`}><div className="flex gap-3"><AlertTriangle size={18} className={risk.severity==='critical'?'text-[#ff766f]':'text-[#f6c453]'}/><div><p className="font-semibold">{risk.entity} · {risk.title}</p><p className="mt-1 text-sm text-[var(--n3-text-muted)]">{risk.detail}</p></div></div></article>)}</div></div>
        <div><SectionHeading eyebrow="05 · Ranking" title="Top ejecutivas por cierres"/><div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)] bg-[#0c1111]">{ranking.map((entity,index)=><div key={entity.id} className="flex items-center gap-3 p-4"><span className="w-7 text-xs text-[var(--n3-text-muted)]">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{entity.name}</p><p className="text-xs text-[var(--n3-text-muted)]">{entity.parentId?.replace('branch:','')??'Sin oficina'} · {entity.classification??'Sin clasificación'}</p></div><span className="font-semibold">{metric(entity,'sales')?.value??'n/d'}</span></div>)}</div></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div><SectionHeading eyebrow="06 · Seguimiento" title="Tareas vencidas y urgentes"/><div className="space-y-3">{[...overdue,...openTasks.filter((task)=>task.priority==='urgent'&&!overdue.some((item)=>item.id===task.id))].slice(0,10).map((task)=><article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'} · vence {task.due_date??'sin fecha'}</p></article>)}</div></div>
        <div><SectionHeading eyebrow="07 · Accesos ejecutivos" title="Áreas de decisión"/><div className="grid gap-3 sm:grid-cols-2">{[
          {label:'Control de gestión',href:'/dashboard/control',icon:BarChart3,detail:'Metas, métricas y alertas.'},
          {label:'Valorizaciones',href:'/dashboard/valuations',icon:ClipboardCheck,detail:'Revisión y aprobación.'},
          {label:'Mercado',href:'/dashboard/market',icon:Building2,detail:'Inventario y evidencia.'},
          {label:'Reportes',href:'/dashboard/reportes/autonomos',icon:FileText,detail:'Documentos ejecutivos.'},
          {label:'Equipo',href:'/dashboard/director',icon:UsersRound,detail:'Gestión por oficina y ejecutiva.'},
          {label:'Administración',href:'/dashboard/control/admin',icon:ShieldCheck,detail:'Metas y configuración.'},
        ].map((access)=><Link key={access.href} href={access.href} className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><access.icon size={18} className="text-[#ff766f]"/><div className="min-w-0 flex-1"><p className="font-semibold">{access.label}</p><p className="text-xs text-[var(--n3-text-muted)]">{access.detail}</p></div><ArrowRight size={15}/></Link>)}</div></div>
      </section>

      {operations.errors.length?<div role="alert" className="border border-[#d7332b] p-4 text-sm text-[#ff766f]">Consultas parciales: {operations.errors.join(' · ')}</div>:null}
      <MethodologyNote>{summary.dataProvenance} Consolidado generado {new Date(operations.generatedAt).toLocaleString('es-CL')}. La vista CEO muestra todas las oficinas y registros permitidos por su rol.</MethodologyNote>
    </>:null}
  </IntelligencePage>
}
