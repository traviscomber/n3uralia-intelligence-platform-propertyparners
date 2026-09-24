'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileCheck2, History, Send, ShieldCheck, XCircle } from 'lucide-react'

type ValuationCase = {
  id:string; status:string; address:string|null; neighborhood:string|null; property_type:string|null
  land_area_m2:number|null; built_area_m2:number|null; useful_area_m2:number|null; terrace_area_m2:number|null
  bedrooms:number|null; bathrooms:number|null; parking_spaces:number|null; construction_year:number|null
  estimated_value_uf:number|null; low_value_uf:number|null; high_value_uf:number|null; confidence:string|null
  methodology_version:string; version_number:number; justification:string|null; evidence?:{ warnings?:string[] }|null
}
type Comparable = {
  id:string; rank:number; source_type:string|null; source_reference:string|null; address:string|null; neighborhood:string|null
  property_type:string|null; transaction_date:string|null; source_observed_at:string|null; price_uf:number|null; price_uf_m2:number|null
  built_area_m2:number|null; land_area_m2:number|null; useful_area_m2:number|null; total_area_m2:number|null
  bedrooms:number|null; bathrooms:number|null; parking_spaces:number|null
  similarity_score:number; distance_meters:number|null; selected:boolean; match_status:string; adjustment_pct:number
  adjusted_value_uf:number|null; adjustment_notes:string|null; exclusion_reason:string|null; contradictions?:string[]|null
}
type Decision = { id:string; action:string; reason:string|null; created_at:string }
type Permissions = { canEditComparables:boolean; canApprove:boolean; canIssue:boolean }
type Payload = { valuationCase:ValuationCase; comparables:Comparable[]; decisions:Decision[]; permissions:Permissions; error?:string }

const nf = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:0 })
const n1 = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:1 })
const statusLabels:Record<string,string> = { draft:'Borrador',review:'En revisión',approved:'Aprobada',issued:'Emitida' }
const confidenceLabels:Record<string,string> = { low:'Baja',medium:'Media',high:'Alta' }
const matchStatusLabels:Record<string,string> = { accepted:'Aceptado',rejected:'Excluido',candidate_high:'Candidato alto',candidate_medium:'Candidato medio',pending:'Pendiente' }
const decisionLabels:Record<string,string> = {
  comparable_selected:'Comparable aceptado',
  comparable_excluded:'Comparable excluido',
  submitted_for_review:'Enviada a revisión',
  approved:'Valorización aprobada',
  issued:'Valorización emitida',
  rejected:'Devuelta para corrección',
  created:'Expediente creado',
  valuation_created:'Expediente creado',
}
function uf(value:number|null){ return value == null ? '—' : `UF ${nf.format(value)}` }
function resultLabel(status:string){ return status === 'issued' ? 'Valor emitido' : status === 'approved' ? 'Valor aprobado' : 'Estimación preliminar' }
function decisionLabel(action:string){ return decisionLabels[action] || action.replaceAll('_',' ') }
function m2(value:number|null|undefined){ return value == null ? 'No informado' : `${n1.format(value)} m²` }
function effectiveHouseArea(built:number|null|undefined,land:number|null|undefined){
  if(built==null || land==null) return null
  return built + land / 4
}
function median(values:number[]){
  if(!values.length) return null
  const sorted=[...values].sort((a,b)=>a-b)
  const mid=Math.floor(sorted.length/2)
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2
}
function average(values:number[]){
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null
}
function pctDelta(value:number|null,base:number|null){
  return value!=null && base!=null && base!==0 ? ((value-base)/base)*100 : null
}
function pctLabel(value:number|null){
  return value==null ? '—' : `${value>=0?'+':''}${n1.format(value)}%`
}

