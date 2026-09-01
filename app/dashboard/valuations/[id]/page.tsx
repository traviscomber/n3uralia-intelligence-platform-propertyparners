'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileCheck2, History, Send, ShieldCheck, XCircle } from 'lucide-react'

type ValuationCase = {
  id:string; status:string; address:string|null; neighborhood:string|null; property_type:string|null
  estimated_value_uf:number|null; low_value_uf:number|null; high_value_uf:number|null; confidence:string|null
  methodology_version:string; version_number:number; justification:string|null; evidence?:{ warnings?:string[] }|null
}
type Comparable = {
  id:string; rank:number; source_type:string|null; source_reference:string|null; address:string|null; neighborhood:string|null
  property_type:string|null; transaction_date:string|null; source_observed_at:string|null; price_uf:number|null; price_uf_m2:number|null
  similarity_score:number; distance_meters:number|null; selected:boolean; match_status:string; adjustment_pct:number
  adjusted_value_uf:number|null; adjustment_notes:string|null; exclusion_reason:string|null; contradictions?:string[]|null
}
type Decision = { id:string; action:string; reason:string|null; created_at:string }
type Permissions = { canEditComparables:boolean; canApprove:boolean; canIssue:boolean }
type Payload = { valuationCase:ValuationCase; comparables:Comparable[]; decisions:Decision[]; permissions:Permissions; error?:string }

