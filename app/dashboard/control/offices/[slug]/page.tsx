'use client'

import { useEffect,useMemo,useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft,RefreshCw } from 'lucide-react'
import { MetricStrip,WorkspaceHeader,WorkspaceShell,DataStatusBar } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type Point={period:string;closings:number;salesUf:number;target:number|null;compliancePct:number|null;managementScore:number|null;portfolioScore:number|null;followUpScore:number|null;conversionScore:number|null;stock:number|null;activeLeads:number|null;requirements:number|null;scheduledVisits:number|null;realizedVisits:number|null;visitExecutionPct:number|null}
type AugustBoardEntity={
  name:string
  classification:string
  sale:{closings:number;closingTarget:number;closingCompliancePct:number;salesUf:number;salesUfTarget:number;salesUfCompliancePct:number}
  ytd:{closings:number;closingTarget:number;closingCompliancePct:number;salesUf:number;salesUfTarget:number;salesUfCompliancePct:number}
  scores:{management:number;portfolio:number;followUp:number;conversion:number}
  indicators:{
    portfolio:{stock:number;stockTarget:number;stockCompliancePct:number;requirements:number;requirementsExpected:number;requirementsCompliancePct:number;pricing:{lte105:number;lte110:number;gt110:number;score:number}}
    followUp:{classified:number;active:number;activeA:number;stale90:number;stale90Pct:number;staleA15:number;staleA15Pct:number}
    conversion:{realizedVisits:number;visitTarget:number;visitTargetPct:number;scheduledVisits:number;visitExecutionPct:number;tc6mPct:number}
  }
  subscores:{
    portfolio:{metaPortfolio:number;requirementsByType:number;priceQuality:number}
    followUp:{classifiedLeads:number;managed90:number;managedA15:number}
    conversion:{visitsToTarget:number;visitExecution:number;tc6m:number}
  }
  scoreEvolution:{management:number[];portfolio:number[];followUp:number[];conversion:number[]}
  subscoreEvolution:{
    portfolio:{metaPortfolio:number[];requirementsByType:number[];priceQuality:number[]}
    followUp:{classifiedLeads:number[];managed90:number[];managedA15:number[]}
    conversion:{visitsToTarget:number[];visitExecution:number[];tc6m:number[]}
  }
}
type Payload={
 office:{name:string;slug:string}
 augustBoard:AugustBoardEntity
 authority:{file:string;sha256:string;period:string}
 latest:Point
 previous:Point|null
 series:Point[]
 directors:Array<{director_key:string;full_name:string;role:string;office_name:string}>
 territories:Array<{id:string;neighborhood:{id:string;name:string}|null;director:{full_name:string}|null;valid_from:string}>
 prospecting:{leads:number;active:number;overdue:number;valued:number;won:number;lost:number;conversionPct:number|null;valuationRatePct:number|null;avgFirstContactHours:number|null;avgWonCycleDays:number|null}
 signals:Array<{key:string;severity:string;label:string;detail:string}>
 historicalContext:{available:boolean;scope:string;note:string;totals:{sales:number;salesUf:number;leads:number;requirements:number;scheduledVisits:number;realizedVisits:number}}
 generatedAt:string
}

const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const n0=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0})
const n=(v:number|null|undefined,d=0)=>v==null?'—':(d?nf:n0).format(v)
const pct=(v:number|null|undefined)=>v==null?'—':`${nf.format(v)}%`
const delta=(a:number|null|undefined,b:number|null|undefined)=>a!=null&&b!=null? a-b:null
const signed=(v:number|null)=>v==null?'—':`${v>0?'+':''}${nf.format(v)}`

