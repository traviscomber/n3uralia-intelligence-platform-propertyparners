'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, RotateCcw, Send } from 'lucide-react'

type Review = {
  available:boolean
  caseStatus:'draft'|'review'|'approved'|'issued'|string
  officialValueUf:number|null
  officialRangeUf:{low:number|null;high:number|null}
  methodologyVersion:string|null
  caseConfidence:string|null
  quality:{grade:string;status:string;reasons:Record<string,unknown>}
  evidence:{selectedComparables:number;cbrsComparables:number;offerComparables:number;averageSimilarity:number|null;medianUfM2:number|null;averageUfM2:number|null;dispersionPct:number|null;freshnessDays:number|null;contradictions:number}
  reviewGate?:{
    mode:'blocked'|'mandatory_professional_review'|'reinforced_review'|'standard_review'
    reasons:string[]
    changesOfficialValue:boolean
    modelEvidence:null|{scope:'global'|'barrio';barrio:string;evaluationYear:number;methodologyVersion:string;sampleCount:number;mapePct:number|null;medianAbsErrorPct:number|null;p80AbsErrorPct:number|null;p90AbsErrorPct:number|null;within10Pct:number|null;within15Pct:number|null;within20Pct:number|null;reliability:string;reviewMode:string}
  }
  loCurroAdvisory?:{available?:boolean;severity?:string;message?:string;challengerValueUf?:number;deltaPct?:number;segmentConfidence?:string;segmentEvidenceN?:number;segmentWinRatePct?:number;changesOfficialValue?:boolean}
  permissions?:{ownsCase:boolean;canReview:boolean;canApprove:boolean}
  nonBindingIntelligence:boolean
  changesOfficialValue:boolean
  error?:string
}

const nf = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:0 })
const n1 = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:1 })
function pct(v:number|null|undefined){ return v==null?'—':`${n1.format(v)}%` }
function uf(v:number|null|undefined){ return v==null?'—':`UF ${nf.format(v)}` }

