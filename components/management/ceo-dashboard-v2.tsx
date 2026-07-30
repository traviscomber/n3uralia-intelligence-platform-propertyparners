'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BarChart3, Building2, ClipboardCheck, FileText, Maximize2, RefreshCw, ShieldCheck, Target, UsersRound } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric={code:string;label:string;unit:'count'|'uf'|'percent'|'days'|'score';value:number|null;target:number|null;compliance:number|null;mom:number|null;yoy?:number|null}
type Evolution={period:string;sales:number|null;salesTarget:number|null;salesUf?:number|null;salesUfTarget?:number|null;cumulativeSales?:number|null;cumulativeSalesTarget?:number|null}
type Entity={id:string;name:string;entityType:string;parentId:string|null;classification?:string|null;metrics:Metric[];evolution?:Evolution[]}
type Summary={scopeLabel:string;periodLabel:string;generatedAt?:string;dataProvenance?:string;entities:Entity[]}
type Operations={valuations:{total:number;draft:number;review:number;approved:number;issued:number};assignments:{total:number;active:number;paused:number};market:{properties:number;confirmed:number;pendingIdentity:number};tasks:{total:number;open:number;overdue:number;urgent:number;byOffice:Array<{office:string;count:number}>};people:{total:number;sellers:number;leaders:number};generatedAt:string;errors:string[]}
type Task={id:string;title:string;status:string;priority:string;due_date:string|null;office:string|null;assignedProfile?:{full_name:string|null}|null}
type Risk={id:string;entity:string;branch:string;title:string;detail:string;severity:'critical'|'warning';score:number}

