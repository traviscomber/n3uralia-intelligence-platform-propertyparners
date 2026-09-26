import Link from 'next/link'
import { AlertTriangle, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { OperationalState } from '@/components/ui/operational-state'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { hasCapability } from '@/lib/access-control'
import { requireUserScope } from '@/lib/access-guards'
import { formatPropertyPartnersDate, propertyPartnersCalendarDayAge } from '@/lib/property-partners-time'

type QueueRow = {
  review_id: string | null
  source_listing_id: string
  raw_address: string | null
  title: string | null
  url: string | null
  classification: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: string
  reason: string
  can_decide: boolean
  observed_at: string | null
}

type TerritoryProgress = {
  portal_current_houses: number | null
  exact_kml_houses: number | null
  pending_unique_suggestions: number | null
  ambiguous_suggestions: number | null
  unmatched_houses: number | null
}

type AssignedProperty = {
  id: string
  assignment_role: string
  status: string
  assigned_at: string
  notes: string | null
  market_properties: Array<{
    id: string
    normalized_address: string | null
    property_type: string | null
    useful_area_m2: number | null
    built_area_m2: number | null
    bedrooms: number | null
    bathrooms: number | null
    parking_spaces: number | null
    identity_status: string | null
    last_seen_at: string | null
  }>
}

const RESOLUTION_LABELS: Record<string,string> = {
  accepted_memory:'Memoria territorial',
  point_in_kml:'Coordenada KML',
  direct_kml:'Coincidencia KML',
  unique_kml_candidate:'Candidato KML único',
  validated_rule:'Regla territorial validada',
  cbrs_street_consensus:'Consenso histórico CBRS',
  territorial_evidence:'Evidencia territorial cruzada',
  manual:'Sin resolución automática',
}

function n(value:number){return value.toLocaleString('es-CL')}
function formatDate(value:string|null){return value?formatPropertyPartnersDate(value):'—'}
function assignmentRole(value:string){if(value==='owner')return'Principal';if(value==='co_broker')return'Compartida';if(value==='support')return'Apoyo';return value}
function evidenceLabel(kind:string){return RESOLUTION_LABELS[kind]??'Evidencia territorial'}

function TerritoryExceptionCard({row}:{row:QueueRow}){
  return <article className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(210px,0.5fr)] lg:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff8d87]"><AlertTriangle size={12}/> Excepción territorial</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{evidenceLabel(row.resolution_kind)}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">{row.raw_address||row.title||'Dirección no disponible'}</p>
      {row.title&&row.raw_address?<p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.title}</p>:null}
      <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{row.reason}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
        <span>MLC-{row.source_listing_id}</span>
        {row.url?<Link href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">Ver aviso <ExternalLink size={12}/></Link>:null}
      </div>
    </div>
    <div className="border-l border-[var(--n3-line)] pl-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado</p>
      <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Pendiente de barrio</p>
      {row.proposed_neighborhood_name?<p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]"><MapPinned size={12} className="mt-0.5 shrink-0"/> Señal actual: {row.proposed_neighborhood_name}. No se publica hasta despejar el conflicto.</p>:null}
    </div>
  </article>
}