export default function Office360Page(){
 const params=useParams<{slug:string}>()
 const slug=String(params?.slug??'')
 const [data,setData]=useState<Payload|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState(false)

 async function load(){
  setLoading(true);setError(false)
  try{
   const r=await fetch(`/api/management/offices/${encodeURIComponent(slug)}`,{cache:'no-store'})
   if(!r.ok) throw new Error()
   setData(await r.json())
  }catch{setError(true)}finally{setLoading(false)}
 }
 useEffect(()=>{if(slug)void load()},[slug])
 const trends=useMemo(()=>data?.series??[],[data])

 if(loading)return <WorkspaceShell><OperationalState kind="loading" title="Cargando Office 360" description="Reconstruyendo serie de gestión, operación y prospección." /></WorkspaceShell>
 if(error||!data)return <WorkspaceShell><OperationalState kind="error" title="No fue posible abrir Office 360" description="Verifica el alcance de la oficina y la fuente canónica." action={{label:'Control',href:'/dashboard/control'}} /></WorkspaceShell>

 const l=data.latest,p=data.previous
 const managementDelta=delta(l.managementScore,p?.managementScore)
 const closingsDelta=delta(l.closings,p?.closings)
 const critical=data.signals.filter(s=>s.severity==='critical').length

 return <WorkspaceShell>
  <WorkspaceHeader
   eyebrow="Office 360 · Control de gestión"
   title={data.office.name}
   meta={`${data.authority.period} · autoridad ${data.authority.file}`}
   actions={[
    {label:'Control',href:'/dashboard/control',icon:<ArrowLeft size={14}/>},
    {label:'Prospección',href:'/dashboard/properties/prospects'},
    {label:'Actualizar',onClick:()=>void load(),icon:<RefreshCw size={14}/>}
   ]}
  />

  <MetricStrip items={[
   {label:'Cierres acreditados',value:n(l.closings,1),detail:`Meta ${n(l.target,1)} · Δ mes ${signed(closingsDelta)}`,tone:l.compliancePct!=null&&l.compliancePct>=100?'success':l.compliancePct!=null&&l.compliancePct>=90?'warning':'danger'},
   {label:'Cumplimiento',value:pct(l.compliancePct)},
   {label:'Calidad gestión',value:n(l.managementScore,1),detail:`Δ mes ${signed(managementDelta)} pts`,tone:l.managementScore!=null&&l.managementScore>=70?'success':'warning'},
   {label:'Seguimiento',value:n(l.followUpScore,1),tone:l.followUpScore!=null&&l.followUpScore>=70?'success':'warning'},
   {label:'Conversión',value:n(l.conversionScore,1),tone:l.conversionScore!=null&&l.conversionScore>=70?'success':'warning'},
  ]}/>

  <section className="mt-6">
   <div className="border-b border-[var(--n3-line)] pb-3">
    <p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Cierre Agosto · según Directorio</p>
    <h2 className="mt-1 text-lg font-medium">Venta Ago y acumulado Ene–Ago</h2>
   </div>
   <div className="mt-3 grid gap-px bg-[var(--n3-line)] md:grid-cols-4">
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Venta Ago</span><strong className="mt-2 block text-xl">{n(data.augustBoard.sale.closings,1)} cierres</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{n(data.augustBoard.sale.salesUf)} UF</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Cumplimiento Ago</span><strong className="mt-2 block text-xl">{pct(data.augustBoard.sale.closingCompliancePct)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{pct(data.augustBoard.sale.salesUfCompliancePct)} UF</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Acumulado Ene–Ago</span><strong className="mt-2 block text-xl">{n(data.augustBoard.ytd.closings,1)} cierres</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{n(data.augustBoard.ytd.salesUf)} UF</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Cumplimiento acumulado</span><strong className="mt-2 block text-xl">{pct(data.augustBoard.ytd.closingCompliancePct)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{pct(data.augustBoard.ytd.salesUfCompliancePct)} UF</p></div>
   </div>
  </section>

  <section className="mt-7">
   <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Scores Ago</p><h2 className="mt-1 text-lg font-medium">{data.augustBoard.classification}</h2></div>
   <div className="mt-3 grid gap-px bg-[var(--n3-line)] sm:grid-cols-4">
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Calidad Gestión</span><strong className="mt-2 block text-xl">{n(data.augustBoard.scores.management,1)}</strong></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Cartera · 40%</span><strong className="mt-2 block text-xl">{n(data.augustBoard.scores.portfolio,1)}</strong></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Seguimiento · 30%</span><strong className="mt-2 block text-xl">{n(data.augustBoard.scores.followUp,1)}</strong></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Conversión · 30%</span><strong className="mt-2 block text-xl">{n(data.augustBoard.scores.conversion,1)}</strong></div>
   </div>
  </section>

  <section className="mt-7">
   <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Indicadores Ene–Ago</p><h2 className="mt-1 text-lg font-medium">Qué explica el score</h2></div>
   <div className="mt-3 grid gap-5 xl:grid-cols-3">
    <div className="border-t border-[var(--n3-line)] pt-3">
     <h3 className="text-sm font-semibold">Calidad de Cartera</h3>
     <div className="mt-3 space-y-3 text-sm">
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Cartera actual</span><strong>{n(data.augustBoard.indicators.portfolio.stock)} / {n(data.augustBoard.indicators.portfolio.stockTarget)} · {pct(data.augustBoard.indicators.portfolio.stockCompliancePct)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Requerimientos</span><strong>{n(data.augustBoard.indicators.portfolio.requirements)} / {n(data.augustBoard.indicators.portfolio.requirementsExpected)} · {pct(data.augustBoard.indicators.portfolio.requirementsCompliancePct)}</strong></div>
      <div><span className="text-[var(--n3-text-muted)]">Pricing</span><p className="mt-1 font-medium">≤1.05: {n(data.augustBoard.indicators.portfolio.pricing.lte105)} · ≤1.10: {n(data.augustBoard.indicators.portfolio.pricing.lte110)} · &gt;1.10: {n(data.augustBoard.indicators.portfolio.pricing.gt110)}</p></div>
     </div>
    </div>
    <div className="border-t border-[var(--n3-line)] pt-3">
     <h3 className="text-sm font-semibold">Calidad de Seguimiento</h3>
     <div className="mt-3 space-y-3 text-sm">
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Leads clasif./activos</span><strong>{n(data.augustBoard.indicators.followUp.classified)} / {n(data.augustBoard.indicators.followUp.active)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Leads sin gestión 90d</span><strong>{n(data.augustBoard.indicators.followUp.stale90)} · {pct(data.augustBoard.indicators.followUp.stale90Pct)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Leads A sin gestión 15d</span><strong>{n(data.augustBoard.indicators.followUp.staleA15)} / {n(data.augustBoard.indicators.followUp.activeA)} · {pct(data.augustBoard.indicators.followUp.staleA15Pct)}</strong></div>
     </div>
    </div>
    <div className="border-t border-[var(--n3-line)] pt-3">
     <h3 className="text-sm font-semibold">Calidad de Conversión</h3>
     <div className="mt-3 space-y-3 text-sm">
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Visitas realizadas</span><strong>{n(data.augustBoard.indicators.conversion.realizedVisits)} / {n(data.augustBoard.indicators.conversion.visitTarget)} · {pct(data.augustBoard.indicators.conversion.visitTargetPct)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">Realizadas / agendadas</span><strong>{n(data.augustBoard.indicators.conversion.realizedVisits)} / {n(data.augustBoard.indicators.conversion.scheduledVisits)} · {pct(data.augustBoard.indicators.conversion.visitExecutionPct)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-[var(--n3-text-muted)]">TC 6 meses</span><strong>{pct(data.augustBoard.indicators.conversion.tc6mPct)}</strong></div>
     </div>
    </div>
   </div>
  </section>

  <section className="mt-7">
   <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Subscores Agosto</p><h2 className="mt-1 text-lg font-medium">Las nueve palancas del modelo</h2></div>
   <div className="mt-3 grid gap-5 xl:grid-cols-3">
    <div className="border-t border-[var(--n3-line)] pt-3 text-sm"><h3 className="font-semibold">Cartera</h3><p className="mt-2 text-[var(--n3-text-muted)]">Meta cartera <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.portfolio.metaPortfolio,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">Reqs x Tipo Prop <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.portfolio.requirementsByType,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">Calidad Precio <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.portfolio.priceQuality,1)}</strong></p></div>
    <div className="border-t border-[var(--n3-line)] pt-3 text-sm"><h3 className="font-semibold">Seguimiento</h3><p className="mt-2 text-[var(--n3-text-muted)]">% Leads Clasif <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.followUp.classifiedLeads,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">% Leads c-g90 <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.followUp.managed90,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">%LeadsA c-g15 <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.followUp.managedA15,1)}</strong></p></div>
    <div className="border-t border-[var(--n3-line)] pt-3 text-sm"><h3 className="font-semibold">Conversión</h3><p className="mt-2 text-[var(--n3-text-muted)]">Vis Realiz/Meta <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.conversion.visitsToTarget,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">%Vis realizad/agend <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.conversion.visitExecution,1)}</strong></p><p className="mt-2 text-[var(--n3-text-muted)]">TC 6m/leads tot <strong className="float-right text-[var(--n3-text-light)]">{n(data.augustBoard.subscores.conversion.tc6m,1)}</strong></p></div>
   </div>
  </section>

  <section className="mt-6 grid gap-px bg-[var(--n3-line)] md:grid-cols-4">
   <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Cartera</span><strong className="mt-2 block text-xl">{n(l.stock)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Score {n(l.portfolioScore,1)}</p></div>
   <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Leads activos</span><strong className="mt-2 block text-xl">{n(l.activeLeads)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Requerimientos {n(l.requirements)}</p></div>
   <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Visitas</span><strong className="mt-2 block text-xl">{n(l.realizedVisits)} / {n(l.scheduledVisits)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{pct(l.visitExecutionPct)} ejecución</p></div>
   <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">UF acreditadas</span><strong className="mt-2 block text-xl">{n(l.salesUf)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Fuente Pedro · Directorio</p></div>
  </section>

  <section className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
   <div>
    <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Evolución Ene–Ago</p><h2 className="mt-1 text-lg font-medium">Resultado y calidad</h2></div>
    <div className="mt-3 overflow-x-auto">
     <table className="w-full min-w-[760px] text-sm">
      <thead className="border-b border-[var(--n3-line)] text-left text-xs text-[var(--n3-text-muted)]"><tr><th className="p-3">Mes</th><th className="p-3">Cierres</th><th className="p-3">Meta</th><th className="p-3">Cumpl.</th><th className="p-3">Gestión</th><th className="p-3">Cartera</th><th className="p-3">Seguim.</th><th className="p-3">Conv.</th></tr></thead>
      <tbody className="divide-y divide-[var(--n3-line)]">{trends.map(row=><tr key={row.period}><td className="p-3 font-medium">{row.period}</td><td className="p-3">{n(row.closings,1)}</td><td className="p-3">{n(row.target,1)}</td><td className="p-3">{pct(row.compliancePct)}</td><td className="p-3">{n(row.managementScore,1)}</td><td className="p-3">{n(row.portfolioScore,1)}</td><td className="p-3">{n(row.followUpScore,1)}</td><td className="p-3">{n(row.conversionScore,1)}</td></tr>)}</tbody>
     </table>
    </div>
   </div>

   <div>
    <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Qué requiere atención</p><h2 className="mt-1 text-lg font-medium">{critical? `${critical} críticas` : `${data.signals.length} señales`}</h2></div>
    <div className="divide-y divide-[var(--n3-line)]">{data.signals.length?data.signals.map(signal=><div key={signal.key} className="py-3"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 rounded-full ${signal.severity==='critical'?'bg-[var(--primary)]':'bg-[#f0c96a]'}`}/><div><strong className="text-sm">{signal.label}</strong><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{signal.detail}</p></div></div></div>):<p className="py-4 text-sm text-[var(--n3-text-muted)]">Sin alertas calculables en el corte vigente.</p>}</div>
   </div>
  </section>

  <section className="mt-8">
   <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Prospección actual</p><h2 className="mt-1 text-lg font-medium">Publicación → lead → valorización → resultado</h2></div>
   <div className="mt-3 grid gap-px bg-[var(--n3-line)] sm:grid-cols-4">
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Leads</span><strong className="mt-2 block text-xl">{data.prospecting.leads}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.prospecting.active} activos · {data.prospecting.overdue} vencidos</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Lead → valorización</span><strong className="mt-2 block text-xl">{pct(data.prospecting.valuationRatePct)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.prospecting.valued} valorizados</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">Conversión lead</span><strong className="mt-2 block text-xl">{pct(data.prospecting.conversionPct)}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{data.prospecting.won} ganados · {data.prospecting.lost} perdidos</p></div>
    <div className="bg-[var(--n3-deep)] p-4"><span className="text-xs text-[var(--n3-text-muted)]">1er contacto</span><strong className="mt-2 block text-xl">{data.prospecting.avgFirstContactHours==null?'—':`${n(data.prospecting.avgFirstContactHours,1)} h`}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Ciclo ganado {data.prospecting.avgWonCycleDays==null?'—':`${n(data.prospecting.avgWonCycleDays,1)} d`}</p></div>
   </div>
  </section>

  <section className="mt-8 grid gap-6 lg:grid-cols-2">
   <div>
    <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Territorio</p><h2 className="mt-1 text-lg font-medium">Director/a y barrios</h2></div>
    <div className="mt-3">{data.directors.map(d=><div key={d.director_key} className="border-b border-[var(--n3-line)] py-3"><strong className="text-sm">{d.full_name}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{d.role==='director'?'Director/a':'Subdirector/a'} · {data.territories.filter(t=>t.director?.full_name===d.full_name).length} barrios asignados</p></div>)}</div>
    <Link href="/dashboard/properties/prospects" className="mt-4 inline-flex text-xs font-semibold text-[var(--n3-teal-soft)]">Gestionar territorio y leads →</Link>
   </div>
   <div>
    <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[.16em] text-[var(--n3-text-muted)]">Fuente</p><h2 className="mt-1 text-lg font-medium">Directorio Agosto</h2></div>
    <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">La lectura principal de esta ficha replica la estructura y los indicadores de Ago_Directorio.pptx. El histórico 2025 queda como evidencia secundaria y no reemplaza el cierre agosto.</p>
    <div className="mt-4 text-xs text-[var(--n3-text-muted)]">SHA-256 · {data.authority.sha256}</div>
   </div>
  </section>

  <DataStatusBar cutoff={data.authority.period} coverage={`Serie Pedro ${data.series.length} meses · ${data.territories.length} barrios asignados`} issues={data.signals.length} status={critical?'partial':'ready'} />
 </WorkspaceShell>
}