const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value===null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.unit==='percent'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:1})}%`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const pct=(value:number|null|undefined)=>value==null?'n/d':`${value>0?'+':''}${value.toFixed(1)}%`
const compliance=(item?:Metric)=>item?.compliance==null?'n/d':`${item.compliance.toFixed(1)}%`
const riskTone=(value:number|null|undefined)=>value==null?'text-[var(--n3-text-muted)]':value>=100?'text-[#65c780]':value>=80?'text-[#f6c453]':'text-[#ff766f]'
const slug=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')
const month=(period:string)=>new Intl.DateTimeFormat('es-CL',{month:'short'}).format(new Date(`${period}-01T12:00:00`)).replace('.','')

export function CeoDashboardV2(){
  const [summary,setSummary]=useState<Summary|null>(null)
  const [operations,setOperations]=useState<Operations|null>(null)
  const [tasks,setTasks]=useState<Task[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  async function load(){
    setLoading(true);setError(null)
    try{
      const [s,o,t]=await Promise.all([fetch('/api/management/summary',{cache:'no-store'}),fetch('/api/management/ceo-operations',{cache:'no-store'}),fetch('/api/management/tasks',{cache:'no-store'})])
      const [sd,od,td]=await Promise.all([s.json(),o.json(),t.json()])
      if(!s.ok)throw new Error(sd.error||'No fue posible cargar el consolidado ejecutivo.')
      if(!o.ok)throw new Error(od.error||'No fue posible cargar la operación global.')
      if(!t.ok)throw new Error(td.error||'No fue posible cargar las tareas ejecutivas.')
      setSummary(sd);setOperations(od);setTasks(td.tasks??[])
    }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar la vista CEO.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const company=summary?.entities.find((entity)=>entity.entityType==='company')
  const branches=summary?.entities.filter((entity)=>entity.entityType==='branch')??[]
  const partners=summary?.entities.filter((entity)=>entity.entityType==='partner')??[]
  const openTasks=tasks.filter((task)=>['open','in_progress'].includes(task.status))
  const today=new Date().toISOString().slice(0,10)
  const companySales=metric(company,'sales')
  const companyUf=metric(company,'sales_uf')
  const captureMetric=metric(company,'captations')??metric(company,'captaciones')
  const followUp=metric(company,'follow_up_score')
  const conversion=metric(company,'conversion')
  const productivity=companySales?.value!=null&&partners.length?companySales.value/partners.length:null
  const evolution=company?.evolution??[]
  const evolutionMax=Math.max(1,...evolution.flatMap((item)=>[item.sales??0,item.salesTarget??0]))

  const branchName=(entity:Entity)=>{const branchId=entity.parentId?.replace('branch:','');return branches.find((item)=>slug(item.name)===branchId)?.name??branchId??'Sin oficina'}
  const risks=useMemo(()=>partners.flatMap((entity)=>{
    const rows:Risk[]=[];const branch=branchName(entity)
    for(const [code,label] of [['management_score','Gestión'],['portfolio_score','Cartera'],['follow_up_score','Seguimiento'],['conversion','Conversión']] as const){const value=metric(entity,code)?.value;if(value!=null&&value<70)rows.push({id:`${entity.id}:${code}`,entity:entity.name,branch,title:`${label} bajo umbral`,detail:`${value.toFixed(1)} puntos · brecha ${(70-value).toFixed(1)}`,severity:value<50?'critical':'warning',score:value})}
    const sales=metric(entity,'sales');if(sales?.compliance!=null&&sales.compliance<90)rows.push({id:`${entity.id}:sales`,entity:entity.name,branch,title:'Meta de ventas en riesgo',detail:`Cumplimiento ${sales.compliance.toFixed(1)}%`,severity:sales.compliance<60?'critical':'warning',score:sales.compliance})
    return rows
  }).sort((a,b)=>a.severity===b.severity?a.score-b.score:a.severity==='critical'?-1:1),[partners,branches])

  const branchRows=useMemo(()=>branches.map((branch)=>{const sales=metric(branch,'sales');const salesUf=metric(branch,'sales_uf');const branchRisks=risks.filter((risk)=>risk.branch===branch.name);const branchTasks=openTasks.filter((task)=>task.office===branch.name);return{branch,sales,salesUf,critical:branchRisks.filter((risk)=>risk.severity==='critical').length,open:branchTasks.length,overdue:branchTasks.filter((task)=>task.due_date&&task.due_date<today).length}}).sort((a,b)=>Number(b.sales?.compliance??-1)-Number(a.sales?.compliance??-1)),[branches,risks,openTasks,today])
  const ranking=useMemo(()=>[...partners].sort((a,b)=>Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1)).slice(0,10),[partners])
  const biggestRisk=risks[0]
  const weakestBranch=[...branchRows].sort((a,b)=>Number(a.sales?.compliance??999)-Number(b.sales?.compliance??999))[0]
  const decisionQueue=[
    {label:'Valorizaciones por revisar',value:operations?.valuations.review??0,detail:`${operations?.valuations.draft??0} borradores adicionales`,href:'/dashboard/valuations?status=review',severity:(operations?.valuations.review??0)>0?'warning':'ok'},
    {label:'Tareas vencidas',value:operations?.tasks.overdue??0,detail:`${operations?.tasks.urgent??0} urgentes`,href:'/dashboard/ceo/decisiones',severity:(operations?.tasks.overdue??0)>0?'critical':'ok'},
    {label:'Asignaciones pausadas',value:operations?.assignments.paused??0,detail:`${operations?.assignments.active??0} activas`,href:'/dashboard/properties/admin',severity:(operations?.assignments.paused??0)>0?'warning':'ok'},
    {label:'Identidades pendientes',value:operations?.market.pendingIdentity??0,detail:`${operations?.market.confirmed??0} confirmadas`,href:'/dashboard/market',severity:(operations?.market.pendingIdentity??0)>0?'warning':'ok'},
  ]

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Vista CEO · Alcance contractual" title="Control consolidado de Property Partners" description="Resultados, captaciones, ventas, seguimiento, conversión, productividad, metas, variaciones, evolución, rankings y alertas." actions={[{label:'Modo presentación',href:'/dashboard/ceo/presentacion',primary:true},{label:'Reporte CEO',href:'/dashboard/ceo/reporte'}]} meta={<div className="flex items-center gap-2 border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]"><Building2 size={15}/>{summary?.periodLabel??'Sin período'}</div>}/>
    {loading?<div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Preparando consolidado ejecutivo…</div>:null}
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-sm text-[#ff766f]"><p>{error}</p><button onClick={()=>void load()} className="mt-3 inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 focus-visible:outline focus-visible:outline-2"><RefreshCw size={14}/>Reintentar</button></div>:null}
    {!loading&&!error&&summary&&operations?<>
      <section><SectionHeading eyebrow="01 · Lo que debe saber hoy" title="Síntesis ejecutiva" description="Resultado, riesgo principal y decisiones pendientes."/><div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><Target size={15}/>Resultado</div><p className="mt-4 text-2xl font-semibold">{fmt(companySales)}</p><p className={`mt-2 text-sm ${riskTone(companySales?.compliance)}`}>Meta {companySales?.target??'n/d'} · cumplimiento {compliance(companySales)}</p><p className="mt-3 text-sm text-[var(--n3-text-muted)]">MoM {pct(companySales?.mom)} · YoY {pct(companySales?.yoy)}</p></article>
        <article className={`border bg-[#0c1111] p-5 ${biggestRisk?'border-[#d7332b]':'border-[#2f8f4e]'}`}><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#ff766f]"><AlertTriangle size={15}/>Mayor riesgo</div><p className="mt-4 text-xl font-semibold">{biggestRisk?`${biggestRisk.entity} · ${biggestRisk.title}`:'Sin riesgo crítico detectado'}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{biggestRisk?`${biggestRisk.branch} · ${biggestRisk.detail}`:`Oficina con menor cumplimiento: ${weakestBranch?.branch.name??'n/d'}`}</p></article>
        <article className="border border-[#a77a22] bg-[#0c1111] p-5"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#f6c453]"><ClipboardCheck size={15}/>Decisiones</div><p className="mt-4 text-2xl font-semibold">{operations.tasks.overdue+operations.valuations.review}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{operations.tasks.overdue} tareas vencidas · {operations.valuations.review} valorizaciones</p><Link href="/dashboard/ceo/decisiones" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff766f]">Abrir centro<ArrowRight size={14}/></Link></article>
      </div></section>

      <section><SectionHeading eyebrow="02 · Indicadores exigidos" title="Cobertura del Dashboard CEO" description="Los datos ausentes se muestran como n/d; no se infieren desde indicadores distintos."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Captaciones" value={fmt(captureMetric)} detail={captureMetric?'Dato canónico separado':'La fuente actual no entrega captaciones separadas de stock'}/>
        <MetricCard label="Ventas" value={fmt(companySales)} detail={`Meta ${companySales?.target??'n/d'} · ${compliance(companySales)}`}/>
        <MetricCard label="Gestión de seguimiento" value={fmt(followUp)} detail="Score consolidado disponible"/>
        <MetricCard label="Conversión" value={fmt(conversion)} detail="Score consolidado disponible"/>
        <MetricCard label="Productividad" value={productivity==null?'n/d':`${productivity.toFixed(2)} cierres/ejecutiva`} detail="Derivado: cierres consolidados ÷ ejecutivas con ficha"/>
        <MetricCard label="Variación MoM" value={pct(companySales?.mom)} detail="Ventas contra el mes anterior disponible"/>
        <MetricCard label="Variación YoY" value={pct(companySales?.yoy)} detail={companySales?.yoy==null?'Sin base comparable del año anterior':'Ventas contra igual período anterior'}/>
        <MetricCard label="Alertas" value={String(risks.length)} detail={`${risks.filter((risk)=>risk.severity==='critical').length} críticas`}/>
      </div></section>

      <section><SectionHeading eyebrow="03 · Evolución" title="Ventas mensuales y meta" description="Serie canónica disponible; no se completan meses ausentes."/>{evolution.length?<div className="border border-[var(--n3-line)] bg-[#0c1111] p-5"><div className="grid min-w-[620px] grid-cols-6 gap-3 overflow-x-auto">{evolution.map((item)=><div key={item.period} className="flex min-h-56 flex-col justify-end"><div className="mb-2 flex h-40 items-end justify-center gap-1"><div className="w-5 bg-[#d7332b]" style={{height:`${Math.max(3,((item.sales??0)/evolutionMax)*100)}%`}} title={`Ventas ${item.sales??'n/d'}`}/><div className="w-5 border border-[var(--n3-line)] bg-white/10" style={{height:`${Math.max(3,((item.salesTarget??0)/evolutionMax)*100)}%`}} title={`Meta ${item.salesTarget??'n/d'}`}/></div><p className="text-center text-xs uppercase text-[var(--n3-text-muted)]">{month(item.period)}</p><p className="mt-1 text-center text-sm font-semibold">{item.sales??'n/d'} / {item.salesTarget??'n/d'}</p></div>)}</div><p className="mt-4 text-xs text-[var(--n3-text-muted)]">Rojo: ventas · Gris: meta.</p></div>:<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">Sin serie mensual canónica disponible.</div>}</section>

      <section><SectionHeading eyebrow="04 · Centro de decisiones" title="Pendientes que requieren acción"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{decisionQueue.map((item)=><Link key={item.label} href={item.href} className={`border bg-[#0c1111] p-5 focus-visible:outline focus-visible:outline-2 ${item.severity==='critical'?'border-[#d7332b]':item.severity==='warning'?'border-[#a77a22]':'border-[var(--n3-line)]'}`}><p className="text-3xl font-semibold">{item.value}</p><p className="mt-2 text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.detail}</p><span className="mt-4 inline-flex items-center gap-2 text-xs text-[#ff766f]">Resolver<ArrowRight size={13}/></span></Link>)}</div></section>

      <section><SectionHeading eyebrow="05 · Ranking de oficinas" title="Resultados por oficina" description="Ventas, cumplimiento, variaciones, scores y carga de seguimiento."/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[1280px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Pos.</th><th className="px-4 py-3 text-left">Oficina</th><th className="px-4 py-3 text-right">Ventas/meta</th><th className="px-4 py-3 text-right">MoM</th><th className="px-4 py-3 text-right">YoY</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th><th className="px-4 py-3 text-right">Alertas críticas</th><th className="px-4 py-3 text-right">Vencidas</th><th></th></tr></thead><tbody>{branchRows.map((row,index)=><tr key={row.branch.id} className="border-t border-[var(--n3-line)] hover:bg-white/[0.02]"><td className="px-4 py-4 text-[var(--n3-text-muted)]">{String(index+1).padStart(2,'0')}</td><td className="px-4 py-4 font-semibold">{row.branch.name}</td><td className={`px-4 py-4 text-right ${riskTone(row.sales?.compliance)}`}>{row.sales?.value??'n/d'} / {row.sales?.target??'n/d'}<div className="text-[10px]">{compliance(row.sales)}</div></td><td className="px-4 py-4 text-right">{pct(row.sales?.mom)}</td><td className="px-4 py-4 text-right">{pct(row.sales?.yoy)}</td><td className="px-4 py-4 text-right">{fmt(metric(row.branch,'follow_up_score'))}</td><td className="px-4 py-4 text-right">{fmt(metric(row.branch,'conversion'))}</td><td className="px-4 py-4 text-right">{row.critical}</td><td className="px-4 py-4 text-right">{row.overdue}</td><td className="px-4 py-4 text-right"><Link href={`/dashboard/ceo/oficinas/${slug(row.branch.name)}`} className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-3 py-2 text-xs hover:border-[#d7332b]">Abrir<ArrowRight size={13}/></Link></td></tr>)}</tbody></table></div></section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><div><SectionHeading eyebrow="06 · Alertas" title="Excepciones priorizadas"/><div className="space-y-3">{risks.slice(0,14).map((risk)=><article key={risk.id} className={`border bg-[#0c1111] p-4 ${risk.severity==='critical'?'border-[#d7332b]':'border-[#a77a22]'}`}><p className="font-semibold">{risk.entity} · {risk.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{risk.branch} · {risk.detail}</p></article>)}{!risks.length?<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">Sin alertas derivadas de los datos disponibles.</div>:null}</div></div><div><SectionHeading eyebrow="07 · Ranking individual" title="Top ejecutivas por ventas"/><div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)] bg-[#0c1111]">{ranking.map((entity,index)=><div key={entity.id} className="flex items-center gap-3 p-4"><span className="w-7 text-xs text-[var(--n3-text-muted)]">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{entity.name}</p><p className="text-xs text-[var(--n3-text-muted)]">{branchName(entity)} · {entity.classification??'Sin clasificación'}</p></div><span className="font-semibold">{metric(entity,'sales')?.value??'n/d'}</span></div>)}</div></div></section>

      <section><SectionHeading eyebrow="08 · Accesos" title="Áreas de decisión"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        {label:'Presentación CEO',href:'/dashboard/ceo/presentacion',icon:Maximize2},{label:'Reporte CEO',href:'/dashboard/ceo/reporte',icon:FileText},{label:'Control de gestión',href:'/dashboard/control',icon:BarChart3},{label:'Equipo',href:'/dashboard/director',icon:UsersRound},{label:'Valorizaciones',href:'/dashboard/valuations',icon:ClipboardCheck},{label:'Mercado',href:'/dashboard/market',icon:Building2},{label:'Administración',href:'/dashboard/control/admin',icon:ShieldCheck},
      ].map((access)=><Link key={access.href} href={access.href} className="flex items-center gap-3 border border-[var(--n3-line)] bg-[#0c1111] p-4 hover:border-[#d7332b]"><access.icon size={17} className="text-[#ff766f]"/><span className="font-semibold">{access.label}</span></Link>)}</div></section>

      {operations.errors.length?<div role="alert" className="border border-[#d7332b] p-4 text-sm text-[#ff766f]">Consultas parciales: {operations.errors.join(' · ')}</div>:null}
      <MethodologyNote>{summary.dataProvenance} Generado {new Date(operations.generatedAt).toLocaleString('es-CL')}. Productividad es un indicador derivado y explícito. Captaciones y YoY permanecen n/d cuando la fuente no los entrega.</MethodologyNote>
    </>:null}
  </IntelligencePage>
}