export default async function PropertiesPage(){
  const scope=await requireUserScope()
  const managerView=hasCapability(scope.role,'properties.global.assign')||hasCapability(scope.role,'properties.office.assign')

  if(managerView){
    const db=createServiceClient()
    const [queueResult,territoryResult]=await Promise.all([
      db.rpc('get_ceo_market_neighborhood_queue_v1'),
      db.rpc('get_market_house_territory_progress_v1').maybeSingle(),
    ])
    const rows=(queueResult.data??[]) as QueueRow[]
    const territory=territoryResult.data as TerritoryProgress|null
    const active=Number(territory?.portal_current_houses??0)
    const resolved=Number(territory?.exact_kml_houses??0)
    const errors=[queueResult.error,territoryResult.error].filter(Boolean)

    return <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Pilar 04 · Propiedades"
        title="Propiedades por resolver"
        meta={rows.length?`${rows.length} caso${rows.length===1?'':'s'} requiere${rows.length===1?'':'n'} intervención`:'Sin excepciones territoriales'}
        actions={[
          {label:'Leads',href:'/dashboard/properties/prospects'},
          {label:'Mercado',href:'/dashboard/market'},
        ]}
      />

      <MetricStrip items={[
        {label:'Casas observadas',value:n(active)},
        {label:'Barrio resuelto',value:n(resolved),tone:active>0&&resolved===active?'success':'default'},
        {label:'Por resolver',value:n(rows.length),tone:rows.length?'warning':'success'},
      ]}/>

      {errors.length?<div className="mt-5"><OperationalState kind="error" title="No fue posible consultar todo el estado territorial" description="La cola mantiene únicamente casos verificables; no se interpretan faltantes como cero."/></div>:null}

      <section className="mt-8">
        <div className="border-b border-[var(--n3-line)] pb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#ff8d87]">Sólo excepciones</p>
          <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Casos que el sistema no clasificó automáticamente por barrio</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Las propiedades con barrio resuelto salen de esta cola y continúan automáticamente hacia Leads/Ficha 360. Esta vista no funciona como inventario general.</p>
        </div>
        {rows.length?<div className="divide-y divide-[var(--n3-line)]">{rows.map(row=><TerritoryExceptionCard key={row.source_listing_id} row={row}/>)}</div>
          :<OperationalState compact kind="success" title="Cola territorial vacía" description="Todas las propiedades observadas con evidencia suficiente están clasificadas y continúan fuera de esta vista."/>}
      </section>

      <section className="mt-8 border-t border-[var(--n3-line)] pt-4">
        <div className="flex items-start gap-2 text-xs leading-5 text-[var(--n3-text-muted)]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--n3-accent)]"/>
          <p>Flujo operativo: Portal → identidad → barrio. Sólo si el barrio no puede resolverse con evidencia suficiente aparece aquí. Al resolverse, la propiedad deja esta cola y sigue a Leads según la autoridad territorial vigente.</p>
        </div>
      </section>

      <DataStatusBar
        cutoff="Corte live"
        coverage={active?`${resolved} de ${active} casas con barrio resuelto`:'Sin casas live verificables'}
        issues={rows.length+(errors.length?1:0)}
        status={errors.length?'blocked':rows.length?'partial':'ready'}
      />
    </WorkspaceShell>
  }

  const supabase=await createClient()
  const [observationResult,assignmentResult]=await Promise.all([
    supabase.from('market_current_listings').select('observed_at').order('observed_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('property_assignments')
      .select('id,assignment_role,status,assigned_at,notes,market_properties(id,normalized_address,property_type,useful_area_m2,built_area_m2,bedrooms,bathrooms,parking_spaces,identity_status,last_seen_at)')
      .eq('assigned_to',scope.profileId).eq('status','active').order('assigned_at',{ascending:false}),
  ])

  const assignments=(assignmentResult.data||[]) as AssignedProperty[]
  const latestObservation=observationResult.data?.observed_at??null
  const confirmedIdentity=assignments.filter(a=>a.market_properties[0]?.identity_status==='confirmed').length
  const pendingIdentity=assignments.length-confirmedIdentity
  const staleAssignments=assignments.filter(a=>{const p=a.market_properties[0];if(!p?.last_seen_at)return true;const age=propertyPartnersCalendarDayAge(p.last_seen_at);return age===null||age>7}).length
  const coverage=assignments.length?confirmedIdentity/assignments.length:null
  const dataStatus=assignmentResult.error?'blocked':assignments.length&&confirmedIdentity===assignments.length?'ready':'partial'

  return <WorkspaceShell>
    <WorkspaceHeader eyebrow="Propiedades" title="Mi cartera" meta={staleAssignments?`${staleAssignments} requieren verificar vigencia`:assignments.length?'Sin alertas de vigencia':'Sin asignaciones activas'} />
    <MetricStrip items={[
      {label:'Asignadas',value:n(assignments.length)},
      {label:'Identidad confirmada',value:n(confirmedIdentity),tone:assignments.length&&pendingIdentity===0?'success':'default'},
      {label:'Identidad pendiente',value:n(pendingIdentity),tone:pendingIdentity>0?'warning':'success'},
      {label:'Revisar vigencia',value:n(staleAssignments),tone:staleAssignments>0?'warning':'success'},
    ]}/>
    <section className="mt-7 max-w-6xl">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Propiedades asignadas</h2><span className="text-xs text-[var(--n3-text-muted)]">{assignments.length}</span></div>
      {assignmentResult.error?<OperationalState kind="error" title="No fue posible consultar la cartera" description="Reintente más tarde."/>:assignments.length?<div className="divide-y divide-[var(--n3-line)] border-y border-[var(--n3-line)]">{assignments.map(assignment=>{const property=assignment.market_properties[0]??null;const area=property?.useful_area_m2??property?.built_area_m2??null;const ageDays=property?.last_seen_at?propertyPartnersCalendarDayAge(property.last_seen_at):null;const freshness=ageDays===null?'Sin evidencia':ageDays===0?'Hoy':ageDays<=7?`${ageDays} d`:`Revisar · ${ageDays} d`;return <Link key={assignment.id} href={property?`/dashboard/properties/${property.id}`:'#'} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.4fr)_150px_150px_auto] md:items-center"><div><p className="text-sm font-semibold">{property?.normalized_address||'Sin dirección'}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{property?.property_type||'Sin tipo'}{property?.bedrooms!=null?` · ${property.bedrooms} dorm.`:''}{area!=null?` · ${area} m²`:''}</p></div><span className="text-xs text-[var(--n3-text-muted)]">{assignmentRole(assignment.assignment_role)}</span><span className={`text-xs ${ageDays===null||ageDays>7?'text-[#f0c96a]':'text-[var(--n3-text-muted)]'}`}>{freshness}</span><span className="text-xs font-semibold text-[var(--n3-teal-soft)]">Abrir</span></Link>})}</div>:<OperationalState kind="empty" title="Sin propiedades asignadas" description="No existen asignaciones activas para tu perfil."/>}
    </section>
    <details className="mt-8 max-w-6xl"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)]">Estado de datos</summary><DataStatusBar cutoff={formatDate(latestObservation)} coverage={assignments.length?`${confirmedIdentity} de ${assignments.length} asignaciones con identidad confirmada (${Math.round((coverage??0)*100)}%)`:'Sin asignaciones activas'} issues={(assignmentResult.error?1:0)+pendingIdentity+staleAssignments} status={dataStatus}/></details>
  </WorkspaceShell>
}
