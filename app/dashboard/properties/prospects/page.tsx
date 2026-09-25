'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type Overview = {
  summary:{leads:number;active:number;overdue:number;valuations:number;won:number}
  performance:Array<{
    director:{director_key:string;full_name:string;role:string;office_name:string}
    leads:number;active:number;qualified:number;valuationLeads:number;won:number;lost:number;overdue:number
    conversionPct:number|null;valuationRatePct:number|null;avgFirstContactHours:number|null;avgWonCycleDays:number|null
  }>
  leads:Array<any>
  candidates:Array<any>
  generatedAt:string
}

const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
function pct(v:number|null){return v==null?'—':`${nf.format(v)}%`}
function date(v:string|null|undefined){return v?new Date(v).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'}):'—'}
const STATUS:Record<string,string>={new:'Nuevo',assigned:'Asignado',contacting:'Contacto',qualified:'Calificado',valuation:'Valorización',proposal:'Propuesta',won:'Ganado',lost:'Perdido',archived:'Archivado'}

export default function ProspectManagementPage(){
  const [data,setData]=useState<Overview|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  async function load(){
    setLoading(true);setError(false)
    try{
      const res=await fetch('/api/prospects/overview',{cache:'no-store'})
      if(!res.ok) throw new Error()
      setData(await res.json())
    }catch{setError(true)}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  if(loading)return <WorkspaceShell><OperationalState kind="loading" title="Cargando prospección" description="Resolviendo publicaciones, territorio, seguimiento y valorizaciones." /></WorkspaceShell>
  if(error||!data)return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar la prospección" description="La sección requiere acceso de dirección o administración." action={{label:'Propiedades',href:'/dashboard/properties'}} /></WorkspaceShell>

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Propiedades · Prospección"
      title="Leads por barrio y dirección"
      meta={`Corte ${date(data.generatedAt)} · publicación → lead → valorización → outcome`}
      actions={[
        {label:'Propiedades',href:'/dashboard/properties',icon:<ArrowLeft size={14}/>},
        {label:'Actualizar',onClick:()=>void load(),icon:<RefreshCw size={14}/>}
      ]}
    />

    <MetricStrip items={[
      {label:'Leads',value:data.summary.leads},
      {label:'Activos',value:data.summary.active},
      {label:'Seguimientos vencidos',value:data.summary.overdue,tone:data.summary.overdue?'warning':'success'},
      {label:'Con valorización',value:data.summary.valuations},
      {label:'Ganados',value:data.summary.won,tone:data.summary.won?'success':'default'},
    ]}/>

    <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Rendimiento</p><h2 className="mt-1 text-lg font-medium">Por director/a</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[var(--n3-line)] text-left text-xs text-[var(--n3-text-muted)]"><tr><th className="p-3">Director/a</th><th className="p-3">Leads</th><th className="p-3">Activos</th><th className="p-3">Valorizados</th><th className="p-3">Ganados</th><th className="p-3">Conv.</th><th className="p-3">Lead→Val.</th><th className="p-3">1er contacto</th><th className="p-3">Ciclo ganado</th><th className="p-3">Vencidos</th></tr></thead>
          <tbody className="divide-y divide-[var(--n3-line)]">
            {data.performance.map(row=><tr key={row.director.director_key}>
              <td className="p-3"><strong>{row.director.full_name}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.director.office_name}</p></td>
              <td className="p-3">{row.leads}</td><td className="p-3">{row.active}</td><td className="p-3">{row.valuationLeads}</td><td className="p-3">{row.won}</td>
              <td className="p-3">{pct(row.conversionPct)}</td><td className="p-3">{pct(row.valuationRatePct)}</td>
              <td className="p-3">{row.avgFirstContactHours==null?'—':`${nf.format(row.avgFirstContactHours)} h`}</td>
              <td className="p-3">{row.avgWonCycleDays==null?'—':`${nf.format(row.avgWonCycleDays)} d`}</td>
              <td className="p-3">{row.overdue}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="mt-8">
      <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Pipeline</p><h2 className="mt-1 text-lg font-medium">Seguimiento activo</h2></div><span className="text-xs text-[var(--n3-text-muted)]">{data.leads.length} registros</span></div>
      <div className="divide-y divide-[var(--n3-line)]">
        {data.leads.map((lead:any)=><Link key={lead.id} href={`/dashboard/properties/${lead.property_id}`} className="grid gap-2 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1.4fr)_180px_150px_150px] sm:items-center">
          <div><strong className="text-sm">{lead.property?.normalized_address||'Propiedad'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{lead.neighborhood?.name||'Sin barrio'} · {lead.director?.full_name||'Sin director/a'}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Estado</span><p className="mt-1">{STATUS[lead.status]||lead.status}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Valorizaciones</span><p className="mt-1">{lead.valuationCount}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Próximo seguimiento</span><p className={`mt-1 ${lead.overdue?'text-[#f0c96a]':''}`}>{date(lead.next_follow_up_at)}</p></div>
        </Link>)}
        {!data.leads.length?<p className="py-6 text-sm text-[var(--n3-text-muted)]">Aún no hay leads creados.</p>:null}
      </div>
    </section>

    <section className="mt-8">
      <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Publicadas</p><h2 className="mt-1 text-lg font-medium">Oportunidades aún no convertidas en lead</h2></div><span className="text-xs text-[var(--n3-text-muted)]">{data.candidates.length} visibles</span></div>
      <div className="divide-y divide-[var(--n3-line)]">
        {data.candidates.map((item:any)=><Link key={item.property.id} href={`/dashboard/properties/${item.property.id}`} className="grid gap-2 py-4 hover:bg-white/[0.02] sm:grid-cols-[minmax(0,1.5fr)_180px_180px_120px] sm:items-center">
          <div><strong className="text-sm">{item.property.normalized_address||'Propiedad'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.property.property_type||'—'} · publicación {date(item.listing.published_at||item.listing.observed_at)}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Barrio</span><p className="mt-1">{item.neighborhood?.name||'—'}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Director/a</span><p className={`mt-1 ${item.needsDirector ? 'text-[#f0c96a]' : ''}`}>{item.director?.full_name||'Sin asignar · abrir ficha'}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Precio</span><p className="mt-1">{item.listing.price_uf==null?'—':`UF ${Number(item.listing.price_uf).toLocaleString('es-CL')}`}</p></div>
        </Link>)}
        {!data.candidates.length?<p className="py-6 text-sm text-[var(--n3-text-muted)]">No hay publicaciones con barrio/director territorial pendientes de lead dentro del alcance actual.</p>:null}
      </div>
    </section>
  </WorkspaceShell>
}
