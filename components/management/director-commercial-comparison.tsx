'use client'

import { useEffect, useState } from 'react'
import { MethodologyNote, MetricCard, MetricGrid, SectionHeading } from '@/components/intelligence/design-system'

type Metric={code:string;unit:string;value:number|null;yoy:number|null;comparisonValue?:number|null;comparisonPeriod?:string|null;methodology?:string;qualityNotes?:string[]}
type Entity={name:string;entityType:string;metrics:Metric[]}
type Payload={scopeLabel:string;periodLabel:string;entities:Entity[];dataProvenance?:string}

const metric=(entity:Entity|undefined,code:string)=>entity?.metrics.find((item)=>item.code===code)
const fmt=(item?:Metric)=>!item||item.value==null?'n/d':item.unit==='uf'?`${item.value.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.value.toLocaleString('es-CL',{maximumFractionDigits:1})
const base=(item?:Metric)=>item?.comparisonValue==null?'Base 2025 n/d':`Base 2025: ${item.unit==='uf'?`${item.comparisonValue.toLocaleString('es-CL',{maximumFractionDigits:0})} UF`:item.comparisonValue.toLocaleString('es-CL',{maximumFractionDigits:1})}`
const pct=(value:number|null|undefined)=>value==null?'n/d':`${value>0?'+':''}${value.toFixed(1)}%`

export function DirectorCommercialComparison(){
 const [payload,setPayload]=useState<Payload|null>(null)
 const [error,setError]=useState<string|null>(null)
 useEffect(()=>{void(async()=>{try{const response=await fetch('/api/management/summary',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'No fue posible cargar la comparación comercial.');setPayload(data)}catch(cause){setError(cause instanceof Error?cause.message:'Error de comparación')}})()},[])
 const branch=payload?.entities.find((entity)=>entity.entityType==='branch')
 if(error)return <div role="alert" className="mx-4 mb-5 border border-[#d7332b] p-4 text-sm text-[#ff766f] lg:mx-8">{error}</div>
 if(!payload||!branch)return <div role="status" className="mx-4 mb-5 border border-[var(--n3-line)] p-4 text-sm text-[var(--n3-text-muted)] lg:mx-8">Cargando comparación 2025–2026…</div>
 const sales=metric(branch,'sales'),uf=metric(branch,'sales_uf'),cum=metric(branch,'cumulative_sales'),cumUf=metric(branch,'cumulative_sales_uf'),stock=metric(branch,'stock'),movement=metric(branch,'portfolio_net_change')
 const notes=[...(sales?.qualityNotes??[]),...(uf?.qualityNotes??[]),...(cum?.qualityNotes??[]),...(cumUf?.qualityNotes??[])]
 return <section className="mx-4 mb-6 lg:mx-8"><SectionHeading eyebrow="Comparación canónica" title="2026 versus 2025" description={`Base del mismo período anterior para ${payload.scopeLabel}.`}/><MetricGrid columns={4}><MetricCard label="Cierres junio · YoY" value={pct(sales?.yoy)} detail={`${fmt(sales)} · ${base(sales)}`}/><MetricCard label="UF junio · YoY" value={pct(uf?.yoy)} detail={`${fmt(uf)} · ${base(uf)}`}/><MetricCard label="Cierres acumulados · YoY" value={pct(cum?.yoy)} detail={`${fmt(cum)} · ${base(cum)}`}/><MetricCard label="UF acumuladas · YoY" value={pct(cumUf?.yoy)} detail={`${fmt(cumUf)} · ${base(cumUf)}`}/><MetricCard label="Cartera actual" value={fmt(stock)} detail={stock?.comparisonValue==null?'Corte anterior n/d':`Mayo 2026: ${stock.comparisonValue.toLocaleString('es-CL')}`}/><MetricCard label="Movimiento neto cartera" value={fmt(movement)} detail={`${pct(movement?.yoy)} mayo–junio; no equivale a captaciones`}/><MetricCard label="Captaciones brutas" value="n/d" detail="No existe métrica explícita separada de altas, bajas y ventas"/><MetricCard label="Control de calidad" value={notes.length?`${notes.length} observación(es)`:'Consistente'} detail={notes[0]??'YoY recalculado coincide con Δ% AA dentro de tolerancia'}/></MetricGrid><MethodologyNote>{payload.dataProvenance} El YoY se recalcula desde valores base 2025 y se contrasta con el Δ% AA informado. El movimiento de cartera es neto y no se presenta como captaciones.</MethodologyNote></section>
}
