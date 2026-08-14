'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, RefreshCw, XCircle, Send, ShieldCheck, FileCheck2, History } from 'lucide-react'

type ValuationCase = {
  id:string; status:string; address:string|null; neighborhood:string|null; property_type:string|null;
  estimated_value_uf:number|null; low_value_uf:number|null; high_value_uf:number|null; confidence:string|null;
  methodology_version:string; version_number:number; justification:string|null
}
type Comparable = {
  id:string; rank:number; source_type:string|null; source_reference:string|null; address:string|null; neighborhood:string|null;
  property_type:string|null; transaction_date:string|null; source_observed_at:string|null; price_uf:number|null; price_uf_m2:number|null;
  similarity_score:number; distance_meters:number|null; selected:boolean; match_status:string; adjustment_pct:number;
  adjusted_value_uf:number|null; adjustment_notes:string|null; exclusion_reason:string|null
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

  async function comparableAction(comparableId:string,action:'select'|'exclude'){
    setBusy(comparableId); setError(null)
    try{
      const adjustmentPct = Number(adjustments[comparableId] || 0)
      if(!Number.isFinite(adjustmentPct) || adjustmentPct < -35 || adjustmentPct > 35) throw new Error('El ajuste debe estar entre -35% y 35%.')
      const response = await fetch(`/api/valuations/${id}/comparables`,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({ action, comparableId, adjustmentPct, notes:notes[comparableId] || null, reason:notes[comparableId] || null })
      })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No pudimos actualizar el comparable')
      await load()
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de actualización') }
    finally{ setBusy(null) }
  }

  async function generate(){
    setBusy('generate'); setError(null)
    try{
      const response = await fetch(`/api/valuations/${id}/comparables`,{ method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ action:'generate',limit:30,reason:'Generación desde evidencia trazable del Módulo I' }) })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No pudimos generar candidatos')
      await load()
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de generación') }
    finally{ setBusy(null) }
  }

  async function workflow(status:string){
    setBusy(`workflow-${status}`); setError(null)
    try{
      const response = await fetch(`/api/valuations/${id}/workflow`,{ method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ status, reason:reason.trim() || null }) })
      const json = await response.json()
      if(!response.ok) throw new Error(json.error || 'No pudimos cambiar el estado')
      setReason(''); await load()
    }catch(err){ setError(err instanceof Error ? err.message : 'Error de flujo') }
    finally{ setBusy(null) }
  }

  if(loading) return <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando expediente…</div>
  if(!data?.valuationCase) return <div className="border border-red-900 bg-red-950/30 p-8 text-sm text-red-200">{error || 'Valorización no encontrada o sin acceso.'}</div>
  const valuation = data.valuationCase
  const permissions = data.permissions
  const isPreliminary = valuation.status === 'draft' || valuation.status === 'review'

  return <div className="space-y-6 pb-10">
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

    {error && <div className="border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
    {isPreliminary && <div className="border border-amber-800/70 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">Resultado preliminar. No es publicable ni entregable hasta aprobación y emisión.</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[[resultLabel(valuation.status),uf(valuation.estimated_value_uf)],['Rango',`${uf(valuation.low_value_uf)} — ${uf(valuation.high_value_uf)}`],['Confianza',valuation.confidence || '—'],['Comparables aceptados',String(accepted.length)]].map(([label,value])=><div key={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
    </section>

    <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--n3-line)] p-4"><div><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Comparables trazables</h2><p className="text-sm text-[var(--n3-text-muted)]">Ventas y publicaciones vinculadas al módulo de mercado.</p></div>{permissions.canEditComparables && <button onClick={()=>void generate()} disabled={busy==='generate'} className="inline-flex items-center gap-2 bg-[var(--n3-teal)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy==='generate'?'animate-spin':''}`}/>Generar candidatos</button>}</div>
      <div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-black/20 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]"><tr><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Propiedad</th><th className="px-4 py-3">UF</th><th className="px-4 py-3">Similitud</th><th className="px-4 py-3">Ajuste</th><th className="px-4 py-3">Decisión</th></tr></thead><tbody>
        {data.comparables.map(item=><tr key={item.id} className="border-t border-[var(--n3-line)] align-top"><td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{item.source_type || 'Fuente no informada'}</p><p className="max-w-48 break-words text-xs text-[var(--n3-text-muted)]">{item.source_reference || 'Referencia no disponible'}</p></td><td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{item.address || 'Dirección no disponible'}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.neighborhood || 'Barrio no disponible'} · {item.property_type || 'Tipo no disponible'}</p></td><td className="px-4 py-3"><p className="font-medium text-[var(--n3-text-light)]">{uf(item.price_uf)}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.price_uf_m2==null?'—':`${n1.format(item.price_uf_m2)} UF/m²`}</p></td><td className="px-4 py-3"><p className="text-[var(--n3-text-light)]">{n1.format(item.similarity_score * 100)}%</p><p className="text-xs text-[var(--n3-text-muted)]">{item.distance_meters==null?'Distancia no disponible':`${nf.format(item.distance_meters)} m`}</p></td><td className="px-4 py-3"><input disabled={!permissions.canEditComparables} value={adjustments[item.id] ?? String(item.adjustment_pct || 0)} onChange={e=>setAdjustments(v=>({...v,[item.id]:e.target.value}))} type="number" min={-35} max={35} step="0.5" className="w-24 border border-[var(--n3-line)] bg-black/20 px-2 py-1 text-[var(--n3-text-light)] disabled:opacity-60"/><textarea disabled={!permissions.canEditComparables} value={notes[item.id] ?? item.adjustment_notes ?? item.exclusion_reason ?? ''} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} placeholder="Nota o motivo" className="mt-2 block w-48 border border-[var(--n3-line)] bg-black/20 px-2 py-1 text-xs text-[var(--n3-text-light)] disabled:opacity-60"/></td><td className="px-4 py-3">{permissions.canEditComparables ? <div className="flex gap-2"><button onClick={()=>void comparableAction(item.id,'select')} disabled={busy===item.id || item.similarity_score<=0} className="inline-flex items-center gap-1 border border-emerald-700 px-2 py-1 text-xs text-emerald-300 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5"/>Aceptar</button><button onClick={()=>void comparableAction(item.id,'exclude')} disabled={busy===item.id} className="inline-flex items-center gap-1 border border-red-800 px-2 py-1 text-xs text-red-300 disabled:opacity-50"><XCircle className="h-3.5 w-3.5"/>Excluir</button></div> : <span className="text-xs text-[var(--n3-text-muted)]">Solo lectura</span>}<p className="mt-2 text-xs uppercase text-[var(--n3-text-muted)]">{item.match_status}</p></td></tr>)}
        {!data.comparables.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--n3-text-muted)]">No hay candidatos disponibles. El expediente permanece sin comparables hasta contar con evidencia real.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Flujo de aprobación</h2><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Preparar, revisar, aprobar y emitir.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Justificación, observación o motivo de devolución" className="mt-4 min-h-24 w-full border border-[var(--n3-line)] bg-black/20 p-3 text-sm text-[var(--n3-text-light)]"/><div className="mt-4 flex flex-wrap gap-2">
        {valuation.status==='draft' && <button onClick={()=>void workflow('review')} disabled={busy!==null || accepted.length<3} className="inline-flex items-center gap-2 bg-[var(--n3-teal)] px-3 py-2 text-sm text-white disabled:opacity-50"><Send className="h-4 w-4"/>Enviar a revisión</button>}
        {valuation.status==='review' && permissions.canApprove && <><button onClick={()=>void workflow('approved')} disabled={busy!==null} className="inline-flex items-center gap-2 bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4"/>Aprobar</button><button onClick={()=>void workflow('draft')} disabled={busy!==null || !reason.trim()} className="inline-flex items-center gap-2 border border-red-800 px-3 py-2 text-sm text-red-300 disabled:opacity-50"><XCircle className="h-4 w-4"/>Devolver</button></>}
        {valuation.status==='approved' && permissions.canIssue && <button onClick={()=>void workflow('issued')} disabled={busy!==null} className="inline-flex items-center gap-2 bg-[var(--n3-teal)] px-3 py-2 text-sm text-white disabled:opacity-50"><FileCheck2 className="h-4 w-4"/>Emitir</button>}
        {valuation.status==='review' && !permissions.canApprove && <p className="text-sm text-[var(--n3-text-muted)]">Pendiente de revisión por dirección.</p>}{valuation.status==='approved' && !permissions.canIssue && <p className="text-sm text-[var(--n3-text-muted)]">Aprobada. La emisión corresponde a dirección.</p>}{valuation.status==='issued' && <p className="text-sm text-[var(--n3-text-muted)]">Emitida. El expediente queda en modo de consulta.</p>}
      </div></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[var(--n3-teal)]"/><h2 className="text-lg font-semibold text-[var(--n3-text-light)]">Historial de decisiones</h2></div><div className="mt-4 max-h-80 space-y-3 overflow-auto">{data.decisions.map(item=><div key={item.id} className="border-l-2 border-[var(--n3-teal)] pl-3"><p className="text-sm font-medium text-[var(--n3-text-light)]">{item.action.replaceAll('_',' ')}</p><p className="text-xs text-[var(--n3-text-muted)]">{new Date(item.created_at).toLocaleString('es-CL')}</p>{item.reason&&<p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.reason}</p>}</div>)}{!data.decisions.length&&<p className="text-sm text-[var(--n3-text-muted)]">Sin decisiones registradas.</p>}</div></div>
    </section>
  </div>
}