const nf = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:0 })
const n1 = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:1 })
const statusLabels:Record<string,string> = { draft:'Borrador',review:'En revisión',approved:'Aprobada',issued:'Emitida' }
function uf(value:number|null){ return value == null ? '—' : `UF ${nf.format(value)}` }
function resultLabel(status:string){ return status === 'issued' ? 'Valor emitido' : status === 'approved' ? 'Valor aprobado' : 'Estimación preliminar' }

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
      if(!response.ok) throw new Error(json.error || 'No pudimos cambiar el estado')
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
    {isPreliminary && <div className="border border-amber-800/70 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">Resultado preliminar. No es publicable ni entregable hasta aprobación y emisión.</div>}
    {(caseWarnings.length>0 || evidenceAlerts.length>0) && <div className="border border-amber-700/70 bg-amber-950/20 p-4 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4"/>Control de evidencia activo</div>
      <div className="mt-2 space-y-1 text-xs text-amber-200">
        {caseWarnings.map((warning,index)=><p key={`case-${index}`}>{warning}</p>)}
        {evidenceAlerts.length>0 && <p>{evidenceAlerts.length} comparable{evidenceAlerts.length===1?'':'s'} con contradicción o anomalía pendiente. No pueden aceptarse hasta resolver la evidencia.</p>}
      </div>
    </div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[[resultLabel(valuation.status),uf(valuation.estimated_value_uf)],['Referencia persistida',valuation.low_value_uf===valuation.high_value_uf?uf(valuation.estimated_value_uf):`${uf(valuation.low_value_uf)} — ${uf(valuation.high_value_uf)}`],['Confianza',valuation.confidence || '—'],['Comparables aceptados',String(accepted.length)],['Alertas evidencia',String(evidenceAlerts.length)]].map(([label,value])=><div key={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
    </section>

    <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
      <div className="border-b border-[var(--n3-line)] p-4"><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Comparables trazables</h2><p className="text-sm text-[var(--n3-text-muted)]">Portal, CBRS, KML canónico y metodología Property Partners se evalúan por separado. Una contradicción de ROL, geografía o UF/m² bloquea la selección hasta validación.</p></div>
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">UF</th><th className="px-4 py-3">Similitud</th><th className="px-4 py-3">Evidencia</th><th className="px-4 py-3">Criterio documentado</th><th className="px-4 py-3">Decisión</th></tr></thead><tbody>
        {data.comparables.map(item=>{
          const contradictions=item.contradictions ?? []
          const blocked=contradictions.length>0
          const accepting=busy===`comparable-${item.id}-select`
          const excluding=busy===`comparable-${item.id}-exclude`
          return <tr key={item.id} className="border-t border-[var(--n3-line)] align-top">
            <td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{item.source_type || 'Fuente no informada'}</p><p className="max-w-48 break-words text-xs text-[var(--n3-text-muted)]">{item.source_reference || 'Referencia no disponible'}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{item.address || 'Dirección no disponible'}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Barrio no disponible'} · {item.property_type || 'Tipo no disponible'}</p></td>
            <td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{uf(item.price_uf)}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2==null?'—':`${n1.format(item.price_uf_m2)} UF/m²`}</p></td>
            <td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{n1.format(item.similarity_score * 100)}%</p><p className="text-xs text-[var(--n3-text-muted)]">{item.distance_meters==null?'Distancia no disponible':`${nf.format(item.distance_meters)} m`}</p></td>
            <td className="px-4 py-3">{blocked?<div className="max-w-64 space-y-1 text-xs text-amber-300">{contradictions.map((text,index)=><p key={index}>{text}</p>)}</div>:<span className="text-xs text-emerald-300">Sin contradicciones detectadas</span>}</td>
            <td className="px-4 py-3"><input disabled={!permissions.canEditComparables || busy!==null} value={adjustments[item.id] ?? String(item.adjustment_pct || 0)} onChange={e=>setAdjustments(v=>({...v,[item.id]:e.target.value}))} type="number" min={-35} max={35} step="0.5" aria-label="Ajuste documentado sin repricing automático" className="min-h-11 w-24 border border-[var(--n3-line)] bg-black/20 px-2 py-1 text-[var(--n3-text-light)] disabled:opacity-60"/><textarea disabled={!permissions.canEditComparables || busy!==null} value={notes[item.id] ?? item.adjustment_notes ?? item.exclusion_reason ?? ''} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} placeholder="Nota o motivo" className="mt-2 block min-h-20 w-48 border border-[var(--n3-line)] bg-black/20 px-2 py-2 text-xs text-[var(--n3-text-light)] disabled:opacity-60"/></td>
            <td className="px-4 py-3">{permissions.canEditComparables ? <div className="flex flex-col gap-2 sm:flex-row"><button onClick={()=>void comparableAction(item.id,'select')} disabled={busy!==null || blocked || item.similarity_score<=0 || (item.price_uf_m2??0)<=0} className="inline-flex min-h-11 items-center justify-center gap-1 border border-emerald-700 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>{accepting?'Guardando…':'Aceptar'}</button><button onClick={()=>void comparableAction(item.id,'exclude')} disabled={busy!==null} className="inline-flex min-h-11 items-center justify-center gap-1 border border-red-800 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><XCircle className="h-3.5 w-3.5"/>{excluding?'Guardando…':'Excluir'}</button></div> : <span className="text-xs text-[var(--n3-text-muted)]">Solo lectura</span>}<p className="mt-2 text-xs uppercase text-[var(--n3-text-muted)]">{blocked?'bloqueado':item.match_status}</p></td>
          </tr>
        })}
        {!data.comparables.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--n3-text-muted)]">No hay candidatos disponibles. El expediente permanece sin comparables hasta contar con evidencia real.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Flujo de aprobación</h2><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Preparar, revisar, aprobar y emitir.</p><textarea disabled={busy!==null} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justificación, observación o motivo de devolución" className="mt-4 min-h-24 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm text-[var(--n3-text-light)] disabled:opacity-60"/><div className="mt-4 flex flex-wrap gap-2" aria-busy={busy!==null}>
        {valuation.status==='draft' && <button onClick={()=>void workflow('review')} disabled={busy!==null || accepted.length<3 || evidenceAlerts.some(item=>item.selected)} className="inline-flex min-h-11 items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm text-white disabled:opacity-50"><Send className="h-4 w-4"/>{busy==='workflow-review'?'Enviando…':'Enviar a revisión'}</button>}
        {valuation.status==='review' && permissions.canApprove && <><button onClick={()=>void workflow('approved')} disabled={busy!==null} className="inline-flex min-h-11 items-center gap-2 bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4"/>{busy==='workflow-approved'?'Aprobando…':'Aprobar'}</button><button onClick={()=>void workflow('draft')} disabled={busy!==null || !reason.trim()} className="inline-flex min-h-11 items-center gap-2 border border-red-800 px-4 py-2 text-sm text-red-300 disabled:opacity-50"><XCircle className="h-4 w-4"/>{busy==='workflow-draft'?'Devolviendo…':'Devolver'}</button></>}
        {valuation.status==='approved' && permissions.canIssue && <button onClick={()=>void workflow('issued')} disabled={busy!==null} title="La emisión congela esta versión y su evidencia." className="inline-flex min-h-11 items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm text-white disabled:opacity-50"><FileCheck2 className="h-4 w-4"/>{busy==='workflow-issued'?'Emitiendo…':'Emitir'}</button>}
        {valuation.status==='review' && !permissions.canApprove && <p className="text-sm text-[var(--n3-text-muted)]">Pendiente de revisión por dirección.</p>}{valuation.status==='approved' && !permissions.canIssue && <p className="text-sm text-[var(--n3-text-muted)]">Aprobada. La emisión corresponde a dirección.</p>}{valuation.status==='issued' && <p className="text-sm text-[var(--n3-text-muted)]">Emitida. El expediente queda en modo de consulta.</p>}
      </div>{valuation.status==='approved' && permissions.canIssue ? <p className="mt-3 text-xs leading-5 text-amber-200">Emitir congela la versión, el valor y la evidencia del expediente. El sistema pedirá confirmación antes de ejecutar.</p> : null}</div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[var(--n3-teal)]"/><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Historial de decisiones</h2></div><div className="mt-4 max-h-80 space-y-3 overflow-auto">{data.decisions.map(item=><div key={item.id} className="border-l-2 border-[var(--n3-teal)] pl-3"><p className="text-sm font-medium text-[var(--n3-text-light)]">{item.action.replaceAll('_',' ')}</p><p className="text-xs text-[var(--n3-text-muted)]">{new Date(item.created_at).toLocaleString('es-CL')}</p>{item.reason&&<p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.reason}</p>}</div>)}{!data.decisions.length&&<p className="text-sm text-[var(--n3-text-muted)]">Sin decisiones registradas.</p>}</div></div>
    </section>
  </div>
}
