'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'

type Review = {
  available:boolean
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
  nonBindingIntelligence:boolean
  changesOfficialValue:boolean
  error?:string
}

const nf = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:0 })
const n1 = new Intl.NumberFormat('es-CL',{ maximumFractionDigits:1 })
function pct(v:number|null|undefined){ return v==null?'—':`${n1.format(v)}%` }
function uf(v:number|null|undefined){ return v==null?'—':`UF ${nf.format(v)}` }

const gateLabel:Record<string,string>={
  blocked:'Bloqueado',
  mandatory_professional_review:'Revisión profesional obligatoria',
  reinforced_review:'Revisión reforzada',
  standard_review:'Revisión estándar',
}

export default function ProfessionalReviewPage(){
  const { id } = useParams<{id:string}>()
  const [review,setReview] = useState<Review|null>(null)
  const [error,setError] = useState<string|null>(null)

  useEffect(()=>{
    void fetch(`/api/valuations/${id}/professional-review`,{ cache:'no-store' })
      .then(async response=>{
        const json = await response.json() as Review
        if(!response.ok) throw new Error(json.error || 'No pudimos cargar la revisión profesional')
        setReview(json)
      })
      .catch(err=>setError(err instanceof Error?err.message:'Error de carga'))
  },[id])

  if(error) return <div className="border border-red-900 bg-red-950/30 p-6 text-sm text-red-200">{error}</div>
  if(!review) return <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6 text-sm text-[var(--n3-text-muted)]">Cargando revisión profesional…</div>

  const advisory = review.loCurroAdvisory
  const highRisk = advisory?.available && advisory.severity === 'high'
  const gate = review.reviewGate
  const model = gate?.modelEvidence
  const gateAttention = gate?.mode === 'blocked' || gate?.mode === 'mandatory_professional_review'

  return <div className="space-y-6 pb-10">
    <header className="border-b border-[var(--n3-line)] pb-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--n3-teal)]">Valorización · revisión profesional</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold text-[var(--n3-text-light)]">Control de calidad del expediente</h1><p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Evidencia del caso + desempeño histórico del modelo. El valor oficial no se modifica desde esta vista.</p></div>
        <div className="flex gap-3">
          <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Calidad</p><p className="mt-1 text-2xl font-semibold text-[var(--n3-text-light)]">{review.quality.grade}</p></div>
          {gate?<div className={`border px-4 py-3 text-right ${gateAttention?'border-amber-700/70 bg-amber-950/20':'border-[var(--n3-line)] bg-[var(--n3-deep)]'}`}><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Gate</p><p className="mt-1 text-sm font-semibold text-[var(--n3-text-light)]">{gateLabel[gate.mode] ?? gate.mode}</p></div>:null}
        </div>
      </div>
    </header>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="border border-[#d7332b] bg-[#130d0d] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Valor oficial</p><p className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">{uf(review.officialValueUf)}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{review.methodologyVersion || 'Metodología no disponible'}</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Comparables</p><p className="mt-2 text-2xl font-semibold">{review.evidence.selectedComparables}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{review.evidence.cbrsComparables} ventas CBRS · {review.evidence.offerComparables} ofertas</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Similitud media</p><p className="mt-2 text-2xl font-semibold">{review.evidence.averageSimilarity==null?'—':pct(review.evidence.averageSimilarity*100)}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">Confianza expediente: {review.caseConfidence || '—'}</p></div>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Dispersión</p><p className="mt-2 text-2xl font-semibold">{pct(review.evidence.dispersionPct)}</p><p className="mt-2 text-xs text-[var(--n3-text-muted)]">{review.evidence.contradictions} contradicciones detectadas</p></div>
    </section>

    {gate ? <section className={`border ${gateAttention?'border-amber-700/70 bg-amber-950/10':'border-[var(--n3-line)] bg-[var(--n3-deep)]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--n3-line)] p-5">
        <div><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Gate de revisión</p><h2 className="mt-1 text-xl font-semibold">{gateLabel[gate.mode] ?? gate.mode}</h2><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Define profundidad de revisión; nunca reemplaza el criterio profesional.</p></div>
        {model?<div className="text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Backtest {model.evaluationYear}</p><p className="mt-1 text-sm font-semibold">{model.scope==='barrio'?model.barrio:'Global'} · N={model.sampleCount}</p></div>:null}
      </div>
      <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-[1.1fr_.9fr]">
        <div className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Razones</p>{gate.reasons.length?<ul className="mt-3 space-y-2 text-sm text-[var(--n3-text-light)]">{gate.reasons.map(reason=><li key={reason} className="flex gap-2"><span className="text-[var(--n3-teal)]">—</span><span>{reason}</span></li>)}</ul>:<p className="mt-3 text-sm text-[var(--n3-text-muted)]">Sin señales adicionales que eleven la revisión.</p>}</div>
        <div className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Confiabilidad histórica</p>{model?<div className="mt-3 grid grid-cols-2 gap-4"><div><p className="text-xs text-[var(--n3-text-muted)]">MAPE</p><p className="mt-1 text-xl font-semibold">{pct(model.mapePct)}</p></div><div><p className="text-xs text-[var(--n3-text-muted)]">P80 error</p><p className="mt-1 text-xl font-semibold">{pct(model.p80AbsErrorPct)}</p></div><div><p className="text-xs text-[var(--n3-text-muted)]">Dentro ±15%</p><p className="mt-1 text-xl font-semibold">{pct(model.within15Pct)}</p></div><div><p className="text-xs text-[var(--n3-text-muted)]">Reliability</p><p className="mt-1 text-xl font-semibold capitalize">{model.reliability}</p></div></div>:<p className="mt-3 text-sm text-[var(--n3-text-muted)]">Sin backtest Champion v5 aplicable a este tipo de propiedad. El gate usa sólo evidencia del expediente.</p>}</div>
      </div>
    </section> : null}

    <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] p-5"><h2 className="text-lg font-semibold">Evidencia utilizada</h2><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Lectura compacta del soporte estadístico del caso.</p></div>
        <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
          {[
            ['Mediana seleccionada',review.evidence.medianUfM2==null?'—':`${n1.format(review.evidence.medianUfM2)} UF/m²`],
            ['Promedio seleccionado',review.evidence.averageUfM2==null?'—':`${n1.format(review.evidence.averageUfM2)} UF/m²`],
            ['Antigüedad evidencia',review.evidence.freshnessDays==null?'No disponible':`${review.evidence.freshnessDays} días`],
            ['Rango oficial',`${uf(review.officialRangeUf?.low)} — ${uf(review.officialRangeUf?.high)}`],
          ].map(([label,value])=><div key={label} className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{value}</p></div>)}
        </div>
      </div>

      <div className={`border p-5 ${highRisk?'border-amber-700/70 bg-amber-950/20':'border-[var(--n3-line)] bg-[var(--n3-deep)]'}`}>
        <div className="flex items-start gap-3">{highRisk?<AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300"/>:<ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--n3-teal)]"/>}<div><p className="text-xs uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Advisory no vinculante</p><h2 className="mt-1 text-lg font-semibold">{advisory?.available?'Revisión adicional recomendada':'Sin advisory especial'}</h2></div></div>
        {advisory?.available ? <div className="mt-5 space-y-4"><p className="text-sm leading-6 text-[var(--n3-text-muted)]">{advisory.message}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div className="border border-[var(--n3-line)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Challenger</p><p className="mt-1 text-lg font-semibold">{uf(advisory.challengerValueUf)}</p></div><div className="border border-[var(--n3-line)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Diferencia</p><p className="mt-1 text-lg font-semibold">{pct(advisory.deltaPct)}</p></div><div className="border border-[var(--n3-line)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Confianza segmento</p><p className="mt-1 text-lg font-semibold">{advisory.segmentConfidence || '—'}</p></div><div className="border border-[var(--n3-line)] p-3"><p className="text-[10px] uppercase text-[var(--n3-text-muted)]">Evidencia</p><p className="mt-1 text-lg font-semibold">N={advisory.segmentEvidenceN ?? '—'}</p><p className="text-xs text-[var(--n3-text-muted)]">win {pct(advisory.segmentWinRatePct)}</p></div></div></div> : <p className="mt-5 text-sm leading-6 text-[var(--n3-text-muted)]">El expediente se mantiene en el flujo estándar de revisión profesional.</p>}
      </div>
    </section>

    <div className="flex items-start gap-3 border border-emerald-800/60 bg-emerald-950/20 p-4 text-sm text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/><p>El gate y el backtest son capas de control. <strong>No cambian el valor oficial</strong> ni modifican inteligencia de mercado canónica.</p></div>
  </div>
}
