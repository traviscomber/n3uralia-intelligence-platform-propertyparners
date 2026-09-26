'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { OperationalState } from '@/components/ui/operational-state'

type Overview = {
  directors:Array<{director_key:string;full_name:string;role:string;office_name:string}>
  territoryGroups:Array<{id:string;group_key:string;name:string}>
  permissions:{canBulkAssign:boolean}
  summary:{leads:number;active:number;overdue:number;valuations:number;won:number}
  performance:Array<{
    director:{director_key:string;full_name:string;role:string;office_name:string}
    leads:number;active:number;qualified:number;valuationLeads:number;won:number;lost:number;overdue:number
    conversionPct:number|null;valuationRatePct:number|null;avgFirstContactHours:number|null;avgWonCycleDays:number|null
  }>
  leads:Array<any>
  candidates:Array<any>
  territoryCoverage:Array<{
    neighborhood:{id:string;name:string;micro_neighborhood?:string|null}
    eligiblePublished:number
    leads:number
    unconverted:number
    director:{director_key:string;full_name:string;office_name:string}|null
    territory:{neighborhood_id:string;group_key:string;group_name:string;director_key:string}|null
    representativePropertyId:string|null
    needsGroup:boolean
    directorDriftLeads:number
  }>
  territorySummary:{
    neighborhoods:number
    mappedNeighborhoods:number
    unmappedNeighborhoods:number
    coveragePct:number|null
    eligiblePublished:number
    uncoveredPublished:number
    directorDriftLeads:number
    candidateUniverseTruncated:boolean
    candidateUniverseCount:number
  }
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
  const [territoryDraft,setTerritoryDraft]=useState<Record<string,string>>({})
  const [confirmMatrix,setConfirmMatrix]=useState(false)
  const [savingMatrix,setSavingMatrix]=useState(false)
  const [matrixMessage,setMatrixMessage]=useState<string|null>(null)

  async function load(){
    setLoading(true);setError(false)
    try{
      const res=await fetch('/api/prospects/overview',{cache:'no-store'})
      if(!res.ok) throw new Error()
      const payload=await res.json() as Overview
      setData(payload)
      setTerritoryDraft(Object.fromEntries(payload.territoryCoverage.map(row=>[
        row.neighborhood.id,
        row.territory?.group_key||'',
      ])))
    }catch{setError(true)}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const pendingTerritories=data?.territoryCoverage.filter(row=>row.needsGroup)||[]
  const selectedPending=pendingTerritories.filter(row=>Boolean(territoryDraft[row.neighborhood.id]))
  const activatableLeads=selectedPending.reduce((sum,row)=>sum+row.unconverted,0)

  async function saveTerritoryMatrix(){
    if(!data||!selectedPending.length||!confirmMatrix)return
    setSavingMatrix(true)
    setMatrixMessage(null)
    try{
      const assignments=selectedPending.map(row=>({
        neighborhoodId:row.neighborhood.id,
        groupKey:territoryDraft[row.neighborhood.id],
      }))
      const res=await fetch('/api/prospects/territory',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({assignments}),
      })
      const payload=await res.json()
      if(!res.ok)throw new Error(payload.error||'No fue posible guardar la matriz territorial.')
      const created=Number(payload?.result?.createdLeads??0)
      const reassigned=Number(payload?.result?.reassignedLeads??0)
      setMatrixMessage(`Matriz guardada. ${assignments.length} barrio${assignments.length===1?'':'s'} vinculado${assignments.length===1?'':'s'} a grupo · ${created} lead${created===1?'':'s'} creado${created===1?'':'s'} · ${reassigned} reasignado${reassigned===1?'':'s'}.`)
      setConfirmMatrix(false)
      await load()
    }catch(e){
      setMatrixMessage(e instanceof Error?e.message:'No fue posible guardar la matriz territorial.')
    }finally{
      setSavingMatrix(false)
    }
  }

  if(loading)return <WorkspaceShell><OperationalState kind="loading" title="Cargando prospección" description="Resolviendo publicaciones, territorio, seguimiento y valorizaciones." /></WorkspaceShell>
  if(error||!data)return <WorkspaceShell><OperationalState kind="error" title="No fue posible cargar la prospección" description="La sección requiere acceso de dirección o administración." action={{label:'Propiedades',href:'/dashboard/properties'}} /></WorkspaceShell>

  return <WorkspaceShell>
    <WorkspaceHeader
      eyebrow="Propiedades · Prospección"
      title="Leads por barrio y grupo territorial"
      meta={`Corte ${date(data.generatedAt)} · publicación → barrio → grupo → responsable vigente → lead`}
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
      <div className="flex flex-col gap-3 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Cobertura territorial</p>
          <h2 className="mt-1 text-lg font-medium">Matriz barrio → grupo territorial</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Los barrios se vinculan a Santa María, Lo Beltrán o Nueva Costanera. Las personas responsables se heredan desde el grupo vigente y pueden cambiar sin reclasificar propiedades.</p>
        </div>
        <span className="text-xs text-[var(--n3-text-muted)]">{pct(data.territorySummary.coveragePct)} de barrios agrupados</span>
      </div>

      <MetricStrip items={[
        {label:'Casas elegibles',value:data.territorySummary.eligiblePublished},
        {label:'Barrios agrupados',value:`${data.territorySummary.mappedNeighborhoods}/${data.territorySummary.neighborhoods}`},
        {label:'Casas por agrupar',value:data.territorySummary.uncoveredPublished,tone:data.territorySummary.uncoveredPublished?'warning':'success'},
        {label:'Leads con desalineación',value:data.territorySummary.directorDriftLeads,tone:data.territorySummary.directorDriftLeads?'warning':'success'},
      ]}/>

      {data.territorySummary.candidateUniverseTruncated ? <p className="mt-3 border border-[#a77a22] px-4 py-3 text-xs text-[#f6c453]">La cobertura está limitada a {data.territorySummary.candidateUniverseCount} casas del universo operativo. No se interpreta como cobertura completa.</p> : null}

      <div className="mt-5 border-y border-[var(--n3-line)]">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_110px_110px_minmax(240px,0.9fr)_160px] gap-4 border-b border-[var(--n3-line)] py-3 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] lg:grid">
          <span>Barrio</span><span>Publicadas</span><span>Leads</span><span>Grupo territorial</span><span>Responsable vigente</span>
        </div>
        {data.territoryCoverage.map(row=><div key={row.neighborhood.id} className="grid gap-3 border-b border-[var(--n3-line)] py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.4fr)_110px_110px_minmax(240px,0.9fr)_160px] lg:items-center">
          <div>
            <strong className="text-sm">{row.neighborhood.name}</strong>
            <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.neighborhood.micro_neighborhood || 'Barrio contractual'}</p>
          </div>
          <div><span className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)] lg:hidden">Publicadas · </span><span className="text-sm">{row.eligiblePublished}</span></div>
          <div><span className="text-[10px] uppercase tracking-[0.1em] text-[var(--n3-text-muted)] lg:hidden">Leads · </span><span className="text-sm">{row.leads}</span></div>
          <div>
            {row.needsGroup && data.permissions.canBulkAssign ? <select
              aria-label={`Grupo territorial para ${row.neighborhood.name}`}
              value={territoryDraft[row.neighborhood.id]||''}
              onChange={event=>setTerritoryDraft(current=>({...current,[row.neighborhood.id]:event.target.value}))}
              className="min-h-11 w-full border border-[var(--n3-line)] bg-black px-3 text-sm text-[var(--n3-text-light)] outline-none focus:border-[#d7332b]"
            >
              <option value="">Seleccionar grupo</option>
              {data.territoryGroups.map(group=><option key={group.group_key} value={group.group_key}>{group.name}</option>)}
            </select> : <div>
              <p className={`text-sm font-medium ${row.needsGroup?'text-[#f0c96a]':''}`}>{row.territory?.group_name||(row.needsGroup?'Sin grupo':'Asignado')}</p>
              <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.needsGroup?'Requiere confirmación territorial':'Grupo canónico vigente'}</p>
            </div>}
          </div>
          <div>
            {row.territory
              ? <div><p className="text-sm">{row.director?.full_name||'Sin responsable vigente'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.director?.office_name||row.territory.group_name}</p></div>
              : <p className="text-xs leading-5 text-[var(--n3-text-muted)]"><span className="font-semibold text-[var(--n3-text-light)]">{row.unconverted}</span> lead{row.unconverted===1?'':'s'} se activará{row.unconverted===1?'':'n'} al confirmar grupo</p>}
            {row.directorDriftLeads?<p className="mt-1 text-[11px] text-[#f0c96a]">{row.directorDriftLeads} lead(s) no coinciden con el responsable actual del grupo</p>:null}
          </div>
        </div>)}
        {!data.territoryCoverage.length?<p className="py-6 text-sm text-[var(--n3-text-muted)]">No hay casas publicadas elegibles con barrio canónico dentro del alcance actual.</p>:null}
      </div>

      {pendingTerritories.length && data.permissions.canBulkAssign ? <div className="mt-5 border border-[var(--n3-line)] bg-white/[0.015] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--n3-accent)]"/>
          <div className="flex-1">
            <p className="text-sm font-medium">Confirmación de matriz territorial</p>
            <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">Se guardará sólo barrio → grupo. La persona responsable no queda grabada en el barrio: se hereda del grupo vigente. La operación es atómica y crea o reasigna leads sólo después de una clasificación territorial confirmada.</p>
            <label className="mt-3 flex items-start gap-2 text-xs leading-5">
              <input type="checkbox" checked={confirmMatrix} onChange={event=>setConfirmMatrix(event.target.checked)} className="mt-1"/>
              <span>Confirmo que la selección barrio → Santa María / Lo Beltrán / Nueva Costanera corresponde a la estructura territorial vigente de Property Partners.</span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                disabled={!confirmMatrix||!selectedPending.length||savingMatrix}
                onClick={()=>void saveTerritoryMatrix()}
                className="min-h-10 bg-[#d7332b] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingMatrix?'Guardando…':`Confirmar ${selectedPending.length} barrio${selectedPending.length===1?'':'s'}`}
              </button>
              <span className="text-xs text-[var(--n3-text-muted)]">{activatableLeads} lead{activatableLeads===1?'':'s'} elegible{activatableLeads===1?'':'s'} se activará{activatableLeads===1?'':'n'}</span>
            </div>
            {matrixMessage?<p className="mt-3 text-xs leading-5 text-[var(--n3-text-light)]">{matrixMessage}</p>:null}
          </div>
        </div>
      </div> : pendingTerritories.length
        ? <div className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">La matriz territorial está pendiente. La asignación masiva requiere alcance global.</div>
        : <div className="mt-4 flex items-center gap-2 text-xs text-[var(--n3-accent)]"><CheckCircle2 size={14}/> Todos los barrios elegibles pertenecen a un grupo territorial.</div>}
    </section>

    <section className="mt-7">
      <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Rendimiento</p><h2 className="mt-1 text-lg font-medium">Por responsable vigente</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[var(--n3-line)] text-left text-xs text-[var(--n3-text-muted)]"><tr><th className="p-3">Responsable</th><th className="p-3">Leads</th><th className="p-3">Activos</th><th className="p-3">Valorizados</th><th className="p-3">Ganados</th><th className="p-3">Conv.</th><th className="p-3">Lead→Val.</th><th className="p-3">1er contacto</th><th className="p-3">Ciclo ganado</th><th className="p-3">Vencidos</th></tr></thead>
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
          <div><strong className="text-sm">{lead.property?.normalized_address||'Propiedad'}</strong><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{lead.neighborhood?.name||'Sin barrio'} · {lead.territory?.group_name||'Sin grupo'} · {lead.director?.full_name||'Sin responsable'}</p></div>
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
          <div><span className="text-xs text-[var(--n3-text-muted)]">Grupo</span><p className={`mt-1 ${item.needsGroup ? 'text-[#f0c96a]' : ''}`}>{item.territory?.group_name||'Sin agrupar'}</p></div>
          <div><span className="text-xs text-[var(--n3-text-muted)]">Precio</span><p className="mt-1">{item.listing.price_uf==null?'—':`UF ${Number(item.listing.price_uf).toLocaleString('es-CL')}`}</p></div>
        </Link>)}
        {!data.candidates.length?<p className="py-6 text-sm text-[var(--n3-text-muted)]">No hay publicaciones con territorio pendiente dentro del alcance actual.</p>:null}
      </div>
    </section>
  </WorkspaceShell>
}
