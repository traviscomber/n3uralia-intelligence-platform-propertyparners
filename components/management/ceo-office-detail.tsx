'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric={code:string;unit:string;value:number|null;target:number|null;compliance:number|null;yoy:number|null;comparisonValue?:number|null;qualityNotes?:string[]}
type Entity={id:string;name:string;entityType:string;parentId:string|null;metrics:Metric[]}
type Summary={periodLabel:string;dataProvenance?:string;entities:Entity[]}
type Task={id:string;title:string;status:string;priority:string;due_date:string|null;office:string|null;assignedProfile?:{full_name:string|null}|null}
const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')
const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value==null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const pct=(value:number|null|undefined)=>value==null?'n/d':`${value>0?'+':''}${value.toFixed(1)}%`
const base=(item?:Metric)=>item?.comparisonValue==null?'n/d':item.unit==='uf'?`${item.comparisonValue.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.comparisonValue.toLocaleString('es-CL',{maximumFractionDigits:1})

export function CeoOfficeDetail({slug}:{slug:string}){
 const [summary,setSummary]=useState<Summary|null>(null),[tasks,setTasks]=useState<Task[]>([]),[error,setError]=useState<string|null>(null)
 useEffect(()=>{void(async()=>{try{const [s,t]=await Promise.all([fetch('/api/management/summary',{cache:'no-store'}),fetch('/api/management/tasks',{cache:'no-store'})]);const [sd,td]=await Promise.all([s.json(),t.json()]);if(!s.ok||!t.ok)throw new Error(sd.error||td.error||'No fue posible cargar la oficina.');setSummary(sd);setTasks(td.tasks??[])}catch(cause){setError(cause instanceof Error?cause.message:'Error de carga')}})()},[])
 const branch=summary?.entities.find((entity)=>entity.entityType==='branch'&&slugify(entity.name)===slug)
 const partners=summary?.entities.filter((entity)=>entity.entityType==='partner'&&entity.parentId===branch?.id)??[]
 const ranking=useMemo(()=>[...partners].sort((a,b)=>Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1)),[partners])
 const branchTasks=tasks.filter((task)=>task.office===branch?.name&&['open','in_progress'].includes(task.status))
 const sales=metric(branch,'sales'),uf=metric(branch,'sales_uf'),cum=metric(branch,'cumulative_sales'),cumUf=metric(branch,'cumulative_sales_uf'),stock=metric(branch,'stock'),movement=metric(branch,'portfolio_net_change')
 const notes=[...(sales?.qualityNotes??[]),...(uf?.qualityNotes??[]),...(cum?.qualityNotes??[]),...(cumUf?.qualityNotes??[])]
 return <IntelligencePage>
  <Link href="/dashboard/ceo" className="inline-flex items-center gap-2 text-xs text-[var(--n3-text-muted)]"><ArrowLeft size={14}/>Volver al CEO</Link>
  <IntelligenceHeader eyebrow="CEO · Detalle de oficina" title={branch?.name??'Oficina'} description="Resultado, base 2025, cartera, equipo y pendientes." actions={[{label:'Control de gestión',href:'/dashboard/control',primary:true},{label:'Centro de decisiones',href:'/dashboard/ceo/decisiones'}]}/>
  {error?<div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]"><RefreshCw className="mb-2"/>{error}</div>:null}
  {!summary&&!error?<div role="status" className="border border-[var(--n3-line)] p-8 text-[var(--n3-text-muted)]">Cargando oficina…</div>:null}
  {summary&&!branch?<div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]">La oficina no existe en la fuente canónica.</div>:null}
  {branch?<>
   <section><SectionHeading eyebrow="01 · Resultado" title={summary?.periodLabel??'Período disponible'}/><MetricGrid columns={4}><MetricCard label="Cierres junio" value={fmt(sales)} detail={`2025: ${base(sales)} · YoY ${pct(sales?.yoy)}`}/><MetricCard label="UF junio" value={fmt(uf)} detail={`2025: ${base(uf)} · YoY ${pct(uf?.yoy)}`}/><MetricCard label="Cierres acumulados" value={fmt(cum)} detail={`2025: ${base(cum)} · YoY ${pct(cum?.yoy)}`}/><MetricCard label="UF acumuladas" value={fmt(cumUf)} detail={`2025: ${base(cumUf)} · YoY ${pct(cumUf?.yoy)}`}/><MetricCard label="Cartera actual" value={fmt(stock)} detail={stock?.comparisonValue==null?'Mayo n/d':`Mayo: ${stock.comparisonValue.toLocaleString('es-CL')}`}/><MetricCard label="Movimiento neto cartera" value={fmt(movement)} detail={`${pct(movement?.yoy)} mayo–junio; no equivale a captaciones`}/><MetricCard label="Captaciones brutas" value="n/d" detail="No existe métrica explícita separada"/><MetricCard label="Tareas abiertas" value={branchTasks.length} detail={`${branchTasks.filter((task)=>task.due_date&&task.due_date<new Date().toISOString().slice(0,10)).length} vencidas`}/></MetricGrid></section>
   <section><SectionHeading eyebrow="02 · Equipo" title="Ranking con comparación interanual"/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Ejecutiva</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">Base 2025</th><th className="px-4 py-3 text-right">YoY cierres</th><th className="px-4 py-3 text-right">YoY UF</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Seguimiento</th><th className="px-4 py-3 text-right">Conversión</th><th className="px-4 py-3 text-right">Mov. cartera</th></tr></thead><tbody>{ranking.map((entity)=>{const s=metric(entity,'sales'),u=metric(entity,'sales_uf'),mv=metric(entity,'portfolio_net_change');return <tr key={entity.id} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3 font-semibold">{entity.name}</td><td className="px-4 py-3 text-right">{fmt(s)}</td><td className="px-4 py-3 text-right">{base(s)}</td><td className="px-4 py-3 text-right">{pct(s?.yoy)}</td><td className="px-4 py-3 text-right">{pct(u?.yoy)}</td><td className="px-4 py-3 text-right">{fmt(metric(entity,'management_score'))}</td><td className="px-4 py-3 text-right">{fmt(metric(entity,'follow_up_score'))}</td><td className="px-4 py-3 text-right">{fmt(metric(entity,'conversion'))}</td><td className="px-4 py-3 text-right">{fmt(mv)}</td></tr>})}</tbody></table></div></section>
   <section className="grid gap-5 xl:grid-cols-2"><div><SectionHeading eyebrow="03 · Seguimiento" title="Tareas activas"/><div className="space-y-3">{branchTasks.length?branchTasks.map((task)=><article key={task.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-4"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.assignedProfile?.full_name??'Sin responsable'} · {task.priority} · vence {task.due_date??'sin fecha'}</p></article>):<div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen tareas abiertas.</div>}</div></div><div><SectionHeading eyebrow="04 · Calidad" title={notes.length?'Observaciones YoY':'Comparación conciliada'}/><div className="space-y-3">{notes.length?notes.map((note,index)=><article key={index} className="border border-[#a77a22] p-4 text-sm">{note}</article>):<article className="border border-[#2f8f4e] p-4 text-sm">El cálculo interanual coincide con el Δ% AA informado dentro de tolerancia.</article>}</div></div></section>
   <MethodologyNote>{summary?.dataProvenance} El YoY se recalcula desde valores base 2025. El movimiento de cartera es neto y no representa captaciones brutas.</MethodologyNote>
  </>:null}
 </IntelligencePage>
}
