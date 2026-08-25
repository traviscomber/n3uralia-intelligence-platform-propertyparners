'use client'

import { useEffect, useState } from 'react'

type Review = {
  available?: boolean
  officialValueUf?: number | null
  methodologyVersion?: string | null
  caseConfidence?: string | null
  quality?: { grade?: string; status?: string }
  evidence?: {
    selectedComparables?: number
    cbrsComparables?: number
    offerComparables?: number
    averageSimilarity?: number | null
    medianUfM2?: number | null
    averageUfM2?: number | null
    dispersionPct?: number | null
    freshnessDays?: number | null
    contradictions?: number
  }
  loCurroAdvisory?: {
    available?: boolean
    severity?: string
    message?: string
    challengerValueUf?: number | null
    deltaPct?: number | null
    segmentConfidence?: string | null
    segmentEvidenceN?: number | null
    segmentWinRatePct?: number | null
    changesOfficialValue?: boolean
  }
  changesOfficialValue?: boolean
  nonBindingIntelligence?: boolean
  error?: string
}

const int = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const one = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

function uf(value: number | null | undefined) {
  return value == null ? 'N/D' : `UF ${int.format(value)}`
}

function pct(value: number | null | undefined) {
  return value == null ? 'N/D' : `${one.format(value)}%`
}

function confidence(value: string | null | undefined) {
  if (value === 'high') return 'Alta'
  if (value === 'medium') return 'Media'
  if (value === 'low') return 'Baja'
  return 'N/D'
}

export function ValuationReportProfessionalInsight({ valuationId }: { valuationId: string }) {
  const [review, setReview] = useState<Review | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/valuations/${valuationId}/professional-review`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as Review
        if (!response.ok) throw new Error(payload.error || 'review unavailable')
        if (!cancelled) setReview(payload)
      })
      .catch(() => { if (!cancelled) setReview(null) })
    return () => { cancelled = true }
  }, [valuationId])

  if (!review?.available) return null

  const evidence = review.evidence ?? {}
  const advisory = review.loCurroAdvisory
  const hasAdvisory = Boolean(advisory?.available)
  const highAdvisory = advisory?.severity === 'high'
  const grade = review.quality?.grade || 'N/D'
  const status = (review.quality?.status || 'REVISIÓN PROFESIONAL').replaceAll('_', ' ')

  const conclusion = evidence.contradictions
    ? 'La valorización requiere revisar contradicciones de evidencia antes de una decisión final.'
    : evidence.cbrsComparables && evidence.cbrsComparables >= 3
      ? 'La decisión está respaldada por una base suficiente de ventas trazables y revisión profesional.'
      : 'La valorización es utilizable, pero la evidencia transaccional debe interpretarse con cautela.'

  return <section className="mx-auto max-w-6xl bg-white px-4 pt-6 text-neutral-900 sm:px-8 print:max-w-none print:px-0 print:pt-4">
    <div className="break-inside-avoid border border-neutral-300">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-300 p-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">02 · Control profesional</p>
          <h2 className="mt-2 text-2xl font-semibold">Calidad, evidencia y riesgo</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">Lectura ejecutiva del soporte de la valorización. Resume la evidencia persistida y señales no vinculantes sin alterar el valor oficial.</p>
        </div>
        <div className="min-w-32 border border-neutral-900 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Calidad</p>
          <p className="mt-1 text-3xl font-semibold">{grade}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">{status}</p>
        </div>
      </div>

      <dl className="grid gap-px bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Ventas CBRS</dt><dd className="mt-2 text-xl font-semibold">{evidence.cbrsComparables ?? 0}</dd><p className="mt-1 text-xs text-neutral-500">{evidence.offerComparables ?? 0} ofertas seleccionadas</p></div>
        <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Similitud media</dt><dd className="mt-2 text-xl font-semibold">{evidence.averageSimilarity == null ? 'N/D' : pct(evidence.averageSimilarity * 100)}</dd><p className="mt-1 text-xs text-neutral-500">Confianza {confidence(review.caseConfidence)}</p></div>
        <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Dispersión</dt><dd className="mt-2 text-xl font-semibold">{pct(evidence.dispersionPct)}</dd><p className="mt-1 text-xs text-neutral-500">{evidence.contradictions ?? 0} contradicciones</p></div>
        <div className="bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Mediana evidencia</dt><dd className="mt-2 text-xl font-semibold">{evidence.medianUfM2 == null ? 'N/D' : `${one.format(evidence.medianUfM2)} UF/m²`}</dd><p className="mt-1 text-xs text-neutral-500">Promedio {evidence.averageUfM2 == null ? 'N/D' : `${one.format(evidence.averageUfM2)} UF/m²`}</p></div>
      </dl>

      <div className="grid gap-0 border-t border-neutral-300 lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-5 lg:border-r lg:border-neutral-300">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Conclusión de revisión</p>
          <p className="mt-3 text-base font-semibold leading-6">{conclusion}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="border border-neutral-300 p-3"><p className="text-[10px] font-semibold uppercase text-neutral-500">Valor oficial</p><p className="mt-1 text-lg font-semibold">{uf(review.officialValueUf)}</p></div>
            <div className="border border-neutral-300 p-3"><p className="text-[10px] font-semibold uppercase text-neutral-500">Antigüedad evidencia</p><p className="mt-1 text-lg font-semibold">{evidence.freshnessDays == null ? 'N/D' : `${evidence.freshnessDays} días`}</p></div>
          </div>
        </div>

        <div className={hasAdvisory ? `p-5 ${highAdvisory ? 'bg-amber-50' : 'bg-neutral-50'}` : 'p-5 bg-neutral-50'}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Advisory</p>
          {hasAdvisory ? <>
            <p className="mt-3 text-base font-semibold">Revisión adicional recomendada</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{advisory?.message || 'Existe una señal challenger material que debe ser revisada profesionalmente.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="border border-neutral-300 bg-white p-3"><p className="text-[10px] uppercase text-neutral-500">Challenger</p><p className="mt-1 text-lg font-semibold">{uf(advisory?.challengerValueUf)}</p></div>
              <div className="border border-neutral-300 bg-white p-3"><p className="text-[10px] uppercase text-neutral-500">Diferencia</p><p className="mt-1 text-lg font-semibold">{pct(advisory?.deltaPct)}</p></div>
            </div>
            <p className="mt-3 text-xs text-neutral-500">Segmento {advisory?.segmentConfidence || 'N/D'} · N={advisory?.segmentEvidenceN ?? 'N/D'} · win rate {pct(advisory?.segmentWinRatePct)}</p>
          </> : <>
            <p className="mt-3 text-base font-semibold">Sin señal especial</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">El expediente continúa bajo la metodología estándar y la revisión humana habitual.</p>
          </>}
          <p className="mt-4 border-t border-neutral-300 pt-3 text-[10px] leading-4 text-neutral-500">La inteligencia de esta sección es de apoyo profesional y no modifica automáticamente el valor oficial.</p>
        </div>
      </div>
    </div>
  </section>
}
