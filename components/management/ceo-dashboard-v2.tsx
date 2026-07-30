'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, Building2, ClipboardCheck, FileText, Maximize2, RefreshCw, ShieldCheck, Target, UsersRound } from 'lucide-react'
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
type Risk = { id:string; entity:string; branch:string; title:string; detail:string; severity:'critical'|'warning'; score:number }

const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value===null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const compliance=(item?:Metric)=>item?.compliance==null?'n/d':`${item.compliance.toFixed(1)}%`
const riskTone=(value:number|null|undefined)=>value==null?'text-[var(--n3-text-muted)]':value>=100?'text-[#65c780]':value>=80?'text-[#f6c453]':'text-[#ff766f]'
const slug=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')

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
  const today=new Date().toISOString().slice(0,10)

  const branchName=(entity:Entity)=>{
    const branchId=entity.parentId?.replace('branch:','')
    return branches.find((item)=>slug(item.name)===branchId)?.name??branchId??'Sin oficina'
  }

  const risks=useMemo(()=>partners.flatMap((entity)=>{
    const rows:Risk[]=[]
    const branch=branchName(entity)
    for(const [code,label] of [['management_score','Gestión'],['portfolio_score','Cartera'],['follow_up_score','Seguimiento'],['conversion','Conversión']] as const){
      const value=metric(entity,code)?.value
      if(value!=null&&value<70)rows.push({id:`${entity.id}:${code}`,entity:entity.name,branch,title:`${label} bajo umbral`,detail:`${value.toFixed(1)} puntos · brecha ${(70-value).toFixed(1)}`,severity:value<50?'critical':'warning',score:value})
    }
    const sales=metric(entity,'sales')
    if(sales?.compliance!=null&&sales.compliance<90)rows.push({id:`${entity.id}:sales`,entity:entity.name,branch,title:'Meta de cierres en riesgo',detail:`Cumplimiento ${sales.compliance.toFixed(1)}%`,severity:sales.compliance<60?'critical':'warning',score:sales.compliance})
    return rows
  }).sort((a,b)=>a.severity===b.severity?a.score-b.score:a.severity==='critical'?-1:1),[partners,branches])

  const branchRows=useMemo(()=>branches.map((branch)=>{
    const sales=metric(branch,'sales')
    const salesUf=metric(branch,'sales_uf')
    const branchRisks=risks.filter((risk)=>risk.branch===branch.name)
    const branchTasks=openTasks.filter((task)=>task.office===branch.name)
    return {branch,sales,salesUf,critical:branchRisks.filter((risk)=>risk.severity==='critical').length,open:branchTasks.length,overdue:branchTasks.filter((task)=>task.due_date&&task.due_date<today).length}
  }).sort((a,b)=>Number(b.sales?.compliance??-1)-Number(a.sales?.compliance??-1)),[branches,risks,openTasks,today])

  const ranking=useMemo(()=>[...partners].sort((a,b)=>Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1)).slice(0,10),[partners])
  const overdue=openTasks.filter((task)=>task.due_date&&task.due_date<today)
  const urgent=openTasks.filter((task)=>task.priority==='urgent')
  const biggestRisk=risks[0]
  const weakestBranch=[...branchRows].sort((a,b)=>Number(a.sales?.compliance??999)-Number(b.sales?.compliance??999))[0]
  const companySales=metric(company,'sales')
  const companyUf=metric(company,'sales_uf')

  const decisionQueue=[
    {label:'Valorizaciones por revisar',value:operations?.valuations.review??0,detail:`${operations?.valuations.draft??0} borradores adicionales`,href:'/dashboard/valuations?status=review',severity:(operations?.valuations.review??0)>0?'warning':'ok'},
    {label:'Tareas vencidas',value:operations?.tasks.overdue??0,detail:`${operations?.tasks.urgent??0} urgentes`,href:'/dashboard/director/tareas',severity:(operations?.tasks.overdue??0)>0?'critical':'ok'},
    {label:'Asignaciones pausadas',value:operations?.assignments.paused??0,detail:`${operations?.assignments.active??0} activas`,href:'/dashboard/properties/admin',severity:(operations?.assignments.paused??0)>0?'warning':'ok'},
    {label:'Identidades de mercado pendientes',value:operations?.market.pendingIdentity??0,detail:`${operations?.market.confirmed??0} confirmadas`,href:'/dashboard/market',severity:(operations?.market.pendingIdentity??0)>0?'warning':'ok'},
  ]

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Vista CEO · Comando ejecutivo" title="Control consolidado de Property Partners" description="Qué ocurrió, dónde está el riesgo y qué decisiones requieren acción." actions={[{label:'Modo presentación',href:'/dashboard/ceo/presentacion',primary:true},{label:'Reporte CEO',href:'/dashboard/ceo/reporte'}]} meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><Building2 size={15}/>{summary?.periodLabel??'Sin período'}</div>}/>

    {loading?<div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Preparando consolidado ejecutivo…</div>:null}
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw size={14}/>Reintentar</button></div>:null}

    {!loading&&!error&&summary&&operations?<>
      <section>
        <SectionHeading eyebrow="01 · Lo que debe saber hoy" title="Síntesis ejecutiva" description="Tres lecturas para orientar la reunión y las decisiones."/>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><Target size={15}/>Resultado</div><p className="mt-4 text-2xl font-semibold">{fmt(companySales)}</p><p className={`mt-2 text-sm ${riskTone(companySales?.compliance)}`}>Cumplimiento {compliance(companySales)} · {fmt(companyUf)}</p><p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">{companySales?.compliance==null?'No existe meta consolidada aprobada.':companySales.compliance>=100?'La compañía cumple o supera la meta de cierres.':`Falta ${(100-companySales.compliance).toFixed(1)}% para alcanzar la meta del período.`}</p></article>
          <article className="border border-[#d7332b] bg-[#0c1111] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#ff766f]"><AlertTriangle size={15}/>Mayor riesgo</div><p className="mt-4 text-xl font-semibold">{biggestRisk?`${biggestRisk.entity} · ${biggestRisk.title}`:'Sin riesgo crítico detectado'}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{biggestRisk?`${biggestRisk.branch} · ${biggestRisk.detail}`:'Los indicadores disponibles no generan una excepción crítica.'}</p><p className="mt-3 text-xs text-[var(--n3-text-muted)]">Oficina con menor cumplimiento: {weakestBranch?.branch.name??'n/d'} · {compliance(weakestBranch?.sales)}</p></article>
          <article className="border border-[#a77a22] bg-[#0c1111] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#f6c453]"><ClipboardCheck size={15}/>Decisión pendiente</div><p className="mt-4 text-2xl font-semibold">{operations.tasks.overdue+operations.valuations.review}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{operations.tasks.overdue} tareas vencidas · {operations.valuations.review} valorizaciones en revisión</p><Link href="/dashboard/ceo/decisiones" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff766f] hover:underline">Abrir centro de decisiones<ArrowRight size={14}/></Link></article>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="02 · Indicadores consolidados" title="Pulso de la compañía" description="Resultado canónico y capacidad operativa visible al CEO."/>
        <MetricGrid columns={4}>
          <MetricCard label={companySales?.label??'Cierres'} value={fmt(companySales)} detail={`Meta ${companySales?.target?.toLocaleString('es-CL')??'n/d'} · cumplimiento ${compliance(companySales)}`}/>
          <MetricCard label={companyUf?.label??'Venta UF'} value={fmt(companyUf)} detail={`Meta ${companyUf?.target?.toLocaleString('es-CL')??'n/d'} · cumplimiento ${compliance(companyUf)}`}/>
          <MetricCard label="Oficinas y equipo" value={`${branches.length} / ${partners.length}`} detail="Oficinas / ejecutivas con ficha canónica"/>
          <MetricCard label="Riesgos críticos" value={String(risks.filter((risk)=>risk.severity==='critical').length)} detail={`${risks.length} brechas detectadas en total`}/>
        </MetricGrid>
      </section>

      <section>
        <SectionHeading eyebrow="03 · Centro de decisiones" title="Pendientes que requieren acción" description="Ordenados por impacto operativo, con acceso directo al flujo correspondiente."/>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{decisionQueue.map((item)=><Link key={item.label} href={item.href} className={`border bg-[#0c1111] p-5 focus-visible:outline focus-visible:outline-2 ${item.severity==='critical'?'border-[#d7332b]':item.severity==='warning'?'border-[#a77a22]':'border-[var(--n3-line)]'}`}><p className="text-3xl font-semibold">{item.value}</p><p className="mt-2 text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.detail}</p><span className="mt-4 inline-flex items-center gap-2 text-xs text-[#ff766f]">Resolver<ArrowRight size={13}/></span></Link>)}</div>
      </section>

      <section>
        <SectionHeading eyebrow="04 · Ranking de oficinas" title="Comparativo ejecutivo por sucursal" description="Resultado, riesgo y carga de seguimiento en una sola lectura."/>
        <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Pos.</th><th className="px-4 py-3 text-left">Oficina</th><th className="px-4 py-3 text-right">Cierres/meta</th><th className="px-4 py-3 text-right">UF/meta</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Riesgos críticos</th><th className="px-4 py-3 text-right">Tareas abiertas</th><th className="px-4 py-3 text-right">Vencidas</th><th className="px-4 py-3"></th></tr></thead><tbody>{branchRows.map((row,index)=><tr key={row.branch.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]"><td className="px-4 py-4 text-[var(--n3-text-muted)]">{String(index+1).padStart(2,'0')}</td><td className="px-4 py-4 font-semibold">{row.branch.name}</td><td className={`px-4 py-4 text-right ${riskTone(row.sales?.compliance)}`}>{row.sales?.value??'n/d'} / {row.sales?.target??'n/d'}<div className="text-[10px]">{compliance(row.sales)}</div></td><td className={`px-4 py-4 text-right ${riskTone(row.salesUf?.compliance)}`}>{row.salesUf?.value?.toLocaleString('es-CL')??'n/d'} / {row.salesUf?.target?.toLocaleString('es-CL')??'n/d'}<div className="text-[10px]">{compliance(row.salesUf)}</div></td><td className="px-4 py-4 text-right">{metric(row.branch,'management_score')?.value?.toFixed(1)??'n/d'}</td><td className="px-4 py-4 text-right">{row.critical}</td><td className="px-4 py-4 text-right">{row.open}</td><td className="px-4 py-4 text-right">{row.overdue}</td><td className="px-4 py-4 text-right"><Link href={`/dashboard/ceo/oficina/${slug(row.branch.name)}`} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]">Abrir oficina<ArrowRight size={13}/></Link></td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div><SectionHeading eyebrow="05 · Riesgos" title="Brechas que requieren intervención" description="Priorizadas por severidad, magnitud y oficina."/><div className="space-y-3">{risks.slice(0,14).map((risk)=><article key={risk.id} className={`border bg-[#0c1111] p-4 ${risk.severity==='critical'?'border-[#d7332b]':'border-[#a77a22]'}`}><div className="flex gap-3"><AlertTriangle size={18} className={risk.severity==='critical'?'text-[#ff766f]':'text-[#f6c453]'}/><div className="min-w-0 flex-1"><p className="font-semibold">{risk.entity} · {risk.title}</p><p className="mt-1 text-sm text-[var(--n3-text-muted)]">{risk.branch} · {risk.detail}</p></div><Link href={`/dashboard/ceo/oficina/${slug(risk.branch)}`} className="text-xs text-[#ff766f] hover:underline">Ver oficina</Link></div></article>)}</div></div>
        <div><SectionHeading eyebrow="06 · Ranking individual" title="Top ejecutivas por cierres"/><div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)] bg-[#0c1111]">{ranking.map((entity,index)=><div key={entity.id} className="flex items-center gap-3 p-4"><span className="w-7 text-xs text-[var(--n3-text-muted)]">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{entity.name}</p><p className="text-xs text-[var(--n3-text-muted)]">{branchName(entity)} · {entity.classification??'Sin clasificación'}</p></div><span className="font-semibold">{metric(entity,'sales')?.value??'n/d'}</span></div>)}</div></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div><SectionHeading eyebrow="07 · Seguimiento" title="Tareas vencidas y urgentes"/><div className="space-y-3">{[...overdue,...urgent.filter((task)=>!overdue.some((item)=>item.id===task.id))].slice(0,10).map((task)=><article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'} · vence {task.due_date??'sin fecha'}</p></article>)}</div></div>
        <div><SectionHeading eyebrow="08 · Accesos ejecutivos" title="Áreas de decisión"/><div className="grid gap-3 sm:grid-cols-2">{[
          {label:'Centro de decisiones',href:'/dashboard/ceo/decisiones',icon:ClipboardCheck,detail:'Pendientes críticos y responsables.'},
          {label:'Control de gestión',href:'/dashboard/control',icon:BarChart3,detail:'Metas, métricas y alertas.'},
          {label:'Valorizaciones',href:'/dashboard/valuations',icon:ClipboardCheck,detail:'Revisión y aprobación.'},
          {label:'Mercado',href:'/dashboard/market',icon:Building2,detail:'Inventario y evidencia.'},
          {label:'Reporte CEO',href:'/dashboard/ceo/reporte',icon:FileText,detail:'Documento ejecutivo imprimible.'},
          {label:'Modo presentación',href:'/dashboard/ceo/presentacion',icon:Maximize2,detail:'Lectura limpia para reunión.'},
          {label:'Equipo',href:'/dashboard/director',icon:UsersRound,detail:'Gestión por oficina y ejecutiva.'},
          {label:'Administración',href:'/dashboard/control/admin',icon:ShieldCheck,detail:'Metas y configuración.'},
        ].map((access)=><Link key={access.href} href={access.href} className="group flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b] focus-visible:outline focus-visible:outline-2"><access.icon size={18} className="text-[#ff766f]"/><div className="min-w-0 flex-1"><p className="font-semibold">{access.label}</p><p className="text-xs text-[var(--n3-text-muted)]">{access.detail}</p></div><ArrowRight size={15}/></Link>)}</div></div>
      </section>

      {operations.errors.length?<div role="alert" className="border border-[#d7332b] p-4 text-sm text-[#ff766f]">Consultas parciales: {operations.errors.join(' · ')}</div>:null}
      <MethodologyNote>{summary.dataProvenance} Consolidado generado {new Date(operations.generatedAt).toLocaleString('es-CL')}. La vista CEO muestra todas las oficinas y registros permitidos por su rol.</MethodologyNote>
    </>:null}
  </IntelligencePage>
}