export default function ValuationWorkspacePage(){
  const params = useParams<{id:string}>()
  const id = params.id
  const mutationLock = useRef(false)
  const [data,setData] = useState<Payload|null>(null)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState<string|null>(null)
  const [error,setError] = useState<string|null>(null)
  const [reason,setReason] = useState('')
  const [adjustments,setAdjustments] = useState<Record<string,string>>({})
  const [notes,setNotes] = useState<Record<string,string>>({})

  async function load(){
    setLoading(true); setError(null)
    try{
      const response = await fetch(`/api/valuations/${id}/comparables`,{ cache:'no-store' })
      const json = await response.json() as Payload
      if(!response.ok) throw new Error(json.error || 'No pudimos cargar la valorización')
      setData(json)
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de carga') }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ void load() },[id])

  const accepted = useMemo(()=>data?.comparables.filter(item=>item.selected && item.match_status==='accepted') ?? [],[data])
  const evidenceAlerts = useMemo(()=>data?.comparables.filter(item=>(item.contradictions?.length ?? 0)>0) ?? [],[data])
  const decisionMetrics = useMemo(()=>{
    if(!data?.valuationCase) return null
    const valuation=data.valuationCase
    const ufM2=accepted.map(item=>Number(item.price_uf_m2)).filter(Number.isFinite)
    const prices=accepted.map(item=>Number(item.price_uf)).filter(Number.isFinite)
    const distances=accepted.map(item=>Number(item.distance_meters)).filter(Number.isFinite)
    const medianUfM2=median(ufM2), averageUfM2=average(ufM2)
    const minUfM2=ufM2.length?Math.min(...ufM2):null, maxUfM2=ufM2.length?Math.max(...ufM2):null
    const effectiveArea=valuation.property_type==='Casa'
      ? effectiveHouseArea(valuation.built_area_m2,valuation.land_area_m2)
      : valuation.useful_area_m2!=null ? valuation.useful_area_m2 + (valuation.terrace_area_m2??0)/2 : null
    const estimated=valuation.estimated_value_uf==null?null:Number(valuation.estimated_value_uf)
    const impliedUfM2=estimated!=null && effectiveArea && effectiveArea>0 ? estimated/effectiveArea : null
    const avgPrice=average(prices), medianPrice=median(prices)
    const dispersionPct=medianUfM2 && minUfM2!=null && maxUfM2!=null ? ((maxUfM2-minUfM2)/medianUfM2)*100 : null
    const cbrsCount=accepted.filter(item=>item.source_type==='CBRS').length
    const offerCount=accepted.filter(item=>item.source_type==='Portal'||item.source_type==='TocToc').length
    const scenarios=estimated==null?[]:[0,5,10].map(margin=>({margin,price:estimated/(1-margin/100)}))
    return {
      effectiveArea,impliedUfM2,medianUfM2,averageUfM2,minUfM2,maxUfM2,
      avgPrice,medianPrice,dispersionPct,cbrsCount,offerCount,
      medianDistance:median(distances),
      deltaVsMedianUfM2:pctDelta(impliedUfM2,medianUfM2),
      deltaVsAverageUfM2:pctDelta(impliedUfM2,averageUfM2),
      deltaVsMedianPrice:pctDelta(estimated,medianPrice),
      scenarios,
    }
  },[accepted,data?.valuationCase])
  const caseWarnings = data?.valuationCase.evidence?.warnings ?? []

  async function comparableAction(comparableId:string,action:'select'|'exclude'){
    if(mutationLock.current)return
    mutationLock.current=true
    const busyKey=`comparable-${comparableId}-${action}`
    setBusy(busyKey); setError(null)
    try{
      const adjustmentPct = Number(adjustments[comparableId] || 0)
      if(!Number.isFinite(adjustmentPct) || adjustmentPct < -35 || adjustmentPct > 35) throw new Error('El ajuste documentado debe estar entre -35% y 35%.')
      const response = await fetch(`/api/valuations/${id}/comparables`,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({ action, comparableId, adjustmentPct, notes:notes[comparableId] || null, reason:notes[comparableId] || null })
      })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No pudimos actualizar el comparable')
      await load()
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de actualización') }
    finally{ mutationLock.current=false; setBusy(null) }
  }

  async function workflow(status:string){
    if(mutationLock.current)return
    if(status==='issued'){
      const valuation=data?.valuationCase
      const description=valuation?.address || 'esta propiedad'
      const value=uf(valuation?.estimated_value_uf ?? null)
      const confirmed=window.confirm(`¿Emitir la valorización de ${description} por ${value}? La emisión congela esta versión y su evidencia para entrega.`)
      if(!confirmed)return
    }
    mutationLock.current=true
    setBusy(`workflow-${status}`); setError(null)
    try{
      const response = await fetch(`/api/valuations/${id}/workflow`,{ method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ status, reason:reason.trim() || null }) })
      const json = await response.json()
      if(!response.ok){
        if(json?.error==='MFA_REQUIRED' && json?.mfaUrl){
          window.location.assign(`${json.mfaUrl}?next=${encodeURIComponent(`/dashboard/valuations/${id}`)}`)
          return
        }
        throw new Error(json.message || json.error || 'No pudimos cambiar el estado')
      }
      setReason(''); await load()
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de flujo') }
    finally{ mutationLock.current=false; setBusy(null) }
  }

  if(loading) return <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando expediente…</div>
  if(!data?.valuationCase) return <div className="border border-red-900 bg-red-950/30 p-8 text-sm text-red-200">{error || 'Valorización no encontrada o sin acceso.'}</div>
  const valuation = data.valuationCase
  const permissions = data.permissions
  const isPreliminary = valuation.status === 'draft' || valuation.status === 'review'

  return <div className="space-y-6 pb-10" aria-busy={busy!==null}>
    <header className="border-b border-[var(--n3-line)] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--n3-teal)]">Expediente de valorización</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">{valuation.address || 'Propiedad sin dirección'}</h1>
          <p className="mt-1 text-sm text-[var(--n3-text-muted)]">{valuation.property_type || 'Tipo no informado'} · {valuation.neighborhood || 'Barrio no informado'} · versión {valuation.version_number}</p>
        </div>
        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-3 text-sm text-[var(--n3-text-light)]">Estado: <span className="font-semibold uppercase text-[var(--n3-teal)]">{statusLabels[valuation.status] || valuation.status}</span></div>
      </div>
    </header>

    {error && <div role="alert" className="border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
    {valuation.status==='review' && permissions.canApprove && <section className="border border-[var(--n3-teal)] bg-[var(--n3-teal)]/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--n3-teal)]">DECISIÓN CEO</p>
          <p className="mt-1 text-sm text-[var(--n3-text-light)]">Este expediente está listo para decisión. Aprobar requiere MFA; devolver requiere una observación.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>void workflow('approved')} disabled={busy!==null} className="inline-flex min-h-11 items-center gap-2 bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4"/>{busy==='workflow-approved'?'Aprobando…':'Aprobar valorización'}</button>
          <button onClick={()=>void workflow('draft')} disabled={busy!==null || !reason.trim()} className="inline-flex min-h-11 items-center gap-2 border border-red-800 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><XCircle className="h-4 w-4"/>{busy==='workflow-draft'?'Devolviendo…':'Devolver con observación'}</button>
        </div>
      </div>
      <textarea disabled={busy!==null} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Observación para devolver o nota de aprobación" className="mt-3 min-h-20 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm text-[var(--n3-text-light)] disabled:opacity-60"/>
    </section>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Construidos</p><p className="mt-2 text-lg text-[var(--n3-text-light)]">{m2(valuation.built_area_m2)}</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Terreno</p><p className="mt-2 text-lg text-[var(--n3-text-light)]">{m2(valuation.land_area_m2)}</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Programa</p><p className="mt-2 text-lg text-[var(--n3-text-light)]">{valuation.bedrooms==null?'—':`${valuation.bedrooms}D`} · {valuation.bathrooms==null?'—':`${valuation.bathrooms}B`}</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Año</p><p className="mt-2 text-lg text-[var(--n3-text-light)]">{valuation.construction_year ?? 'No informado'}</p></div>
    </section>
    {isPreliminary && <div className="border border-amber-800/70 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">Resultado preliminar. No es publicable ni entregable hasta aprobación y emisión.</div>}
    {(caseWarnings.length>0 || evidenceAlerts.length>0) && <div className="border border-amber-700/70 bg-amber-950/20 p-4 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4"/>Control de evidencia activo</div>
      <div className="mt-2 space-y-1 text-xs text-amber-200">
        {caseWarnings.map((warning,index)=><p key={`case-${index}`}>{warning}</p>)}
        {evidenceAlerts.length>0 && <p>{evidenceAlerts.length} comparable{evidenceAlerts.length===1?'':'s'} con contradicción o anomalía pendiente. No pueden aceptarse hasta resolver la evidencia.</p>}
      </div>
    </div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[[resultLabel(valuation.status),uf(valuation.estimated_value_uf)],['Referencia persistida',valuation.low_value_uf===valuation.high_value_uf?uf(valuation.estimated_value_uf):`${uf(valuation.low_value_uf)} — ${uf(valuation.high_value_uf)}`],['Confianza',valuation.confidence ? (confidenceLabels[valuation.confidence] || valuation.confidence) : '—'],['Comparables aceptados',String(accepted.length)],['Alertas evidencia',String(evidenceAlerts.length)]].map(([label,value])=><div key={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
    </section>
    {decisionMetrics && <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
      <div className="border-b border-[var(--n3-line)] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--n3-teal)]">INSIGHTS PARA DECISIÓN</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Cómo se posiciona esta valorización frente a la evidencia seleccionada</h2>
        <p className="mt-1 text-sm text-[var(--n3-text-muted)]">Métricas descriptivas. No reemplazan la decisión profesional ni aplican ajustes automáticos.</p>
      </div>
      <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase text-[var(--n3-text-muted)]">Área comparable sujeto</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{m2(decisionMetrics.effectiveArea)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{valuation.property_type==='Casa'?'Construidos + terreno/4':'Útil + terraza/2'}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase text-[var(--n3-text-muted)]">UF/m² implícito</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{decisionMetrics.impliedUfM2==null?'—':`${n1.format(decisionMetrics.impliedUfM2)} UF/m²`}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">vs mediana {pctLabel(decisionMetrics.deltaVsMedianUfM2)}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase text-[var(--n3-text-muted)]">Mediana comparables</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{decisionMetrics.medianUfM2==null?'—':`${n1.format(decisionMetrics.medianUfM2)} UF/m²`}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Promedio {decisionMetrics.averageUfM2==null?'—':n1.format(decisionMetrics.averageUfM2)} UF/m²</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase text-[var(--n3-text-muted)]">Dispersión muestra</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{decisionMetrics.dispersionPct==null?'—':`${n1.format(decisionMetrics.dispersionPct)}%`}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{decisionMetrics.minUfM2==null?'—':n1.format(decisionMetrics.minUfM2)}–{decisionMetrics.maxUfM2==null?'—':n1.format(decisionMetrics.maxUfM2)} UF/m²</p></div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <div className="border border-[var(--n3-line)] p-4">
          <p className="text-xs uppercase text-[var(--n3-text-muted)]">Precio vs muestra</p>
          <p className="mt-2 text-sm text-[var(--n3-text-light)]">Mediana CBRS/selección: <strong>{uf(decisionMetrics.medianPrice)}</strong></p>
          <p className="mt-1 text-sm text-[var(--n3-text-light)]">Valorización vs mediana: <strong>{pctLabel(decisionMetrics.deltaVsMedianPrice)}</strong></p>
        </div>
        <div className="border border-[var(--n3-line)] p-4">
          <p className="text-xs uppercase text-[var(--n3-text-muted)]">Cobertura de evidencia</p>
          <p className="mt-2 text-sm text-[var(--n3-text-light)]">{decisionMetrics.cbrsCount} ventas CBRS · {decisionMetrics.offerCount} ofertas Portal/TocToc</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{decisionMetrics.offerCount===0?'Sin contraste de oferta activa en la muestra seleccionada.':'Ventas registradas y oferta observada presentes.'}</p>
        </div>
        <div className="border border-[var(--n3-line)] p-4">
          <p className="text-xs uppercase text-[var(--n3-text-muted)]">Distancia típica</p>
          <p className="mt-2 text-sm text-[var(--n3-text-light)]">{decisionMetrics.medianDistance==null?'No disponible':`${nf.format(decisionMetrics.medianDistance)} m mediana`}</p>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Contexto espacial de los comparables aceptados.</p>
        </div>
      </div>
      {decisionMetrics.scenarios.length>0 && <div className="border-t border-[var(--n3-line)] p-4">
        <p className="text-xs uppercase text-[var(--n3-text-muted)]">Escenarios de publicación canónicos</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {decisionMetrics.scenarios.map(s=><div key={s.margin} className="border border-[var(--n3-line)] p-3"><p className="text-xs text-[var(--n3-text-muted)]">{s.margin===5?'+5% · estándar PP':`+${s.margin}%`}</p><p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">{uf(s.price)}</p></div>)}
        </div>
      </div>}
    </section>}

    <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
      <div className="border-b border-[var(--n3-line)] p-4"><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Comparables trazables</h2><p className="text-sm text-[var(--n3-text-muted)]">Portal, CBRS, KML canónico y metodología Property Partners se evalúan por separado. Una contradicción de ROL, geografía o UF/m² bloquea la selección hasta validación.</p></div>
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">UF</th><th className="px-4 py-3">Superficie</th><th className="px-4 py-3">Programa</th><th className="px-4 py-3">Similitud</th><th className="px-4 py-3">Evidencia</th><th className="px-4 py-3">Criterio documentado</th><th className="px-4 py-3">Decisión</th></tr></thead><tbody>
        {data.comparables.map(item=>{
          const contradictions=item.contradictions ?? []
          const blocked=contradictions.length>0
          const accepting=busy===`comparable-${item.id}-select`
          const excluding=busy===`comparable-${item.id}-exclude`
          return <tr key={item.id} className="border-t border-[var(--n3-line)] align-top">
            <td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{item.source_type || 'Fuente no informada'}</p><p className="max-w-48 break-words text-xs text-[var(--n3-text-muted)]">{item.source_reference || 'Referencia no disponible'}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{item.address || 'Dirección no disponible'}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Barrio no disponible'} · {item.property_type || 'Tipo no disponible'}</p></td>
            <td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{uf(item.price_uf)}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2==null?'—':`${n1.format(item.price_uf_m2)} UF/m²`}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">Construidos: {m2(item.built_area_m2 ?? item.useful_area_m2)}</p><p className="text-xs text-[var(--n3-text-muted)]">Terreno: {m2(item.land_area_m2)}{item.property_type==='Casa' && effectiveHouseArea(item.built_area_m2,item.land_area_m2)!=null ? ` · Área comp.: ${m2(effectiveHouseArea(item.built_area_m2,item.land_area_m2))}` : ''}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{item.bedrooms==null?'—':`${item.bedrooms}D`} · {item.bathrooms==null?'—':`${item.bathrooms}B`}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.parking_spaces==null?'Estac. no informado':`${item.parking_spaces} estac.`}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{n1.format(item.similarity_score * 100)}%</p><p className="text-xs text-[var(--n3-text-muted)]">{item.distance_meters==null?'Distancia no disponible':`${nf.format(item.distance_meters)} m`}</p></td>
            <td className="px-4 py-3">{blocked?<div className="max-w-64 space-y-1 text-xs text-amber-300">{contradictions.map((text,index)=><p key={index}>{text}</p>)}</div>:<span className="text-xs text-emerald-300">Sin contradicciones detectadas</span>}</td>
            <td className="px-4 py-3"><input disabled={!permissions.canEditComparables || busy!==null} value={adjustments[item.id] ?? String(item.adjustment_pct || 0)} onChange={e=>setAdjustments(v=>({...v,[item.id]:e.target.value}))} type="number" min={-35} max={35} step="0.5" aria-label="Ajuste documentado sin repricing automático" className="min-h-11 w-24 border border-[var(--n3-line)] bg-black/20 px-2 py-1 text-[var(--n3-text-light)] disabled:opacity-60"/><textarea disabled={!permissions.canEditComparables || busy!==null} value={notes[item.id] ?? item.adjustment_notes ?? item.exclusion_reason ?? ''} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} placeholder="Nota o motivo" className="mt-2 block min-h-20 w-48 border border-[var(--n3-line)] bg-black/20 px-2 py-2 text-xs text-[var(--n3-text-light)] disabled:opacity-60"/></td>
            <td className="px-4 py-3">{permissions.canEditComparables ? <div className="flex flex-col gap-2 sm:flex-row"><button onClick={()=>void comparableAction(item.id,'select')} disabled={busy!==null || blocked || item.similarity_score<=0 || (item.price_uf_m2??0)<=0} className="inline-flex min-h-11 items-center justify-center gap-1 border border-emerald-700 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>{accepting?'Guardando…':'Aceptar'}</button><button onClick={()=>void comparableAction(item.id,'exclude')} disabled={busy!==null} className="inline-flex min-h-11 items-center justify-center gap-1 border border-red-800 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><XCircle className="h-3.5 w-3.5"/>{excluding?'Guardando…':'Excluir'}</button></div> : <span className="text-xs text-[var(--n3-text-muted)]">Solo lectura</span>}<p className="mt-2 text-xs uppercase text-[var(--n3-text-muted)]">{blocked?'Bloqueado':(matchStatusLabels[item.match_status] || item.match_status)}</p></td>
          </tr>
        })}
        {!data.comparables.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-[var(--n3-text-muted)]">No hay candidatos disponibles. El expediente permanece sin comparables hasta contar con evidencia real.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Flujo de aprobación</h2><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Preparar, revisar, aprobar y emitir.</p><textarea disabled={busy!==null} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justificación, observación o motivo de devolución" className="mt-4 min-h-24 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm text-[var(--n3-text-light)] disabled:opacity-60"/><div className="mt-4 flex flex-wrap gap-2" aria-busy={busy!==null}>
        {valuation.status==='draft' && <button onClick={()=>void workflow('review')} disabled={busy!==null || accepted.length<3 || evidenceAlerts.some(item=>item.selected)} className="inline-flex min-h-11 items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm text-white disabled:opacity-50"><Send className="h-4 w-4"/>{busy==='workflow-review'?'Enviando…':'Enviar a revisión'}</button>}
        {valuation.status==='review' && permissions.canApprove && <><button onClick={()=>void workflow('approved')} disabled={busy!==null} className="inline-flex min-h-11 items-center gap-2 bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4"/>{busy==='workflow-approved'?'Aprobando…':'Aprobar'}</button><button onClick={()=>void workflow('draft')} disabled={busy!==null || !reason.trim()} className="inline-flex min-h-11 items-center gap-2 border border-red-800 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><XCircle className="h-4 w-4"/>{busy==='workflow-draft'?'Devolviendo…':'Devolver'}</button></>}
        {valuation.status==='approved' && permissions.canIssue && <button onClick={()=>void workflow('issued')} disabled={busy!==null} title="La emisión congela esta versión y su evidencia." className="inline-flex min-h-11 items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm text-white disabled:opacity-50"><FileCheck2 className="h-4 w-4"/>{busy==='workflow-issued'?'Emitiendo…':'Emitir'}</button>}
        {valuation.status==='review' && !permissions.canApprove && <p className="text-sm text-[var(--n3-text-muted)]">Pendiente de revisión por dirección.</p>}{valuation.status==='approved' && !permissions.canIssue && <p className="text-sm text-[var(--n3-text-muted)]">Aprobada. La emisión corresponde al CEO autorizado.</p>}{valuation.status==='issued' && <p className="text-sm text-[var(--n3-text-muted)]">Emitida. El expediente queda en modo de consulta.</p>}
      </div>{valuation.status==='approved' && permissions.canIssue ? <p className="mt-3 text-xs leading-5 text-amber-200">Emitir congela la versión, el valor y la evidencia del expediente. El sistema pedirá confirmación antes de ejecutar.</p> : null}</div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[var(--n3-teal)]"/><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Historial de decisiones</h2></div><div className="mt-4 max-h-80 space-y-3 overflow-auto">{data.decisions.map(item=><div key={item.id} className="border-l-2 border-[var(--n3-teal)] pl-3"><p className="text-sm font-medium text-[var(--n3-text-light)]">{decisionLabel(item.action)}</p><p className="text-xs text-[var(--n3-text-muted)]">{new Date(item.created_at).toLocaleString('es-CL')}</p>{item.reason&&<p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.reason}</p>}</div>)}{!data.decisions.length&&<p className="text-sm text-[var(--n3-text-muted)]">Sin decisiones registradas.</p>}</div></div>
    </section>
  </div>
}
