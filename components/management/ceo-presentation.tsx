'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Building2, RefreshCw } from 'lucide-react'

type Metric={code:string;value:number|null;target:number|null;compliance:number|null;unit:string}
type Entity={id:string;name:string;entityType:string;parentId:string|null;metrics:Metric[]}
type Summary={periodLabel:string;entities:Entity[]}
type Operations={valuations:{review:number};tasks:{overdue:number;urgent:number};assignments:{paused:number};market:{pendingIdentity:number}}
const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value==null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const pct=(item?:Metric)=>item?.compliance==null?'n/d':`${item.compliance.toFixed(1)}%`

export function CeoPresentation(){
  const [summary,setSummary]=useState<Summary|null>(null)
  const [operations,setOperations]=useState<Operations|null>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{void(async()=>{try{const [s,o]=await Promise.all([fetch('/api/management/summary',{cache:'no-store'}),fetch('/api/management/ceo-operations',{cache:'no-store'})]);const [sd,od]=await Promise.all([s.json(),o.json()]);if(!s.ok||!o.ok)throw new Error(sd.error||od.error||'No fue posible cargar la presentación.');setSummary(sd);setOperations(od)}catch(cause){setError(cause instanceof Error?cause.message:'Error de carga')}})()},[])
  const company=summary?.entities.find((entity)=>entity.entityType==='company')
  const branches=summary?.entities.filter((entity)=>entity.entityType==='branch')??[]
  const ordered=useMemo(()=>[...branches].sort((a,b)=>Number(metric(b,'sales')?.compliance??-1)-Number(metric(a,'sales')?.compliance??-1)),[branches])
  return <main className="min-h-screen bg-[var(--n3-black)] px-5 py-6 text-[var(--n3-text-light)] md:px-10 lg:px-14">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><Link href="/dashboard/ceo" className="inline-flex items-center gap-2 text-sm text-[var(--n3-text-muted)]"><ArrowLeft size={16}/>Volver al dashboard</Link><div className="text-xs uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{summary?.periodLabel??'Cargando período'}</div></div>
    {error?<div className="border border-[#d7332b] p-6 text-[#ff766f]"><RefreshCw className="mb-3"/>{error}</div>:null}
    {!summary||!operations?<div className="flex min-h-[60vh] items-center justify-center text-lg text-[var(--n3-text-muted)]">Preparando vista ejecutiva…</div>:<>
      <header className="mb-12 max-w-5xl"><div className="mb-4 flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-[#ff766f]"><Building2 size={20}/>Comando ejecutivo</div><h1 className="text-4xl font-semibold leading-tight md:text-6xl">Property Partners en una mirada</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--n3-text-muted)]">Resultado, oficinas y decisiones pendientes para conducir la conversación ejecutiva.</p></header>
      <section className="grid gap-5 lg:grid-cols-4"><article className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><p className="text-sm text-[var(--n3-text-muted)]">Cierres</p><p className="mt-3 text-4xl font-semibold">{fmt(metric(company,'sales'))}</p><p className="mt-2 text-sm">Cumplimiento {pct(metric(company,'sales'))}</p></article><article className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><p className="text-sm text-[var(--n3-text-muted)]">Venta UF</p><p className="mt-3 text-4xl font-semibold">{fmt(metric(company,'sales_uf'))}</p><p className="mt-2 text-sm">Cumplimiento {pct(metric(company,'sales_uf'))}</p></article><article className="border border-[#d7332b] bg-[#0c1111] p-6"><p className="text-sm text-[#ff766f]">Tareas vencidas</p><p className="mt-3 text-4xl font-semibold">{operations.tasks.overdue}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{operations.tasks.urgent} urgentes</p></article><article className="border border-[#a77a22] bg-[#0c1111] p-6"><p className="text-sm text-[#f6c453]">Valorizaciones por revisar</p><p className="mt-3 text-4xl font-semibold">{operations.valuations.review}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">Decisiones pendientes</p></article></section>
      <section className="mt-12"><h2 className="mb-5 text-2xl font-semibold">Oficinas</h2><div className="grid gap-5 lg:grid-cols-3">{ordered.map((branch,index)=><article key={branch.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-6"><div className="flex items-center justify-between"><span className="text-xs text-[var(--n3-text-muted)]">#{index+1}</span><span className="text-sm">{pct(metric(branch,'sales'))}</span></div><h3 className="mt-4 text-2xl font-semibold">{branch.name}</h3><p className="mt-5 text-3xl font-semibold">{fmt(metric(branch,'sales'))}</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">{fmt(metric(branch,'sales_uf'))}</p><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div><p className="text-[var(--n3-text-muted)]">Gestión</p><p className="text-xl">{metric(branch,'management_score')?.value?.toFixed(1)??'n/d'}</p></div><div><p className="text-[var(--n3-text-muted)]">Conversión</p><p className="text-xl">{metric(branch,'conversion')?.value?.toFixed(1)??'n/d'}</p></div></div></article>)}</div></section>
      <section className="mt-12 border border-[#a77a22] bg-[#0c1111] p-7"><div className="flex items-start gap-4"><AlertTriangle className="mt-1 text-[#f6c453]"/><div><h2 className="text-2xl font-semibold">Decisiones inmediatas</h2><p className="mt-3 text-lg leading-8 text-[var(--n3-text-muted)]">{operations.tasks.overdue} tareas vencidas, {operations.valuations.review} valorizaciones en revisión, {operations.assignments.paused} asignaciones pausadas y {operations.market.pendingIdentity} propiedades con identidad pendiente.</p></div></div></section>
    </>}
  </main>
}
