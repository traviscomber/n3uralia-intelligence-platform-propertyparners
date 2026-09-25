'use client'

import { useEffect,useMemo,useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft,RefreshCw } from 'lucide-react'
import { WorkspaceHeader,WorkspaceShell,DataStatusBar } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'
import { AugustBoardReading, type AugustBoardEntity } from '@/components/management/august-board-reading'

type Point={period:string;closings:number;salesUf:number;target:number|null;compliancePct:number|null;managementScore:number|null;portfolioScore:number|null;followUpScore:number|null;conversionScore:number|null;stock:number|null;activeLeads:number|null;requirements:number|null;scheduledVisits:number|null;realizedVisits:number|null;visitExecutionPct:number|null}
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

  <AugustBoardReading entity={data.augustBoard} sourceFile={data.authority.file} />

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
