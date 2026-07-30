'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PrintReportButton from '@/components/reports/print-report-button'
import { IntelligenceHeader, IntelligencePage, MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric={code:string;label:string;unit:string;value:number|null;target:number|null;compliance:number|null}
type Entity={id:string;name:string;entityType:string;parentId:string|null;classification?:string|null;metrics:Metric[]}
type Summary={periodLabel:string;generatedAt?:string;dataProvenance?:string;entities:Entity[]}
type Operations={valuations:{review:number;draft:number;approved:number;issued:number};assignments:{active:number;paused:number};market:{properties:number;confirmed:number;pendingIdentity:number};tasks:{open:number;overdue:number;urgent:number};generatedAt:string}
type Task={id:string;title:string;status:string;priority:string;due_date:string|null;office:string|null;assignedProfile?:{full_name:string|null}|null}
const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value==null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const pct=(item?:Metric)=>item?.compliance==null?'n/d':`${item.compliance.toFixed(1)}%`

export function CeoReport(){
  const [summary,setSummary]=useState<Summary|null>(null)
  const [operations,setOperations]=useState<Operations|null>(null)
  const [tasks,setTasks]=useState<Task[]>([])
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{void(async()=>{try{const [s,o,t]=await Promise.all([fetch('/api/management/summary',{cache:'no-store'}),fetch('/api/management/ceo-operations',{cache:'no-store'}),fetch('/api/management/tasks',{cache:'no-store'})]);const [sd,od,td]=await Promise.all([s.json(),o.json(),t.json()]);if(!s.ok||!o.ok||!t.ok)throw new Error(sd.error||od.error||td.error||'No fue posible generar el reporte.');setSummary(sd);setOperations(od);setTasks(td.tasks??[])}catch(cause){setError(cause instanceof Error?cause.message:'Error de reporte')}})()},[])
  const company=summary?.entities.find((entity)=>entity.entityType==='company')
  const branches=summary?.entities.filter((entity)=>entity.entityType==='branch')??[]
  const partners=summary?.entities.filter((entity)=>entity.entityType==='partner')??[]
  const openTasks=tasks.filter((task)=>['open','in_progress'].includes(task.status))
  const top=useMemo(()=>[...partners].sort((a,b)=>Number(metric(b,'sales')?.value??-1)-Number(metric(a,'sales')?.value??-1)).slice(0,5),[partners])
  const reportId=`CEO-${(summary?.generatedAt??new Date().toISOString()).slice(0,10).replaceAll('-','')}`
  return <IntelligencePage>
    <div className="print-hidden flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard/ceo" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Volver al CEO</Link><PrintReportButton/></div>
    <IntelligenceHeader eyebrow="Reporte ejecutivo CEO" title="Property Partners · Consolidado" description="Resultados, oficinas, riesgos y decisiones pendientes." meta={<div className="text-xs text-[var(--n3-text-muted)]">ID {reportId}</div>}/>
    {error?<div role="alert" className="border border-[#d7332b] p-5 text-[#ff766f]">{error}</div>:null}
    {!summary||!operations?<div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Generando reporte…</div>:<>
      <section><SectionHeading eyebrow="01 · Resumen" title="Pulso de la compañía"/><MetricGrid columns={4}><MetricCard label="Cierres" value={fmt(metric(company,'sales'))} detail={`Cumplimiento ${pct(metric(company,'sales'))}`}/><MetricCard label="Venta UF" value={fmt(metric(company,'sales_uf'))} detail={`Cumplimiento ${pct(metric(company,'sales_uf'))}`}/><MetricCard label="Tareas vencidas" value={operations.tasks.overdue} detail={`${operations.tasks.urgent} urgentes`}/><MetricCard label="Valorizaciones en revisión" value={operations.valuations.review} detail={`${operations.valuations.draft} borradores`}/></MetricGrid></section>
      <section><SectionHeading eyebrow="02 · Oficinas" title="Comparativo ejecutivo"/><div className="overflow-x-auto border border-[var(--n3-line)]"><table className="w-full min-w-[900px] text-sm"><thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3 text-left">Oficina</th><th className="px-4 py-3 text-right">Cierres</th><th className="px-4 py-3 text-right">Cumpl.</th><th className="px-4 py-3 text-right">UF</th><th className="px-4 py-3 text-right">Gestión</th><th className="px-4 py-3 text-right">Conversión</th></tr></thead><tbody>{branches.map((branch)=><tr key={branch.id} className="border-t border-[var(--n3-line)]"><td className="px-4 py-3 font-semibold">{branch.name}</td><td className="px-4 py-3 text-right">{fmt(metric(branch,'sales'))}</td><td className="px-4 py-3 text-right">{pct(metric(branch,'sales'))}</td><td className="px-4 py-3 text-right">{fmt(metric(branch,'sales_uf'))}</td><td className="px-4 py-3 text-right">{fmt(metric(branch,'management_score'))}</td><td className="px-4 py-3 text-right">{fmt(metric(branch,'conversion'))}</td></tr>)}</tbody></table></div></section>
      <section className="grid gap-5 xl:grid-cols-2"><div><SectionHeading eyebrow="03 · Top ejecutivas" title="Desempeño por cierres"/><div className="divide-y divide-[var(--n3-line)] border border-[var(--n3-line)]">{top.map((entity,index)=><div key={entity.id} className="flex items-center justify-between p-4"><div><span className="mr-3 text-xs text-[var(--n3-text-muted)]">{index+1}</span><strong>{entity.name}</strong></div><span>{fmt(metric(entity,'sales'))}</span></div>)}</div></div><div><SectionHeading eyebrow="04 · Decisiones" title="Pendientes activos"/><div className="space-y-3"><article className="border border-[var(--n3-line)] p-4">{operations.tasks.overdue} tareas vencidas · {operations.tasks.urgent} urgentes</article><article className="border border-[var(--n3-line)] p-4">{operations.valuations.review} valorizaciones en revisión</article><article className="border border-[var(--n3-line)] p-4">{operations.assignments.paused} asignaciones pausadas</article><article className="border border-[var(--n3-line)] p-4">{operations.market.pendingIdentity} identidades de mercado pendientes</article></div></div></section>
      <section><SectionHeading eyebrow="05 · Seguimiento" title="Tareas prioritarias"/><div className="space-y-3">{openTasks.filter((task)=>task.priority==='urgent'||(task.due_date&&task.due_date<new Date().toISOString().slice(0,10))).slice(0,12).map((task)=><article key={task.id} className="border border-[var(--n3-line)] p-4"><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{task.office??'Sin oficina'} · {task.assignedProfile?.full_name??'Sin responsable'} · vence {task.due_date??'sin fecha'}</p></article>)}</div></section>
      <MethodologyNote>Reporte {reportId}. Período {summary.periodLabel}. Generado {new Date(operations.generatedAt).toLocaleString('es-CL')}. {summary.dataProvenance} La operación refleja registros visibles al rol CEO al momento de consulta.</MethodologyNote>
    </>}
  </IntelligencePage>
}