const statusLabel:Record<string,string>={ draft:'Borrador', review:'En revisión', approved:'Aprobada', issued:'Emitida' }
const confidenceLabel:Record<string,string>={ low:'Baja', medium:'Media', high:'Alta', strong:'Alta', moderate:'Media', weak:'Baja' }
export default function ProfessionalReviewPage(){
  const { id } = useParams<{id:string}>()
  const [review,setReview] = useState<Review|null>(null)
  const [error,setError] = useState<string|null>(null)
  const [reason,setReason] = useState('')
  const [working,setWorking] = useState(false)
  const [message,setMessage] = useState<string|null>(null)

  async function load(){
    setError(null)
    const response = await fetch(`/api/valuations/${id}/professional-review`,{ cache:'no-store' })
    const json = await response.json() as Review
    if(!response.ok) throw new Error(json.error || 'No pudimos cargar la revisión profesional')
    setReview(json)
  }

  useEffect(()=>{
    void load().catch(err=>setError(err instanceof Error?err.message:'Error de carga'))
  },[id])

  async function transition(status:'draft'|'review'){
    if(status==='draft' && !reason.trim()){
      setMessage('Indica qué debe corregirse antes de devolver el expediente.')
      return
    }
    setWorking(true)
    setMessage(null)
    try{
      const response = await fetch(`/api/valuations/${id}/workflow`,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({status,reason:reason.trim() || undefined}),
      })
      const json = await response.json() as {error?:string;status?:string}
      if(!response.ok) throw new Error(json.error || 'No pudimos actualizar el expediente')
      setReason('')
      setMessage(status==='draft'?'Expediente devuelto para corrección. Se creó la tarea correspondiente.':'Expediente enviado a revisión.')
      await load()
    }catch(err){
      setMessage(err instanceof Error?err.message:'No pudimos actualizar el expediente')
    }finally{
      setWorking(false)
    }
  }

  if(error) return <div className="border border-red-900 bg-red-950/30 p-6 text-sm text-red-200">{error}</div>
  if(!review) return <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6 text-sm text-[var(--n3-text-muted)]">Cargando revisión profesional…</div>

  const advisory = review.loCurroAdvisory
  const highRisk = advisory?.available && advisory.severity === 'high'
  const gate = review.reviewGate
  const model = gate?.modelEvidence
  const gateAttention = gate?.mode === 'blocked' || gate?.mode === 'mandatory_professional_review'
  const permissions = review.permissions ?? { ownsCase:false, canReview:false, canApprove:false }
  const isDirector = permissions.canReview && !permissions.canApprove
  const isPartner = permissions.ownsCase && !permissions.canReview && !permissions.canApprove
  const canReturn = review.caseStatus === 'review' && (permissions.canReview || permissions.canApprove)
  const canSubmit = review.caseStatus === 'draft' && gate?.mode !== 'blocked' && (permissions.ownsCase || permissions.canReview || permissions.canApprove)
  const attentionLabel = permissions.canApprove ? 'Qué debe mirar Pedro Pablo' : isDirector ? 'Qué debe validar dirección' : 'Qué debes revisar antes de enviar'

  return <div className="space-y-5 pb-10">
    <div className="flex items-center justify-between gap-3">
      <Link href={`/dashboard/valuations/${id}`} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-3 text-xs text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]"><ArrowLeft size={14}/>Volver al expediente</Link>
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Estado: {statusLabel[review.caseStatus] ?? review.caseStatus}</span>
    </div>

    <header className="border-b border-[var(--n3-line)] pb-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--n3-teal)]">Valorización · revisión profesional</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">¿Está respaldado este valor?</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Vista de decisión para revisar valor, evidencia y alertas antes de aprobar o devolver.</p>
    </header>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="border border-[#d7332b] bg-[#130d0d] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Valor propuesto</p>
        <p className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">{uf(review.officialValueUf)}</p>
      </div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Ventas seleccionadas</p>
        <p className="mt-2 text-3xl font-semibold">{review.evidence.cbrsComparables}</p>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{review.evidence.offerComparables ? `+${review.evidence.offerComparables} ofertas de referencia` : 'Ventas CBRS trazables'}</p>
      </div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Confianza</p>
        <p className="mt-2 text-3xl font-semibold">{review.caseConfidence ? (confidenceLabel[review.caseConfidence] || review.caseConfidence) : '—'}</p>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">{review.evidence.contradictions === 0 ? 'Sin contradicciones detectadas' : `${review.evidence.contradictions} contradicciones por revisar`}</p>
      </div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Referencia de mercado</p>
        <p className="mt-2 text-3xl font-semibold">{review.evidence.medianUfM2 == null ? '—' : `${n1.format(review.evidence.medianUfM2)} UF/m²`}</p>
        <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Mediana de comparables seleccionados</p>
      </div>
    </section>

    <section className={`border p-5 ${gateAttention || highRisk ? 'border-amber-700/70 bg-amber-950/10' : 'border-emerald-800/60 bg-emerald-950/10'}`}>
      <div className="flex items-start gap-3">
        {gateAttention || highRisk ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"/> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"/>}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{attentionLabel}</p>
          <h2 className="mt-1 text-lg font-semibold">{gateAttention || highRisk ? 'Requiere revisión antes de decidir' : 'Evidencia suficiente para revisión'}</h2>
          <div className="mt-3 space-y-2 text-sm text-[var(--n3-text-light)]">
            {gate?.reasons?.length ? gate.reasons.slice(0, 2).map((item)=><p key={item}>• {item.replace('Challenger material requiere contraste profesional','Existe una referencia alternativa material que conviene contrastar')}</p>) : null}
            {advisory?.available ? <p>• Valor alternativo de control: <strong>{uf(advisory.challengerValueUf)}</strong> ({pct(advisory.deltaPct)} vs valor propuesto). No modifica automáticamente la valorización.</p> : null}
            {!gate?.reasons?.length && !advisory?.available ? <p>No hay señales adicionales que impidan la revisión profesional.</p> : null}
          </div>
        </div>
      </div>
    </section>

    {(canReturn || canSubmit) ? <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Acción</p>
      {canReturn ? <>
        <h2 className="mt-1 text-lg font-semibold">¿Necesita corrección?</h2>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{permissions.canApprove ? 'Escribe una instrucción concreta y devuelve el expediente para ajuste.' : 'Escribe una instrucción concreta y devuelve el expediente al partner.'}</p>
        <textarea value={reason} onChange={event=>setReason(event.target.value)} rows={3} placeholder="Ej.: revisar el comparable 2 y justificar la diferencia antes de volver a enviar." className="mt-4 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3 text-sm text-[var(--n3-text-light)] outline-none focus:border-[var(--n3-teal-soft)]" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/dashboard/valuations/${id}`} className="inline-flex min-h-10 items-center gap-2 border border-[var(--n3-line)] px-4 text-xs font-semibold">Volver para decidir</Link>
          <button type="button" disabled={working} onClick={()=>void transition('draft')} className="inline-flex min-h-10 items-center gap-2 bg-[var(--primary)] px-4 text-xs font-semibold text-white disabled:opacity-40"><RotateCcw size={14}/>Devolver para ajustar</button>
        </div>
      </> : null}
      {canSubmit ? <>
        <h2 className="mt-1 text-lg font-semibold">{isPartner ? 'Valorización lista' : 'Expediente corregido'}</h2>
        <p className="mt-2 text-sm text-[var(--n3-text-muted)]">{isPartner ? 'Cuando los comparables y la evidencia estén correctos, envía tu valorización a dirección.' : 'Cuando las correcciones estén completas, vuelve a enviarlo a revisión.'}</p>
        <div className="mt-4"><button type="button" disabled={working} onClick={()=>void transition('review')} className="inline-flex min-h-10 items-center gap-2 bg-[var(--primary)] px-4 text-xs font-semibold text-white disabled:opacity-40"><Send size={14}/>Enviar a revisión</button></div>
      </> : null}
      {message ? <p role="status" className="mt-3 text-sm text-[var(--n3-text-muted)]">{message}</p> : null}
    </section> : null}

    <details className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-[var(--n3-text-muted)]">Ver detalle técnico y trazabilidad</summary>
      <div className="grid gap-px border-t border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Coincidencia media</p><p className="mt-1 text-lg font-semibold">{review.evidence.averageSimilarity==null?'—':pct(review.evidence.averageSimilarity*100)}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Dispersión</p><p className="mt-1 text-lg font-semibold">{pct(review.evidence.dispersionPct)}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Promedio muestra</p><p className="mt-1 text-lg font-semibold">{review.evidence.averageUfM2==null?'—':`${n1.format(review.evidence.averageUfM2)} UF/m²`}</p></div>
        <div className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Calidad interna</p><p className="mt-1 text-lg font-semibold">{review.quality.grade}</p></div>
      </div>
      <div className="space-y-3 border-t border-[var(--n3-line)] p-5 text-sm text-[var(--n3-text-muted)]">
        <p>Metodología: Property Partners vigente.</p>
        {model ? <p>Validación histórica {model.evaluationYear}: error medio {pct(model.mapePct)} · dentro ±15% {pct(model.within15Pct)} · confiabilidad {confidenceLabel[model.reliability] || model.reliability}.</p> : <p>Sin validación histórica adicional aplicable a este caso.</p>}
        <p>Estas capas son de control y no cambian automáticamente el valor oficial.</p>
      </div>
    </details>
  </div>
}
